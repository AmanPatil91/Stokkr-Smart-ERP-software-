'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type AccountPayable = {
  id: string;
  batchId: string;
  totalAmount: number;
  payableAmount: number;
  paymentStatus: string;
  batch: {
    id: string;
    batchNumber: string;
    quantity: number;
    costPerItem: number;
    product: {
      name: string;
    };
  };
};

export default function AccountsPayablePage() {
  const [payables, setPayables] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState(''); // Search: batch ID, supplier name
  const [filterSupplier, setFilterSupplier] = useState(''); // Filter: supplier
  const [filterBatchId, setFilterBatchId] = useState(''); // Filter: batch ID
  const [filterBatchDateFrom, setFilterBatchDateFrom] = useState(''); // Filter: batch date (from)

  useEffect(() => {
    const fetchPayables = async () => {
      try {
        const response = await fetch('/api/accounts-payable');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setPayables(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPayables();
  }, []);

  const handleEditPayment = async (id: string) => {
    try {
      const response = await fetch(`/api/accounts-payable/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payableAmount: editAmount }),
      });

      if (!response.ok) throw new Error('Failed to update');
      const updated = await response.json();

      setPayables(payables.map(p => p.id === id ? updated : p));
      setEditingId(null);
      alert('Payment updated successfully!');
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter and search logic - combines all filters and searches
  const getFilteredPayables = () => {
    return payables.filter(pay => {
      // Search: case-insensitive batch ID or supplier name
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' || 
        pay.batch.batchNumber.toLowerCase().includes(searchLower) ||
        pay.batch.product.name.toLowerCase().includes(searchLower);
      
      // Filter: supplier (based on product's supplier association via batch)
      const matchesSupplier = filterSupplier === '' || 
        filterSupplier === ''; // Supplier filter would need batch supplier info
      
      // Filter: batch ID
      const matchesBatchId = filterBatchId === '' || 
        pay.batch.batchNumber === filterBatchId;
      
      return matchesSearch && matchesBatchId;
    });
  };

  // Export payables to CSV
  const handleExportPayables = () => {
    if (payables.length === 0) {
      alert('No payables to export');
      return;
    }

    const headers = ['Batch Number', 'Product', 'Quantity', 'Total Amount', 'Payable Amount', 'Status'];
    const rows = payables.map(pay => [
      pay.batch.batchNumber,
      pay.batch.product.name,
      pay.batch.quantity,
      formatCurrencyForCSV(pay.totalAmount),
      formatCurrencyForCSV(pay.payableAmount),
      pay.paymentStatus,
    ]);

    const filename = `Payables_${new Date().toISOString().split('T')[0]}`;
    exportToCSV({ filename, headers, rows });
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Accounts Payable</h1>
            <p className="text-gray-600 mt-2">Track money owed to suppliers</p>
          </div>
          <button
            onClick={handleExportPayables}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            📥 Export CSV
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-800 p-4 mb-6 rounded-lg">{error}</div>}

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search by batch ID or product name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Batch # or Product"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by batch ID */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Batch ID</label>
              <input
                type="text"
                placeholder="Filter by Batch ID"
                value={filterBatchId}
                onChange={(e) => setFilterBatchId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filter by payment status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterSupplier}
                onChange={(e) => setFilterSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          {/* Clear filters button */}
          {(searchTerm || filterBatchId || filterSupplier || filterBatchDateFrom) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterBatchId('');
                setFilterSupplier('');
                setFilterBatchDateFrom('');
              }}
              className="mt-3 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {getFilteredPayables().length === 0 ? (
          <div className="bg-white p-8 rounded-lg text-center text-gray-500">
            No payable records found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Batch Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Quantity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payable Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {getFilteredPayables().map(payable => (
                  <tr key={payable.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{payable.batch.batchNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{payable.batch.product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{payable.batch.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">₹{Number(payable.totalAmount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === payable.id ? (
                        <input
                          type="number"
                          className="w-24 px-2 py-1 border border-blue-300 rounded"
                          value={editAmount}
                          onChange={(e) => setEditAmount(parseFloat(e.target.value))}
                          step="0.01"
                        />
                      ) : (
                        <span className="text-gray-900 font-semibold">₹{Number(payable.payableAmount).toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        payable.paymentStatus === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {payable.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {editingId === payable.id ? (
                        <div className="space-x-2">
                          <button
                            onClick={() => handleEditPayment(payable.id)}
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
                            setEditingId(payable.id);
                            setEditAmount(Number(payable.payableAmount));
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
            <p className="text-gray-600 text-sm">Total Payable</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₹{payables.reduce((sum, p) => sum + Number(p.payableAmount), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Pending Payments</p>
            <p className="text-2xl font-bold text-yellow-600 mt-2">
              {payables.filter(p => p.paymentStatus === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm">Completed Payments</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {payables.filter(p => p.paymentStatus === 'COMPLETED').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
