'use client';

import React, { useState, useEffect } from 'react';
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
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountReceivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // History State
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});

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

  const openPaymentModal = (receivable: AccountReceivable) => {
    setSelectedReceivable(receivable);
    setPaymentAmount(receivable.receivableAmount);
    setPaymentMode('CASH');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setReferenceNumber('');
    setNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable) return;

    try {
      const parsedAmount = Number(paymentAmount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        alert('Please enter a valid positive payment amount');
        return;
      }
      if (parsedAmount > Number(selectedReceivable.receivableAmount)) {
        alert('Payment amount cannot exceed remaining balance');
        return;
      }

      const response = await fetch(`/api/accounts-receivable/${selectedReceivable.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: parsedAmount,
          paymentMode,
          paymentDate,
          referenceNumber,
          notes
        }),
      });

      if (!response.ok) throw new Error('Failed to record payment');
      const updated = await response.json();

      setReceivables(receivables.map(r => r.id === selectedReceivable.id ? { ...r, receivableAmount: updated.receivableAmount, paymentStatus: updated.paymentStatus } : r));

      // Clear history data uniquely to fetch it freshly next time opened
      setHistoryData(prev => {
        const newData = { ...prev };
        delete newData[selectedReceivable.id];
        return newData;
      });

      setIsPaymentModalOpen(false);
      alert('Payment recorded successfully!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleHistory = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (!historyData[id]) {
      try {
        const res = await fetch(`/api/accounts-receivable/${id}`);
        if (res.ok) {
          const data = await res.json();
          setHistoryData(prev => ({ ...prev, [id]: data.payments || [] }));
        }
      } catch (e) {
        console.error(e);
      }
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

        {/* Summary Badges */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-gray-600 text-xs font-medium uppercase">Pending Count</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {receivables.filter(r => r.paymentStatus === 'PENDING').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
            <p className="text-gray-600 text-xs font-medium uppercase">Pending Amount</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              ₹{receivables.filter(r => r.paymentStatus === 'PENDING').reduce((sum, r) => sum + Number(r.receivableAmount), 0).toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
            <p className="text-gray-600 text-xs font-medium uppercase">Completed Count</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {receivables.filter(r => r.paymentStatus === 'COMPLETED').length}
            </p>
          </div>
        </div>

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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Remaining Balance</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {getFilteredReceivables().map(receivable => (
                  <React.Fragment key={receivable.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{receivable.invoice.invoiceNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{receivable.invoice.party.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(receivable.invoice.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold">₹{Number(receivable.totalAmount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{Number(receivable.receivableAmount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${receivable.paymentStatus === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : receivable.paymentStatus === 'PARTIAL'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                          }`}>
                          {receivable.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openPaymentModal(receivable)}
                            disabled={receivable.paymentStatus === 'COMPLETED'}
                            className={`px-3 py-1 rounded text-white font-medium ${receivable.paymentStatus === 'COMPLETED' ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-sm'}`}
                          >
                            Pay
                          </button>
                          <button
                            onClick={() => toggleHistory(receivable.id)}
                            className={`px-3 py-1 rounded font-medium border ${expandedId === receivable.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm'}`}
                          >
                            {expandedId === receivable.id ? 'Hide' : 'History'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === receivable.id && (
                      <tr className="bg-indigo-50/50">
                        <td colSpan={7} className="px-6 py-4 border-b border-indigo-100">
                          <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                            <h4 className="font-semibold text-indigo-900 mb-3 text-sm flex items-center gap-2">
                              <span className="text-lg">📜</span> Payment History Log
                            </h4>
                            {!historyData[receivable.id] ? (
                              <div className="text-gray-500 text-sm py-2">Loading transactions...</div>
                            ) : historyData[receivable.id].length === 0 ? (
                              <div className="text-gray-500 text-sm italic py-2">No payments dynamically recorded yet.</div>
                            ) : (
                              <table className="w-full text-sm text-left border">
                                <thead className="bg-gray-50 text-gray-600 border-b">
                                  <tr>
                                    <th className="px-4 py-3 font-medium">Date</th>
                                    <th className="px-4 py-3 font-medium">Amount Received</th>
                                    <th className="px-4 py-3 font-medium">Method</th>
                                    <th className="px-4 py-3 font-medium">Reference</th>
                                    <th className="px-4 py-3 font-medium">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {historyData[receivable.id].map(payment => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                      <td className="px-4 py-3 text-gray-600">{new Date(payment.date).toLocaleString()}</td>
                                      <td className="px-4 py-3 font-bold text-green-600">+ ₹{Number(payment.amount).toFixed(2)}</td>
                                      <td className="px-4 py-3">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-semibold">{payment.paymentMode || 'CASH'}</span>
                                      </td>
                                      <td className="px-4 py-3 text-gray-600">{payment.referenceNumber || '-'}</td>
                                      <td className="px-4 py-3 text-gray-500 italic max-w-[200px] truncate">{payment.description || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Payment Recording Modal */}
      {
        isPaymentModalOpen && selectedReceivable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-xl font-bold text-gray-900">Record Payment</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <form id="paymentForm" onSubmit={handleRecordPayment} className="space-y-5">
                  <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100">
                    <span className="text-sm font-semibold text-blue-900">Outstanding Balance:</span>
                    <span className="text-2xl font-bold text-blue-700">₹{Number(selectedReceivable.receivableAmount).toFixed(2)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Amount (₹)*</label>
                      <input type="number" step="0.01" required value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} max={Number(selectedReceivable.receivableAmount)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Date*</label>
                      <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Payment Mode*</label>
                      <select required value={paymentMode} onChange={e => setPaymentMode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="BANK">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Ref Num / UTR</label>
                      <input type="text" value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} placeholder="e.g. TXN12345" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional payment notes..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                  </div>
                </form>
              </div>
              <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-2 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors">Cancel</button>
                <button type="submit" form="paymentForm" className="px-5 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors">Save Payment</button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}
