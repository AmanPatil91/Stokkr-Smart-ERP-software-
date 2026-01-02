'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type AgingRecord = {
  id: string;
  customer?: string;
  supplier?: string;
  date: string;
  amount: number;
  days: number;
  bucket: string;
  status: string;
  reference: string;
};

type ExposureRecord = {
  id: string;
  name: string;
  outstanding: number;
  limit?: number; // UI-only local state
};

type RiskData = {
  receivablesAging: AgingRecord[];
  payablesAging: AgingRecord[];
  customerExposure: ExposureRecord[];
};

export default function CreditRiskPage() {
  const [data, setData] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerLimits, setCustomerLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/credit-risk');
      if (!res.ok) throw new Error('Failed to fetch risk data');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = (type: 'receivables' | 'payables' | 'exposure') => {
    if (!data) return;

    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    if (type === 'receivables') {
      headers = ['Customer', 'Date', 'Invoice #', 'Amount', 'Days Overdue', 'Bucket', 'Status'];
      rows = data.receivablesAging.map(r => [
        r.customer, new Date(r.date).toLocaleDateString(), r.reference, 
        formatCurrencyForCSV(r.amount), r.days, r.bucket, r.status
      ]);
      filename = 'Receivables-Aging';
    } else if (type === 'payables') {
      headers = ['Supplier', 'Date', 'Batch #', 'Amount', 'Days Overdue', 'Bucket', 'Status'];
      rows = data.payablesAging.map(r => [
        r.supplier, new Date(r.date).toLocaleDateString(), r.reference, 
        formatCurrencyForCSV(r.amount), r.days, r.bucket, r.status
      ]);
      filename = 'Payables-Aging';
    } else {
      headers = ['Customer', 'Outstanding Exposure', 'Advisory Limit', 'Status'];
      rows = data.customerExposure.map(c => [
        c.name, formatCurrencyForCSV(c.outstanding), 
        customerLimits[c.id] || 0,
        (customerLimits[c.id] && c.outstanding > customerLimits[c.id]) ? 'EXCEEDED' : 'OK'
      ]);
      filename = 'Customer-Exposure';
    }

    exportToCSV({ filename, headers, rows });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Overdue': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) return <div className="p-8 text-center text-gray-600">Loading risk metrics...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Credit & Risk Management</h1>
            <p className="text-gray-600 mt-1">Aging analysis and customer credit exposure review</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExportCSV('receivables')} className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Export Aging</button>
            <button onClick={() => handleExportCSV('exposure')} className="px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-700">Export Exposure</button>
          </div>
        </div>

        {/* Aging Summary Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Receivables Aging */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Receivables Aging (Customer)</h2>
              <span className="text-xs text-gray-500">Based on Invoice Date</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Bucket</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {data?.receivablesAging.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{r.customer}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(r.amount)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.bucket}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.receivablesAging.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500">No pending receivables</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payables Aging */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">Payables Aging (Supplier)</h2>
              <span className="text-xs text-gray-500">Based on Purchase Date</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 text-xs">
                  <tr>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Bucket</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {data?.payablesAging.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{p.reference}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{p.bucket}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${getStatusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.payablesAging.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-gray-500">No pending payables</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer Credit Exposure Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="font-bold text-gray-800">Customer Credit Exposure</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data?.customerExposure.map(c => {
                const limit = customerLimits[c.id] || 0;
                const exceeded = limit > 0 && c.outstanding > limit;
                
                return (
                  <div key={c.id} className={`p-4 rounded-lg border-2 transition-colors ${exceeded ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                      {exceeded && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">Limit Exceeded</span>}
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Outstanding</p>
                        <p className={`text-xl font-bold ${exceeded ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(c.outstanding)}</p>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-500 uppercase font-semibold block mb-1">Advisory Credit Limit (UI-only)</label>
                        <div className="flex gap-2">
                          <input 
                            type="number" 
                            placeholder="Set limit..."
                            value={customerLimits[c.id] || ''}
                            onChange={(e) => setCustomerLimits({...customerLimits, [c.id]: parseFloat(e.target.value) || 0})}
                            className="w-full px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {limit > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full ${exceeded ? 'bg-red-600' : 'bg-blue-600'}`} 
                            style={{ width: `${Math.min((c.outstanding / limit) * 100, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {data?.customerExposure.length === 0 && <p className="col-span-full text-center py-8 text-gray-500">No active customer exposure</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
