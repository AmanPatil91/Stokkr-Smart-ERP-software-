'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type CashFlowData = {
  month: number;
  year: number;
  operatingActivities: {
    cashReceivedFromCustomers: number;
    cashPaidForExpenses: number;
    cashPaidToSuppliers: number;
    netOperatingCashFlow: number;
  };
  financingActivities: {
    loanReceived: number;
    loanRepayment: number;
    interestPaid: number;
    netFinancingCashFlow: number;
  };
  investingActivities: {
    netInvestingCashFlow: number;
  };
  netCashFlow: number;
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CashFlowPage() {
  const [cashFlowData, setCashFlowData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month/Year selection - default to current
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Fetch cash flow data whenever month/year changes
  useEffect(() => {
    fetchCashFlow();
  }, [selectedMonth, selectedYear]);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/cash-flow?month=${selectedMonth}&year=${selectedYear}`
      );

      if (!res.ok) {
        throw new Error('Failed to fetch cash flow data');
      }

      const data = await res.json();
      setCashFlowData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!cashFlowData) return;

    const data = [
      ['Cash Flow Statement', `${MONTHS[selectedMonth]} ${selectedYear}`],
      [],
      ['CASH FROM OPERATING ACTIVITIES'],
      ['Cash received from customers', formatCurrencyForCSV(cashFlowData.operatingActivities.cashReceivedFromCustomers)],
      ['Cash paid for expenses', `(${formatCurrencyForCSV(cashFlowData.operatingActivities.cashPaidForExpenses)})`],
      ['Cash paid to suppliers', `(${formatCurrencyForCSV(cashFlowData.operatingActivities.cashPaidToSuppliers)})`],
      ['Net Operating Cash Flow', formatCurrencyForCSV(cashFlowData.operatingActivities.netOperatingCashFlow)],
      [],
      ['CASH FROM FINANCING ACTIVITIES'],
      ['Loan amounts received', formatCurrencyForCSV(cashFlowData.financingActivities.loanReceived)],
      ['Loan repayments', `(${formatCurrencyForCSV(cashFlowData.financingActivities.loanRepayment)})`],
      ['Interest paid', `(${formatCurrencyForCSV(cashFlowData.financingActivities.interestPaid)})`],
      ['Net Financing Cash Flow', formatCurrencyForCSV(cashFlowData.financingActivities.netFinancingCashFlow)],
      [],
      ['NET CASH FLOW', formatCurrencyForCSV(cashFlowData.netCashFlow)],
    ];

    exportToCSV(data, `Cash-Flow-Statement-${MONTHS[selectedMonth]}-${selectedYear}.csv`);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const years = Array.from({ length: 10 }, (_, i) => 2020 + i);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Cash Flow Statement
          </h1>
          <p className="text-gray-600">
            Track actual cash movements for the selected month
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Month Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExportCSV}
                disabled={!cashFlowData || loading}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:bg-gray-400"
              >
                <span>📥</span> Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
            Failed to fetch cash flow data: {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading cash flow data...</p>
          </div>
        )}

        {/* Cash Flow Statement */}
        {cashFlowData && !loading && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Statement for {MONTHS[selectedMonth]} {selectedYear}
              </h2>
              <p className="text-sm text-gray-600">
                All values in Indian Rupees (₹)
              </p>
            </div>

            {/* Operating Activities */}
            <div className="mb-8">
              <div className="border-b-2 border-gray-300 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  CASH FROM OPERATING ACTIVITIES
                </h3>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Cash received from customers</span>
                  <span className="text-green-600 font-semibold">
                    ₹{formatCurrency(cashFlowData.operatingActivities.cashReceivedFromCustomers).slice(1)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Cash paid for expenses</span>
                  <span className="text-red-600 font-semibold">
                    (₹{formatCurrency(cashFlowData.operatingActivities.cashPaidForExpenses).slice(1)})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Cash paid to suppliers</span>
                  <span className="text-red-600 font-semibold">
                    (₹{formatCurrency(cashFlowData.operatingActivities.cashPaidToSuppliers).slice(1)})
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4 flex justify-between bg-green-50 p-4 rounded">
                <span className="font-bold text-gray-800">
                  Net Operating Cash Flow
                </span>
                <span className={`font-bold text-lg ${
                  cashFlowData.operatingActivities.netOperatingCashFlow >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  ₹{formatCurrency(cashFlowData.operatingActivities.netOperatingCashFlow).slice(1)}
                </span>
              </div>
            </div>

            {/* Financing Activities */}
            <div className="mb-8">
              <div className="border-b-2 border-gray-300 pb-4 mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  CASH FROM FINANCING ACTIVITIES
                </h3>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-700">Loan amounts received</span>
                  <span className="text-green-600 font-semibold">
                    ₹{formatCurrency(cashFlowData.financingActivities.loanReceived).slice(1)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Loan repayments</span>
                  <span className="text-red-600 font-semibold">
                    (₹{formatCurrency(cashFlowData.financingActivities.loanRepayment).slice(1)})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-700">Interest paid</span>
                  <span className="text-red-600 font-semibold">
                    (₹{formatCurrency(cashFlowData.financingActivities.interestPaid).slice(1)})
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-4 flex justify-between bg-blue-50 p-4 rounded">
                <span className="font-bold text-gray-800">
                  Net Financing Cash Flow
                </span>
                <span className={`font-bold text-lg ${
                  cashFlowData.financingActivities.netFinancingCashFlow >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  ₹{formatCurrency(cashFlowData.financingActivities.netFinancingCashFlow).slice(1)}
                </span>
              </div>
            </div>

            {/* Net Cash Flow Summary */}
            <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 rounded-lg p-6 mt-8">
              <div className="flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">
                  NET CASH FLOW FOR THE MONTH
                </span>
                <span className={`text-3xl font-bold ${
                  cashFlowData.netCashFlow >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  ₹{formatCurrency(cashFlowData.netCashFlow).slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {cashFlowData.netCashFlow >= 0
                  ? '✓ Positive cash flow - cash position improved'
                  : '⚠ Negative cash flow - cash position declined'}
              </p>
            </div>

            {/* Explanation */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 leading-relaxed">
                <strong>About this statement:</strong> This Cash Flow Statement shows actual cash movements only.
                It excludes credit sales without payment and inventory purchases. Expenses are counted only when cash
                is paid. This is independent of the P&L statement which uses accrual-based accounting.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
