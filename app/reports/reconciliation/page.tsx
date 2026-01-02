'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type Adjustment = {
  label: string;
  value: number;
  explanation: string;
};

type ReconData = {
  netProfit: number;
  netCashFlow: number;
  adjustments: Adjustment[];
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ReconciliationPage() {
  const [data, setData] = useState<ReconData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/reconciliation?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch reconciliation data');
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
    const rows = [
      ['Net Profit', formatCurrencyForCSV(data.netProfit)],
      ...data.adjustments.map(a => [a.label, formatCurrencyForCSV(a.value)]),
      ['Net Cash Flow', formatCurrencyForCSV(data.netCashFlow)]
    ];
    exportToCSV({
      filename: `Cash-Profit-Reconciliation-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers: ['Description', 'Amount'],
      rows
    });
  };

  const formatCurrency = (amount: number): string => {
    const sign = amount < 0 ? '-' : '+';
    const absVal = Math.abs(amount);
    return `${sign} ₹${absVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - 2 + i);

  if (loading) return <div className="p-8 text-center text-gray-500">Calculating reconciliation...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Cash vs Profit Reconciliation</h1>
            <p className="text-gray-600 mt-1">Understand the difference between your earnings and liquidity</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              {MONTHS.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}
            </select>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700">📥 Export CSV</button>
          </div>
        </div>

        {data && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-8 space-y-6">
              {/* Starting Point: Net Profit */}
              <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                <div>
                  <h2 className="text-xl font-bold text-indigo-900">Net Profit (Accrual)</h2>
                  <p className="text-sm text-indigo-600">Earnings recognized during this period</p>
                </div>
                <span className="text-2xl font-bold text-indigo-900">₹{data.netProfit.toLocaleString('en-IN')}</span>
              </div>

              {/* Adjustments */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">Reconciling Items</h3>
                {data.adjustments.map((adj, idx) => (
                  <div key={idx} className="flex justify-between items-start p-4 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                    <div className="max-w-md">
                      <p className="font-semibold text-gray-800">{adj.label}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{adj.explanation}</p>
                    </div>
                    <span className={`font-mono font-bold ${adj.value < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(adj.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Result: Net Cash Flow */}
              <div className="flex justify-between items-center bg-teal-50 p-6 rounded-lg border border-teal-100 mt-8">
                <div>
                  <h2 className="text-xl font-bold text-teal-900">Net Cash Flow (Liquidity)</h2>
                  <p className="text-sm text-teal-600">Actual change in cash position</p>
                </div>
                <span className="text-2xl font-bold text-teal-900">₹{data.netCashFlow.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
