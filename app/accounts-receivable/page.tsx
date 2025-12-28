'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type AccountReceivable = {
  id: string;
  invoiceId: string;
  totalAmount: number;
  receivableAmount: number;
  paymentStatus: string;
  invoice: {
    id: string;
    invoiceNumber: string;
    date: string;
    party: {
      name: string;
    };
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  };
};

export default function AccountsReceivablePage() {
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState(''); // Search: invoice number, customer name
  const [filterCustomer, setFilterCustomer] = useState(''); // Filter: customer
  const [filterPaymentStatus, setFilterPaymentStatus] = useState(''); // Filter: payment status
  const [filterDateFrom, setFilterDateFrom] = useState(''); // Filter: date range (from)
  const [filterDateTo, setFilterDateTo] = useState(''); // Filter: date range (to)

  useEffect(() => {
    const fetchReceivables = async () => {
      try {
        const response = await fetch('/api/accounts-receivable');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setReceivables(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReceivables();
  }, []);

  const handleEditPayment = async (id: string) => {
    try {
      const response = await fetch(`/api/accounts-receivable/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receivableAmount: editAmount }),
      });

      if (!response.ok) throw new Error('Failed to update');
      const updated = await response.json();

      setReceivables(receivables.map(r => r.id === id ? updated : r));
      setEditingId(null);
      alert('Payment updated successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter and search logic - combines all filters and searches
  const getFilteredReceivables = () => {
    return receivables.filter(rec => {
      // Search: case-insensitive invoice number or customer name
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        rec.invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        rec.invoice.party.name.toLowerCase().includes(searchLower);
      
      // Filter: customer (exact match on party name)
      const matchesCustomer = filterCustomer === '' || 
        rec.invoice.party.name === filterCustomer;
      
      // Filter: payment status
      const matchesPaymentStatus = filterPaymentStatus === '' || 
        rec.paymentStatus === filterPaymentStatus;
      
      // Filter: date range
      const invoiceDate = new Date(rec.invoice.date);
      const matchesDateFrom = filterDateFrom === '' || invoiceDate >= new Date(filterDateFrom);
      const matchesDateTo = filterDateTo === '' || invoiceDate <= new Date(filterDateTo);
      
      // All filters must pass
      return matchesSearch && matchesCustomer && matchesPaymentStatus && matchesDateFrom && matchesDateTo;
    });
  };

  // Get unique customers for filter dropdown
  const uniqueCustomers = [...new Set(receivables.map(r => r.invoice.party.name))].sort();

  // Export receivables to CSV
  const handleExportReceivables = () => {
    if (receivables.length === 0) {
      alert('No receivables to export');
      return;
    }

    const headers = ['Invoice Number', 'Customer', 'Date', 'Total Amount', 'Receivable Amount', 'Status'];
    const rows = receivables.map(rec => [
      rec.invoice.invoiceNumber,
      rec.invoice.party.name,
      formatDateForCSV(rec.invoice.date),
      formatCurrencyForCSV(rec.totalAmount),
      formatCurrencyForCSV(rec.receivableAmount),
      rec.paymentStatus,
    ]);

    const filename = `Receivables_${new Date().toISOString().split('T')[0]}`;
    exportToCSV({ filename, headers, rows });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>
            <p className="text-gray-600 mt-2">Track money owed by customers</p>
          </div>
          <button
            onClick={handleExportReceivables}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            📥 Export CSV
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-800 p-4 mb-6 rounded-lg">{error}</div>}

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search by invoice number or customer name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Invoice # or Customer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by customer */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Customer</label>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Customers</option>
                {uniqueCustomers.map(customer => (
                  <option key={customer} value={customer}>{customer}</option>
                ))}
              </select>
            </div>
            
            {/* Filter by payment status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            
            {/* Filter by date range - from */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by date range - to */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Date To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Clear filters button */}
          {(searchTerm || filterCustomer || filterPaymentStatus || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCustomer('');
                setFilterPaymentStatus('');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="mt-3 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {getFilteredReceivables().length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center text-gray-500">
            No receivable records found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Receivable Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {getFilteredReceivables().map(receivable => (
                  <tr key={receivable.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{receivable.invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{receivable.invoice.party.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(receivable.invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">₹{Number(receivable.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === receivable.id ? (
                        <input
                          type="number"
                          className="w-24 px-2 py-1 border border-blue-300 rounded"
                          value={editAmount}
                          onChange={(e) => setEditAmount(parseFloat(e.target.value))}
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900 font-semibold">₹{Number(receivable.receivableAmount).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        receivable.paymentStatus === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {receivable.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === receivable.id ? (
                        <div className="space-x-2">
                          <button
                            onClick={() => handleEditPayment(receivable.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(receivable.id);
                            setEditAmount(Number(receivable.receivableAmount));
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Section */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Total Receivable</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₹{receivables.reduce((sum, r) => sum + Number(r.receivableAmount), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Pending Payments</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {receivables.filter(r => r.paymentStatus === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Completed Payments</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {receivables.filter(r => r.paymentStatus === 'COMPLETED').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
