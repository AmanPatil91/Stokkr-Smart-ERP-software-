'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function TrialBalancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  useEffect(() => {
    fetchTrialBalance();
  }, [selectedMonth, selectedYear]);

  const fetchTrialBalance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/trial-balance?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch trial balance');
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
    const headers = ['Account Name', 'Total Debit', 'Total Credit', 'Closing Balance', 'Type'];
    const rows = data.accounts.map((acc: any) => [
      acc.name,
      acc.debit.toFixed(2),
      acc.credit.toFixed(2),
      acc.closingBalance.toFixed(2),
      acc.type
    ]);
    
    rows.push([]);
    rows.push(['TOTALS', data.totalDebit.toFixed(2), data.totalCredit.toFixed(2), '', '']);

    exportToCSV({
      filename: `Trial-Balance-As-On-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers,
      rows
    });
  };

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="p-8 text-center">Generating Trial Balance...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Trial Balance</h1>
            <p className="text-gray-600 mt-1">Summary of all ledger balances as on {new Date(selectedYear, selectedMonth + 1, 0).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-white">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-white">
              {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExportCSV} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">📥 Export CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Account Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Debit (Dr)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Credit (Cr)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.accounts.map((acc: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                  <td className="px-6 py-4 text-right text-gray-700 font-mono">{acc.debit > 0 ? formatCurrency(acc.debit) : '-'}</td>
                  <td className="px-6 py-4 text-right text-gray-700 font-mono">{acc.credit > 0 ? formatCurrency(acc.credit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">
                    {formatCurrency(acc.closingBalance)} <span className="text-[10px] text-gray-400 font-normal">{acc.type}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200">
              <tr>
                <td className="px-6 py-4 text-gray-900">Total</td>
                <td className="px-6 py-4 text-right text-gray-900 font-mono">{formatCurrency(data.totalDebit)}</td>
                <td className="px-6 py-4 text-right text-gray-900 font-mono">{formatCurrency(data.totalCredit)}</td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-4 py-1 rounded-full text-sm ${data.isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {data.isBalanced ? '✓ Balanced' : '⚠️ Mismatch'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
