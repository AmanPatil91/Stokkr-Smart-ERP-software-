'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type Expense = {
  id: string;
  category: string;
  title: string;
  amount: number;
  expenseDate: string;
  paymentMode: string;
  referenceNumber?: string;
  notes?: string;
  createdAt: string;
};

const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Transportation Cost',
  'Staff Salary',
  'Loading / Unloading',
  'Packaging',
  'Office Supplies',
  'Internet / Mobile',
  'Maintenance',
  'Interest on Loans',
  'Miscellaneous',
];

const PAYMENT_MODES = ['Cash', 'Bank', 'UPI'];

export default function ExpenseTracking() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    referenceNumber: '',
    notes: '',
  });

  // Fetch expenses on mount
  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expenses');
      if (!response.ok) throw new Error('Failed to fetch expenses');

      const data = await response.json();
      setExpenses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export expenses to CSV
  const handleExportExpenses = () => {
    if (expenses.length === 0) {
      alert('No expenses to export');
      return;
    }

    const headers = ['Category', 'Title', 'Amount', 'Date', 'Payment Mode', 'Reference Number', 'Notes'];
    const rows = expenses.map(exp => [
      exp.category,
      exp.title,
      formatCurrencyForCSV(exp.amount),
      formatDateForCSV(exp.expenseDate),
      exp.paymentMode,
      exp.referenceNumber || '',
      exp.notes || '',
    ]);

    const filename = `Expenses_${new Date().toISOString().split('T')[0]}`;
    exportToCSV({ filename, headers, rows });
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate required fields
      if (
        !formData.category ||
        !formData.title ||
        !formData.amount ||
        !formData.expenseDate ||
        !formData.paymentMode
      ) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate amount
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create expense');
      }

      setSuccessMessage('Expense added successfully!');
      setFormData({
        category: '',
        title: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Cash',
        referenceNumber: '',
        notes: '',
      });
      setShowForm(false);
      await fetchExpenses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Tracking</h1>
            <p className="text-gray-600 mt-1">Manage and track all business expenses</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExpenses}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            >
              📥 Export CSV
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancel' : 'Add Expense'}
            </button>
          </div>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Add New Expense</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Category</option>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description / Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g., Monthly Rent Payment"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Expense Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    name="expenseDate"
                    value={formData.expenseDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Payment Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PAYMENT_MODES.map(mode => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    name="referenceNumber"
                    value={formData.referenceNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., CHQ-123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Expenses</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{expenses.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Average Expense</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                expenses.length > 0 ? totalExpenses / expenses.length : 0
              )}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && <p className="text-center text-gray-600">Loading expenses...</p>}

        {/* Expenses Table */}
        {!loading && expenses.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Payment Mode
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Reference
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense, index) => (
                    <tr
                      key={expense.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.title}
                        {expense.notes && (
                          <p className="text-xs text-gray-600 mt-1">{expense.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.paymentMode}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {expense.referenceNumber || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg">No expenses recorded yet</p>
              <p className="text-gray-500 text-sm mt-1">
                Click "Add Expense" to create your first expense entry
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
