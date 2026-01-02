'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function PartyPerformancePage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [partyType, setPartyType] = useState('CUSTOMER');

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, partyType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/party-performance?month=${selectedMonth}&year=${selectedYear}&partyType=${partyType}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDelayColor = (delay: number) => {
    if (delay <= 15) return 'text-green-600 bg-green-50';
    if (delay <= 45) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const handleExportCSV = () => {
    const headers = ['Party Name', partyType === 'CUSTOMER' ? 'Total Sales' : 'Total Purchases', 'Outstanding Balance', 'Avg Delay (Days)'];
    const rows = data.map(p => [p.name, p.total, p.outstanding, p.avgDelay]);
    exportToCSV({
      filename: `Party-Performance-${partyType}-${MONTHS[selectedMonth]}-${selectedYear}`,
      headers,
      rows
    });
  };

  if (loading) return <div className="p-8 text-center">Loading performance data...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Party Performance Summary</h1>
            <p className="text-gray-600 mt-1">Analytical overview of {partyType.toLowerCase()} behavior</p>
          </div>
          <div className="flex gap-2">
            <select value={partyType} onChange={(e) => setPartyType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
              <option value="CUSTOMER">Customers</option>
              <option value="SUPPLIER">Suppliers</option>
            </select>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-3 py-2 border rounded-lg text-sm bg-white">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <button onClick={handleExportCSV} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">📥 Export CSV</button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Party Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{partyType === 'CUSTOMER' ? 'Total Sales' : 'Total Purchases'}</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Outstanding</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Avg Delay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((p, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-gray-900">{p.name}</td>
                  <td className="px-6 py-4 text-right text-gray-700 font-mono">₹{p.total.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600 font-mono">₹{p.outstanding.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDelayColor(p.avgDelay)}`}>
                      {p.avgDelay} days
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">No data found for this period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
