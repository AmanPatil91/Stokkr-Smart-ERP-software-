'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ExceptionReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  useEffect(() => {
    fetchExceptions();
  }, [selectedMonth, selectedYear]);

  const fetchExceptions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/exception-reports?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch exceptions');
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
    const rows: any[][] = [];
    
    rows.push(['EXPENSE ALERTS']);
    rows.push(['Category', 'Previous', 'Current', '% Change']);
    data.expenseAlerts.forEach((a: any) => rows.push([a.category, a.previous, a.current, a.change.toFixed(2)]));
    
    rows.push([]);
    rows.push(['SALES ALERTS']);
    rows.push(['Previous Sales', 'Current Sales', '% Change']);
    data.salesAlerts.forEach((a: any) => rows.push([a.previous, a.current, a.change.toFixed(2)]));
    
    rows.push([]);
    rows.push(['RECEIVABLE ALERTS (60+ DAYS)']);
    rows.push(['Customer', 'Reference', 'Amount', 'Days Overdue']);
    data.receivableAlerts.forEach((a: any) => rows.push([a.customer, a.reference, a.amount, a.days]));

    exportToCSV({
      filename: `Exception-Report-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers: ['Report Type', 'Details'],
      rows
    });
  };

  const formatCurrency = (amt: number) => `₹${amt.toLocaleString('en-IN')}`;

  if (loading) return <div className="p-8 text-center">Analysing data for exceptions...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Exception Reports</h1>
            <p className="text-gray-600">Identifying unusual business patterns for {MONTHS[selectedMonth]} {selectedYear}</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <button onClick={handleExportCSV} className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold">📥 Export CSV</button>
          </div>
        </div>

        <div className="space-y-8">
          {/* Expense Alerts */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">⚠️ Sudden Expense Spikes (&gt;30%)</h2>
            {data?.expenseAlerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.expenseAlerts.map((a: any, i: number) => (
                  <div key={i} className="p-4 border border-red-100 bg-red-50 rounded-lg">
                    <p className="font-bold text-gray-900">{a.category}</p>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-gray-500">Prev: {formatCurrency(a.previous)}</span>
                      <span className="text-red-600 font-bold">Curr: {formatCurrency(a.current)}</span>
                    </div>
                    <p className="text-xs text-red-500 mt-1 font-bold">↑ {a.change.toFixed(1)}% increase</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500 text-sm">No significant expense spikes detected.</p>}
          </section>

          {/* Sales Alerts */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-orange-700 mb-4 flex items-center gap-2">📉 Sharp Sales Drops (&gt;20%)</h2>
            {data?.salesAlerts.length > 0 ? (
              data.salesAlerts.map((a: any, i: number) => (
                <div key={i} className="p-4 border border-orange-100 bg-orange-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">Sales performance vs previous month</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-gray-700">Prev: {formatCurrency(a.previous)}</span>
                      <span className="text-orange-600 font-bold">Curr: {formatCurrency(a.current)}</span>
                    </div>
                  </div>
                  <span className="text-xl font-bold text-orange-600">↓ {Math.abs(a.change).toFixed(1)}% drop</span>
                </div>
              ))
            ) : <p className="text-gray-500 text-sm">Sales performance is stable.</p>}
          </section>

          {/* Receivable Alerts */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">⌛ Long-Overdue Receivables (60+ Days)</h2>
            {data?.receivableAlerts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-400 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-2">Customer</th>
                      <th className="px-4 py-2">Reference</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2 text-center">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.receivableAlerts.map((a: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="px-4 py-3 font-semibold">{a.customer}</td>
                        <td className="px-4 py-3 text-gray-500">{a.reference}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(a.amount)}</td>
                        <td className="px-4 py-3 text-center"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-bold">{a.days}d</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-gray-500 text-sm">No critical overdue receivables found.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
