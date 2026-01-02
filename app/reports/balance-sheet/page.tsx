'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type BSData = {
  asOfDate: string;
  assets: {
    cashBank: number;
    accountsReceivable: number;
    inventoryValue: number;
    totalAssets: number;
  };
  liabilities: {
    accountsPayable: number;
    loans: number;
    totalLiabilities: number;
  };
  equity: {
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function BalanceSheetPage() {
  const [data, setData] = useState<BSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  useEffect(() => {
    fetchBalanceSheet();
  }, [selectedMonth, selectedYear]);

  const fetchBalanceSheet = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/balance-sheet?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch balance sheet');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    const dataRows = [
      ['ASSETS'],
      ['Cash / Bank', formatCurrencyForCSV(data.assets.cashBank)],
      ['Accounts Receivable', formatCurrencyForCSV(data.assets.accountsReceivable)],
      ['Inventory', formatCurrencyForCSV(data.assets.inventoryValue)],
      ['Total Assets', formatCurrencyForCSV(data.assets.totalAssets)],
      [],
      ['LIABILITIES'],
      ['Accounts Payable', formatCurrencyForCSV(data.liabilities.accountsPayable)],
      ['Loans', formatCurrencyForCSV(data.liabilities.loans)],
      ['Total Liabilities', formatCurrencyForCSV(data.liabilities.totalLiabilities)],
      [],
      ['EQUITY'],
      ['Retained Earnings', formatCurrencyForCSV(data.equity.retainedEarnings)],
      ['Total Equity', formatCurrencyForCSV(data.equity.totalEquity)],
      [],
      ['TOTAL LIABILITIES & EQUITY', formatCurrencyForCSV(data.totalLiabilitiesAndEquity)]
    ];

    exportToCSV({
      filename: `Balance-Sheet-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers: ['Description', 'Amount'],
      rows: dataRows
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  if (loading) return <div className="p-8 text-center text-gray-600">Calculating Balance Sheet...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Balance Sheet</h1>
            <p className="text-gray-600 mt-1">As on {new Date(data?.asOfDate || '').toLocaleDateString()}</p>
          </div>
          <div className="flex gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Period</label>
              <div className="flex gap-2">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
                  {MONTHS.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition">📥 Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ASSETS */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="font-bold text-gray-800 uppercase tracking-wider">Assets</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-600">Cash / Bank</span>
                <span className="font-semibold text-gray-900">{formatCurrency(data?.assets.cashBank || 0)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-600">Accounts Receivable</span>
                <span className="font-semibold text-gray-900">{formatCurrency(data?.assets.accountsReceivable || 0)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-gray-100">
                <span className="text-gray-600">Inventory</span>
                <span className="font-semibold text-gray-900">{formatCurrency(data?.assets.inventoryValue || 0)}</span>
              </div>
              <div className="flex justify-between pt-4">
                <span className="font-bold text-gray-800 text-lg">Total Assets</span>
                <span className="font-bold text-blue-600 text-xl">{formatCurrency(data?.assets.totalAssets || 0)}</span>
              </div>
            </div>
          </div>

          {/* LIABILITIES & EQUITY */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 uppercase tracking-wider">Liabilities</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Accounts Payable</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(data?.liabilities.accountsPayable || 0)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Loans</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(data?.liabilities.loans || 0)}</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="font-bold text-gray-800">Total Liabilities</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data?.liabilities.totalLiabilities || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-gray-800 uppercase tracking-wider">Equity</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between pb-2 border-b border-gray-100">
                  <span className="text-gray-600">Retained Earnings</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(data?.equity.retainedEarnings || 0)}</span>
                </div>
                <div className="flex justify-between pt-4">
                  <span className="font-bold text-gray-800">Total Equity</span>
                  <span className="font-bold text-gray-900">{formatCurrency(data?.equity.totalEquity || 0)}</span>
                </div>
              </div>
            </div>

            <div className="bg-indigo-600 rounded-xl shadow-md p-6 flex justify-between items-center text-white">
              <span className="font-bold text-lg uppercase">Total Liab. & Equity</span>
              <span className="font-bold text-2xl">{formatCurrency(data?.totalLiabilitiesAndEquity || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
