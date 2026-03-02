import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/prisma';

// ── Busy/Tally Header Detection ──────────────────────────────────────
// Busy/Tally reports have metadata rows before the real headers.
// We scan the first 20 rows for a row containing key markers.
const HEADER_MARKERS = ['party name', 'item name', 'date'];
const HEADER_MARKERS_ALT = ['party name', 'particulars', 'date'];

function detectHeaderRow(sheet: xlsx.WorkSheet): number {
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1');
    const maxScan = Math.min(range.e.r, 20); // scan first 20 rows

    for (let r = range.s.r; r <= maxScan; r++) {
        const cellValues: string[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = xlsx.utils.encode_cell({ r, c });
            const cell = sheet[addr];
            if (cell && cell.v !== undefined && cell.v !== null) {
                cellValues.push(String(cell.v).toLowerCase().trim());
            }
        }
        const joined = cellValues.join(' | ');
        const matchesMain = HEADER_MARKERS.every(m => cellValues.some(v => v.includes(m)));
        const matchesAlt = HEADER_MARKERS_ALT.every(m => cellValues.some(v => v.includes(m)));
        if (matchesMain || matchesAlt) {
            return r;
        }
    }
    return 0; // fallback: first row is header
}

// ── Busy/Tally Column Map ────────────────────────────────────────────
// Explicit mapping from Busy/Tally column headers to our internal keys.
const TALLY_COL_MAP: Record<string, string> = {
    'party name': 'partyName',
    'bill no#': 'invoiceNumber',
    'bill no': 'invoiceNumber',
    'date': 'date',
    'item name': 'productName',
    'particulars': 'productName',
    'batch': 'batch',
    'amount': 'amount',
    'gst %': 'gstRate',
    'gst%': 'gstRate',
    'tax amount': 'taxAmount',
    'mrp': 'mrp',
    'mrp amt': 'mrpAmount',
    'mrp amount': 'mrpAmount',
    'company name': 'brand',
    'company': 'brand',
    'area name': 'area',
    'area': 'area',
    'route name': 'route',
    'route': 'route',
    'sale type': 'saleType',
    'type': 'saleType',
    'gst no.': 'gstNumber',
    'gst no': 'gstNumber',
    'gstin': 'gstNumber',
    'quantity': 'quantity',
    'qty': 'quantity',
    'rate': 'rate',
    'price': 'rate',
    'hsn': 'hsnCode',
    'hsn code': 'hsnCode',
};

// Columns to explicitly ignore
const IGNORE_COLS = new Set(['pan', 'bank', 'ledger code', 'ledger', 'a/c', 'account']);

// ── Date Parser for Tally formats ────────────────────────────────────
// Supports: 26/Oct/2025, 05/Apr/2025, 2025-04-05, 05/04/2025, etc.
const MONTH_MAP: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function parseTallyDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

    const s = String(val).trim();

    // Match: 26/Oct/2025 or 05/Apr/2025
    const tallyMatch = s.match(/^(\d{1,2})\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(\d{4})$/i);
    if (tallyMatch) {
        const day = parseInt(tallyMatch[1]);
        const month = MONTH_MAP[tallyMatch[2].toLowerCase()];
        const year = parseInt(tallyMatch[3]);
        if (month !== undefined) return new Date(year, month, day);
    }

    // Match: DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]) - 1;
        const year = parseInt(dmyMatch[3]);
        return new Date(year, month, day);
    }

    // Fallback: native Date parse
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

