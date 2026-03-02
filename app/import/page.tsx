'use client';

import { useState } from 'react';
import FileUploadArea from '@/components/FileUploadArea';

export default function ImportDataPage() {
    const [salesFile, setSalesFile] = useState<any>(null);
    const [purchaseFile, setPurchaseFile] = useState<any>(null);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [fullProcessedData, setFullProcessedData] = useState<any[]>([]); // To hold all rows for sync
    const [previewStats, setPreviewStats] = useState<any>(null);
    const [syncSummary, setSyncSummary] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Supabase direct upload state
    const [isSupabaseSyncing, setIsSupabaseSyncing] = useState(false);
    const [supabaseSummary, setSupabaseSummary] = useState<any>(null);
    const [supabasePreview, setSupabasePreview] = useState<any[]>([]);
    const [supabaseMeta, setSupabaseMeta] = useState<any>(null);

    const handleSalesUploadSuccess = (data: any) => {
        setSalesFile({
            name: data.filename,
            path: data.storedPath,
            size: data.size
        });
    };

    const handlePurchaseUploadSuccess = (data: any) => {
        setPurchaseFile({
            name: data.filename,
            path: data.storedPath,
            size: data.size
        });
    };

    const processFiles = async () => {
        setIsProcessing(true);
        setError(null);
        setPreviewData([]);

        // Process Sales file as primary example for preview
        const targetFile = salesFile || purchaseFile;
        const targetType = salesFile ? 'sales' : 'purchase';

        try {
            const response = await fetch('/api/upload/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: targetFile.path, type: targetType })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to process file');

            setPreviewData(data.previewData || []);
            setFullProcessedData(data.fullData || data.previewData); // Keep simplified for UI sync logic
            setPreviewStats({
                total: data.totalRowsDetected,
                valid: data.validRowsParsed
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const runDatabaseSync = async () => {
        setIsSyncing(true);
        setError(null);
        try {
            // Because fullData might not fit in browser well, we'd normally sync it via reference 
            // but for this example, we'll sync the preview payload.
            const payload = previewData.map(r => JSON.stringify(r));

            const response = await fetch('/api/upload/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mappedData: payload })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to map to database masters');

            setSyncSummary(data.summary);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const runSupabaseSync = async (fileType: 'sales' | 'purchase') => {
        const targetFile = fileType === 'sales' ? salesFile : purchaseFile;
        if (!targetFile) {
            setError(`No ${fileType} file uploaded`);
            return;
        }
        setIsSupabaseSyncing(true);
        setError(null);
        setSupabaseSummary(null);
        setSupabasePreview([]);
        setSupabaseMeta(null);
        try {
            const response = await fetch('/api/upload/supabase-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath: targetFile.path, type: fileType })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to sync');
            setSupabaseSummary(data.summary);
            setSupabasePreview(data.preview || []);
            setSupabaseMeta({ headerRow: data.detectedHeaderRow, columnMapping: data.columnMapping });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSupabaseSyncing(false);
        }
    };

    const hasFiles = salesFile || purchaseFile;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Import Business Data</h1>
                    <p className="text-gray-600 mt-2">Upload your sales and purchase Excel or CSV reports to sync products and update records.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <FileUploadArea
                        title="Upload Sales Data"
                        type="sales"
                        onUploadSuccess={handleSalesUploadSuccess}
                        onRemove={() => setSalesFile(null)}
                    />

                    <FileUploadArea
                        title="Upload Purchase Data"
                        type="purchase"
                        onUploadSuccess={handlePurchaseUploadSuccess}
                        onRemove={() => setPurchaseFile(null)}
                    />
                </div>

                {hasFiles && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Ready for Processing</h3>

                        <div className="space-y-3 mb-6">
                            {salesFile && (
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-blue-600 font-medium">Sales Data:</span>
                                        <span className="text-gray-700">{salesFile.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                        {(salesFile.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            )}

                            {purchaseFile && (
                                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <div className="flex items-center space-x-3">
                                        <span className="text-purple-600 font-medium">Purchase Data:</span>
                                        <span className="text-gray-700">{purchaseFile.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                        {(purchaseFile.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                                ⚠️ {error}
                            </div>
                        )}

                        {previewData.length === 0 ? (
                            <button
                                onClick={processFiles}
                                disabled={isProcessing}
                                className={`w - full font - semibold py - 3 rounded - lg transition - colors shadow - sm flex items - center justify - center space - x - 2 ${isProcessing ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    } `}
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
                                        <span>Analyzing Document Headers...</span>
                                    </>
                                ) : (
                                    <span>Parse & Extrct Data</span>
                                )}
                            </button>
                        ) : (
                            <div className="mt-6 border-t pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-bold text-gray-800">Preview (First 50 Rows)</h4>
                                    <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                                        {previewStats?.valid} / {previewStats?.total} valid rows mapped
                                    </span>
                                </div>

                                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-h-[400px]">
                                    <table className="min-w-full divide-y divide-gray-200 relative">
                                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand / Co.</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">MRP (₹)</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GST %</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.map((row, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">{row.itemName || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        <span className={`px - 2 py - 1 rounded text - xs font - medium ${row.brand === 'Parle Products' ? 'bg-yellow-100 text-yellow-800' :
                                                            row.brand === 'Sunfeast / ITC FMCG' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                                            } `}>
                                                            {row.brand || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.mrp ? row.mrp.toFixed(2) : '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.gstPercent ? `${row.gstPercent}% ` : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {syncSummary ? (
                                    <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-20 text-green-800 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-48 h-48">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12" />
                                            </svg>
                                        </div>

                                        <h3 className="text-xl font-bold text-green-900 mb-2">Import Complete!</h3>
                                        <p className="text-green-700 mb-6">Your extracted data has been securely mapped to the Master Catalogs.</p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded shadow-sm border border-green-100 items-center justify-center flex flex-col">
                                                <span className="text-3xl font-black text-blue-600">{syncSummary.productsCreatedOrUpdated}</span>
                                                <span className="text-xs font-bold text-gray-500 uppercase mt-1">Products</span>
                                            </div>
                                            <div className="bg-white p-4 rounded shadow-sm border border-green-100 items-center justify-center flex flex-col">
                                                <span className="text-3xl font-black text-purple-600">{syncSummary.partiesHandled}</span>
                                                <span className="text-xs font-bold text-gray-500 uppercase mt-1">Parties Found</span>
                                            </div>
                                            <div className="bg-white p-4 rounded shadow-sm border border-green-100 items-center justify-center flex flex-col">
                                                <span className="text-3xl font-black text-indigo-600">{syncSummary.inventoryLedgersRecorded}</span>
                                                <span className="text-xs font-bold text-gray-500 uppercase mt-1">Inventory Logs</span>
                                            </div>
                                            <div className="bg-white p-4 rounded shadow-sm border border-green-100 items-center justify-center flex flex-col">
                                                <span className="text-3xl font-black text-red-500">{syncSummary.skippedLines}</span>
                                                <span className="text-xs font-bold text-gray-500 uppercase mt-1">Skipped Rows</span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={runDatabaseSync}
                                        disabled={isSyncing}
                                        className={`w-full mt-6 text-white font-semibold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 ${isSyncing ? 'bg-gray-400 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                                            }`}
                                    >
                                        {isSyncing ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>
                                                <span>Running Database Migrations...</span>
                                            </>
                                        ) : (
                                            <span>Import to Master Catalog (Final Step)</span>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}

                        <p className="text-xs text-center text-gray-500 mt-4">
                            This action extracts structurally mapped product configurations identifying PARLE and ITC brands locally.
                        </p>
                    </div>
                )}

                {/* Supabase Direct Upload Section */}
                {hasFiles && (
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-6">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">📤 Direct Upload to Supabase</h3>
                        <p className="text-gray-500 text-sm mb-4">Parse and insert transaction records directly into the database tables.</p>

                        {error && !syncSummary && (
                            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="flex gap-4 mb-4">
                            {salesFile && (
                                <button
                                    onClick={() => runSupabaseSync('sales')}
                                    disabled={isSupabaseSyncing}
                                    className={`flex-1 font-semibold py-3 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 ${isSupabaseSyncing ? 'bg-gray-400 cursor-wait text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                                >
                                    {isSupabaseSyncing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Uploading Sales...</span>
                                        </>
                                    ) : (
                                        <span>Upload Sales to Supabase</span>
                                    )}
                                </button>
                            )}
                            {purchaseFile && (
                                <button
                                    onClick={() => runSupabaseSync('purchase')}
                                    disabled={isSupabaseSyncing}
                                    className={`flex-1 font-semibold py-3 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 ${isSupabaseSyncing ? 'bg-gray-400 cursor-wait text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}
                                >
                                    {isSupabaseSyncing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Uploading Purchases...</span>
                                        </>
                                    ) : (
                                        <span>Upload Purchases to Supabase</span>
                                    )}
                                </button>
                            )}
                        </div>

                        {supabaseSummary && (
                            <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
                                <h4 className="text-lg font-bold text-green-900 mb-3">✅ Upload Complete!</h4>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                                        <span className="text-2xl font-black text-gray-800">{supabaseSummary.totalParsed}</span>
                                        <span className="block text-xs font-bold text-gray-500 uppercase mt-1">Total Parsed</span>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                                        <span className="text-2xl font-black text-blue-600">{supabaseSummary.validRows}</span>
                                        <span className="block text-xs font-bold text-gray-500 uppercase mt-1">Valid Rows</span>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                                        <span className="text-2xl font-black text-green-600">{supabaseSummary.inserted}</span>
                                        <span className="block text-xs font-bold text-gray-500 uppercase mt-1">Inserted</span>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                                        <span className="text-2xl font-black text-yellow-600">{supabaseSummary.skipped}</span>
                                        <span className="block text-xs font-bold text-gray-500 uppercase mt-1">Duplicates</span>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow-sm border border-green-100 text-center">
                                        <span className="text-2xl font-black text-red-500">{supabaseSummary.errors}</span>
                                        <span className="block text-xs font-bold text-gray-500 uppercase mt-1">Errors</span>
                                    </div>
                                </div>
                                <p className="text-xs text-green-700 mt-3">Type: <strong>{supabaseSummary.type === 'sales' ? 'Sales Transactions' : 'Purchase Transactions'}</strong></p>
                            </div>
                        )}

                        {/* Tally Detection Info */}
                        {supabaseMeta && (
                            <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                <h4 className="text-sm font-bold text-indigo-900 mb-2">🔍 Detection Details</h4>
                                <p className="text-xs text-indigo-700">Header detected at row: <strong>{supabaseMeta.headerRow}</strong></p>
                                <p className="text-xs text-indigo-700 mt-1">Columns mapped: <strong>{Object.keys(supabaseMeta.columnMapping || {}).length}</strong> — {Object.entries(supabaseMeta.columnMapping || {}).map(([k, v]) => `${k} → ${v}`).join(', ')}</p>
                            </div>
                        )}

                        {/* Preview Table */}
                        {supabasePreview.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-sm font-bold text-gray-800 mb-2">Preview (First 10 Parsed Rows)</h4>
                                <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-h-[350px]">
                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Party</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Product</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Brand</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">Amount</th>
                                                <th className="px-3 py-2 text-right font-semibold text-gray-600">GST%</th>
                                                <th className="px-3 py-2 text-left font-semibold text-gray-600">Route</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {supabasePreview.map((row: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{row.date ? new Date(row.date).toLocaleDateString() : '-'}</td>
                                                    <td className="px-3 py-2 text-gray-800 font-medium truncate max-w-[150px]">{row.partyName || '-'}</td>
                                                    <td className="px-3 py-2 text-gray-800 truncate max-w-[200px]">{row.productName || '-'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{row.brand || '-'}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">₹{Number(row.amount || 0).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right text-gray-600">{row.gstRate != null ? `${row.gstRate}%` : '-'}</td>
                                                    <td className="px-3 py-2 text-gray-600">{row.route || row.area || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
