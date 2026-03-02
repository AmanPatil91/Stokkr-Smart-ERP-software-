import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
    try {
        const { filePath, type } = await request.json();

        if (!filePath) {
            return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
        }

        // Security check: Ensure the path is within our tmp directory
        // This prevents directory traversal attacks reading arbitrary server files
        const uploadDir = join(process.cwd(), '.tmp_uploads');
        if (!filePath.startsWith(uploadDir)) {
            return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
        }

        // 1. Read the physical file
        const fileBuffer = await readFile(filePath);

        // 2. Parse with XLSX
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

        // Assume primary data is in the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Extract raw rows
        const rawData = xlsx.utils.sheet_to_json(sheet, { defval: null });

        if (!rawData || rawData.length === 0) {
            return NextResponse.json({ error: 'File is empty or could not be parsed' }, { status: 400 });
        }

        // 3. Smart Column Mapping & Data Normalization
        const processedData = rawData.map((row: any) => {
            const normalizedRow: any = {
                importType: type, // 'sales' or 'purchase'
                originalRaw: JSON.stringify(row) // Keep verbatim copy for debugging if needed
            };

            // Get all keys lowered to smartly match variations
            const rowKeys = Object.keys(row);
            const rowKeysLower = rowKeys.map(k => k.toLowerCase());

            const getVal = (possibleNames: string[]) => {
                for (const name of possibleNames) {
                    const idx = rowKeysLower.findIndex(k => k.includes(name));
                    if (idx !== -1) {
                        const val = row[rowKeys[idx]];
                        // Trim strings dynamically
                        return typeof val === 'string' ? val.trim() : val;
                    }
                }
                return null;
            };

            // --- Item Name ---
            normalizedRow.itemName = getVal(['item', 'product', 'desc']);

            // --- Company / Brand ---
            let rawCompany = getVal(['company', 'brand', 'mfg', 'manufacturer']);
            if (!rawCompany) {
                // Attempt to auto-infer from Item Name (Fallback)
                if (normalizedRow.itemName?.toUpperCase().includes('PARLE')) rawCompany = 'PARLE';
                if (normalizedRow.itemName?.toUpperCase().includes('ITC') || normalizedRow.itemName?.toUpperCase().includes('SUNFEAST')) rawCompany = 'ITC';
            }

            // Standardize Brand purely for visual preview (Actual logic goes in Dataset Util setup later)
            if (typeof rawCompany === 'string') {
                const upCompany = rawCompany.toUpperCase();
                if (upCompany.includes('PARLE')) normalizedRow.brand = 'Parle Products';
                else if (upCompany.includes('ITC') || upCompany.includes('SUNFEAST')) normalizedRow.brand = 'Sunfeast / ITC FMCG';
                else normalizedRow.brand = rawCompany;
            }

            // --- GST % ---
            const rawGst = getVal(['gst', 'tax']);
            normalizedRow.gstPercent = 0;
            if (rawGst !== null && rawGst !== undefined) {
                // Could be "18%", "18.0", or 18
                const mtch = String(rawGst).match(/(\d+(\.\d+)?)/);
                if (mtch) normalizedRow.gstPercent = parseFloat(mtch[0]);
            }

            // --- MRP ---
            const rawMrp = getVal(['mrp', 'price', 'rate']);
            normalizedRow.mrp = rawMrp ? parseFloat(rawMrp) || 0 : 0;

            // --- Quantity & Amount (Optional parsing for preview) ---
            const rawQty = getVal(['qty', 'quantity']);
            normalizedRow.quantity = rawQty ? parseFloat(rawQty) || 0 : 0;

            const rawAmt = getVal(['amount', 'total', 'value']);
            normalizedRow.amount = rawAmt ? parseFloat(rawAmt) || 0 : 0;

            return normalizedRow;
        });

        // 4. Filter empty/invalid rows (where item name couldn't be derived at all)
        const validData = processedData.filter(row => !!row.itemName);

        // Return the total count and a 50 row preview
        return NextResponse.json({
            success: true,
            totalRowsDetected: rawData.length,
            validRowsParsed: validData.length,
            previewData: validData.slice(0, 50)
        });

    } catch (error: any) {
        console.error('Data Processing Error:', error);
        return NextResponse.json({ error: 'Failed to process dataset file. It may be corrupted or highly irregular.' }, { status: 500 });
    }
}