// ── Numeric cleaner ──────────────────────────────────────────────────
function safeNum(val: any): number {
    if (val === null || val === undefined || val === '') return 0;
    const cleaned = String(val).replace(/[₹,\s]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

function safeGst(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    const match = String(val).match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : null;
}

// ── Summary row detection ────────────────────────────────────────────
function isSummaryRow(mapped: Record<string, any>): boolean {
    const name = String(mapped.productName || mapped.partyName || '').toLowerCase();
    return ['total', 'grand total', 'sub total', 'subtotal', 'net total'].some(t => name.includes(t));
}

// ══════════════════════════════════════════════════════════════════════
export async function POST(request: Request) {
    try {
        const { filePath, type } = await request.json();

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        const uploadDir = join(process.cwd(), '.tmp_uploads');
        if (!filePath.startsWith(uploadDir)) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
        }

        if (!['sales', 'purchase'].includes(type)) {
            return NextResponse.json({ error: 'Type must be "sales" or "purchase"' }, { status: 400 });
        }

        // 1. Read and parse file
        const fileBuffer = await readFile(filePath);
        const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });

        let allMappedRows: Record<string, any>[] = [];
        let detectedHeaderIndex = -1;
        let columnMapping: Record<string, string> = {};

        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet['!ref']) continue;

            // 2. Detect the real header row
            const headerRowIdx = detectHeaderRow(sheet);
            if (detectedHeaderIndex === -1) detectedHeaderIndex = headerRowIdx;

            // 3. Read with the detected header
            const rawData: any[] = xlsx.utils.sheet_to_json(sheet, {
                defval: null,
                range: headerRowIdx, // start from the detected header row
            });

            if (!rawData || rawData.length === 0) continue;

            // 4. Build column map from actual headers
            const sampleKeys = Object.keys(rawData[0]);
            const colMap: Record<string, string> = {};
            for (const key of sampleKeys) {
                const lower = key.toLowerCase().trim();
                if (IGNORE_COLS.has(lower)) continue;
                if (TALLY_COL_MAP[lower]) {
                    colMap[key] = TALLY_COL_MAP[lower];
                } else {
                    // Fuzzy match: check if any TALLY_COL_MAP key is a substring
                    for (const [tallyKey, internalKey] of Object.entries(TALLY_COL_MAP)) {
                        if (lower.includes(tallyKey) || tallyKey.includes(lower)) {
                            colMap[key] = internalKey;
                            break;
                        }
                    }
                }
            }
            if (Object.keys(columnMapping).length === 0) columnMapping = colMap;

            // 5. Map each row using the column map
            for (const row of rawData) {
                const mapped: Record<string, any> = {};
                for (const [originalCol, internalKey] of Object.entries(colMap)) {
                    mapped[internalKey] = row[originalCol];
                }

                // Minimum valid row: must have partyName + productName + amount
                const hasParty = mapped.partyName && String(mapped.partyName).trim();
                const hasProduct = mapped.productName && String(mapped.productName).trim();
                const hasAmount = mapped.amount !== null && mapped.amount !== undefined && safeNum(mapped.amount) !== 0;

                if (!hasProduct) continue; // skip rows without item name
                if (!hasParty && !hasAmount) continue; // need at least party or amount

                // Skip summary/total rows
                if (isSummaryRow(mapped)) continue;

                // Clean and normalize
                const cleaned = {
                    date: parseTallyDate(mapped.date),
                    partyName: String(mapped.partyName || 'Unknown').trim(),
                    productName: String(mapped.productName).trim(),
                    brand: mapped.brand ? String(mapped.brand).trim() : null,
                    invoiceNumber: mapped.invoiceNumber ? String(mapped.invoiceNumber).trim() : null,
                    quantity: safeNum(mapped.quantity),
                    rate: safeNum(mapped.rate || mapped.batch), // Batch field sometimes holds rate in Tally
                    amount: safeNum(mapped.amount),
                    gstRate: safeGst(mapped.gstRate),
                    taxAmount: safeNum(mapped.taxAmount) || null,
                    mrp: safeNum(mapped.mrp) || null,
                    mrpAmount: safeNum(mapped.mrpAmount) || null,
                    hsnCode: mapped.hsnCode ? String(mapped.hsnCode).trim() : null,
                    route: mapped.route ? String(mapped.route).trim() : null,
                    area: mapped.area ? String(mapped.area).trim() : null,
                    saleType: mapped.saleType ? String(mapped.saleType).trim() : null,
                    gstNumber: mapped.gstNumber ? String(mapped.gstNumber).trim() : null,
                };

                allMappedRows.push(cleaned);
            }
        }

        if (allMappedRows.length === 0) {
            return NextResponse.json({
                error: 'No valid data rows found after parsing. Ensure file contains columns: Party Name, Item Name, Amount.',
                detectedHeaderRow: detectedHeaderIndex,
                columnMapping,
            }, { status: 400 });
        }

        // 6. Build preview (first 10 rows)
        const preview = allMappedRows.slice(0, 10);

        // 7. Batch insert with duplicate skipping
        let inserted = 0;
        let skipped = 0;
        let errors = 0;
        const BATCH_SIZE = 100;

        if (type === 'sales') {
            for (let i = 0; i < allMappedRows.length; i += BATCH_SIZE) {
                const batch = allMappedRows.slice(i, i + BATCH_SIZE).map(r => ({
                    date: r.date,
                    partyName: r.partyName,
                    productName: r.productName,
                    brand: r.brand,
                    invoiceNumber: r.invoiceNumber,
                    quantity: r.quantity,
                    rate: r.rate,
                    amount: r.amount,
                    gstRate: r.gstRate,
                    taxAmount: r.taxAmount,
                    mrp: r.mrp,
                    mrpAmount: r.mrpAmount,
                    hsnCode: r.hsnCode,
                    route: r.route,
                    area: r.area,
                    saleType: r.saleType,
                    gstNumber: r.gstNumber,
                }));

                try {
                    const result = await prisma.salesTransaction.createMany({
                        data: batch,
                        skipDuplicates: true,
                    });
                    inserted += result.count;
                    skipped += batch.length - result.count;
                } catch (err) {
                    console.error('Sales batch insert error:', err);
                    errors += batch.length;
                }
            }
        } else {
            for (let i = 0; i < allMappedRows.length; i += BATCH_SIZE) {
                const batch = allMappedRows.slice(i, i + BATCH_SIZE).map(r => ({
                    date: r.date,
                    supplierName: r.partyName,
                    productName: r.productName,
                    brand: r.brand,
                    invoiceNumber: r.invoiceNumber,
                    quantity: r.quantity,
                    rate: r.rate,
                    amount: r.amount,
                    gstRate: r.gstRate,
                    taxAmount: r.taxAmount,
                    mrp: r.mrp,
                    mrpAmount: r.mrpAmount,
                    hsnCode: r.hsnCode,
                    route: r.route,
                    area: r.area,
                    gstNumber: r.gstNumber,
                }));

                try {
                    const result = await prisma.purchaseTransaction.createMany({
                        data: batch,
                        skipDuplicates: true,
                    });
                    inserted += result.count;
                    skipped += batch.length - result.count;
                } catch (err) {
                    console.error('Purchase batch insert error:', err);
                    errors += batch.length;
                }
            }
        }

        return NextResponse.json({
            success: true,
            detectedHeaderRow: detectedHeaderIndex,
            columnMapping,
            preview,
            summary: {
                totalParsed: allMappedRows.length,
                validRows: allMappedRows.length,
                inserted,
                skipped,
                errors,
                type,
            }
        });

    } catch (error: any) {
        console.error('Supabase Sync Error:', error);
        return NextResponse.json(
            { error: 'Failed to sync data to database. ' + (error.message || '') },
            { status: 500 }
        );
    }
}
