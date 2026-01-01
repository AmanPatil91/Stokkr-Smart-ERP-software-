'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type LedgerRow = {
  date: string;
  account: string;
  debit: number;
  credit: number;
  reference: string;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ACCOUNTS = [
  'Cash / Bank',
  'Accounts Receivable',
  'Accounts Payable',
  'Inventory',
  'Sales',
  'Cost of Goods Sold',
  'Interest Expense',
];

export default function GeneralLedgerPage() {
  const [ledgerData, setLedgerData] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedAccount, setSelectedAccount] = useState<string>('');

  useEffect(() => {
    fetchLedger();
  }, [selectedMonth, selectedYear, selectedAccount]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = `/api/reports/general-ledger?month=${selectedMonth}&year=${selectedYear}`;
      if (selectedAccount) {
        url += `&account=${encodeURIComponent(selectedAccount)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch ledger data');
      const data = await res.json();
      setLedgerData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (ledgerData.length === 0) return;

    exportToCSV({
      filename: `General-Ledger-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers: ['Date', 'Account', 'Debit', 'Credit', 'Reference'],
      rows: ledgerData.map(row => [
        new Date(row.date).toLocaleDateString(),
        row.account,
        formatCurrencyForCSV(row.debit),
        formatCurrencyForCSV(row.credit),
        row.reference
      ])
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">General Ledger</h1>
          <p className="text-gray-600 mt-1">Derived read-only view of all financial transactions</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Accounts</option>
                {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {MONTHS.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={ledgerData.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-400"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading ledger data...</td></tr>
              ) : ledgerData.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No transactions found for this period.</td></tr>
              ) : (
                ledgerData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                      {row.account}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                      {row.debit > 0 ? formatCurrency(row.debit) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-semibold">
                      {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {row.reference}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
