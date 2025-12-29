'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type Invoice = {
  id: string;
  totalAmount: number;
  date: string;
};

type Expense = {
  id: string;
  amount: number;
  expenseDate: string;
};

type PLStatement = {
  sales: number;
  expenses: number;
  operatingProfit: number;
  otherIncome: number;
  interestCost: number;
  profitBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  netProfit: number;
};

export default function ProfitLossPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month/Year selection - default to current
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // P&L configurable fields
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [interestCost, setInterestCost] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST/Tax

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invoicesRes, expensesRes] = await Promise.all([
        fetch('/api/accounts-receivable'),
        fetch('/api/expenses'),
      ]);

      if (!invoicesRes.ok || !expensesRes.ok) {
        throw new Error('Failed to fetch financial data');
      }

      const invoicesData = await invoicesRes.json();
      const expensesData = await expensesRes.json();

      // Extract invoice data with proper structure
      const formattedInvoices = invoicesData.map((rec: any) => ({
        id: rec.invoiceId,
        totalAmount: Number(rec.totalAmount) || 0,
        date: rec.invoice?.date || new Date().toISOString(),
      }));

      // Extract expense data
      const formattedExpenses = expensesData.map((exp: any) => ({
        id: exp.id,
        amount: Number(exp.amount) || 0,
        expenseDate: exp.expenseDate,
      }));

      setInvoices(formattedInvoices);
      setExpenses(formattedExpenses);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices and expenses by selected month/year
  const getInvoicesForMonth = (): Invoice[] => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.date);
      return (
        invDate.getMonth() === selectedMonth &&
        invDate.getFullYear() === selectedYear
      );
    });
  };

  const getExpensesForMonth = (): Expense[] => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.expenseDate);
      return (
        expDate.getMonth() === selectedMonth &&
        expDate.getFullYear() === selectedYear
      );
    });
  };

  // Calculate P&L statement
  const calculatePL = (): PLStatement => {
    const monthInvoices = getInvoicesForMonth();
    const monthExpenses = getExpensesForMonth();

    // Step 1: Calculate Sales (total invoices for the month)
    const sales = monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Step 2: Calculate Operating Expenses (total expenses for the month)
    const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Step 3: Operating Profit = Sales - Expenses
    const operatingProfit = sales - totalExpenses;

    // Step 4: Other Income (user configured)
    const otherIncomeValue = otherIncome || 0;

    // Step 5: Interest Cost (user configured)
    const interestCostValue = interestCost || 0;

    // Step 6: Profit Before Tax = Operating Profit + Other Income - Interest Cost
    const profitBeforeTax = operatingProfit + otherIncomeValue - interestCostValue;

    // Step 7: Tax = PBT × Tax Rate / 100
    const taxAmount = Math.max(0, profitBeforeTax * (taxRate / 100));

    // Step 8: Net Profit / Loss = PBT - Tax
    const netProfit = profitBeforeTax - taxAmount;

    return {
      sales,
      expenses: totalExpenses,
      operatingProfit,
      otherIncome: otherIncomeValue,
      interestCost: interestCostValue,
      profitBeforeTax,
      taxRate,
      taxAmount,
      netProfit,
    };
  };

  const plStatement = calculatePL();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Export P&L statement to CSV
  const handleExport = () => {
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });
    const headers = [
      'Profit & Loss Statement',
      `For the month of ${monthName} ${selectedYear}`,
      '',
      'Line Item',
      'Amount (₹)',
    ];

    const rows = [
      ['', ''],
      ['SALES', formatCurrencyForCSV(plStatement.sales)],
      ['EXPENSES', formatCurrencyForCSV(plStatement.expenses)],
      ['', ''],
      ['OPERATING PROFIT', formatCurrencyForCSV(plStatement.operatingProfit)],
      ['', ''],
      ['Other Income (Incentives/Schemes)', formatCurrencyForCSV(plStatement.otherIncome)],
      ['Less: Interest on Loans', formatCurrencyForCSV(plStatement.interestCost)],
      ['', ''],
      ['PROFIT BEFORE TAX', formatCurrencyForCSV(plStatement.profitBeforeTax)],
      ['', ''],
      [`Less: Tax @ ${plStatement.taxRate}%`, formatCurrencyForCSV(plStatement.taxAmount)],
      ['', ''],
      ['NET PROFIT / LOSS', formatCurrencyForCSV(plStatement.netProfit)],
    ];

    const filename = `ProfitLossStatement_${monthName}_${selectedYear}`;
    exportToCSV({ filename, headers, rows });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading financial data...</p>
      </div>
    );
  }

  const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Statement</h1>
          <p className="text-gray-600 mt-2">Financial performance analysis</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Month Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => ({
                  value: i,
                  label: new Date(2024, i).toLocaleString('default', { month: 'long' }),
                })).map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => ({
                  value: new Date().getFullYear() - 2 + i,
                })).map((year) => (
                  <option key={year.value} value={year.value}>
                    {year.value}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax Rate Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium"
              >
                📥 Export CSV
              </button>
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <button
                onClick={fetchData}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>

        {/* P&L Statement Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Statement Header */}
          <div className="bg-gray-50 border-b p-6">
            <h2 className="text-xl font-bold text-gray-900">Statement for {monthName} {selectedYear}</h2>
            <p className="text-sm text-gray-600 mt-1">All values in Indian Rupees (₹)</p>
          </div>

          {/* Statement Body */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {/* Sales Section */}
                <tr className="border-b border-gray-200 hover:bg-blue-50">
                  <td className="px-6 py-4 font-semibold text-gray-900 text-base">Sales</td>
                  <td className="px-6 py-4 text-right font-bold text-green-600 text-base">
                    {formatCurrency(plStatement.sales)}
                  </td>
                </tr>

                {/* Expenses Section */}
                <tr className="border-b border-gray-200 hover:bg-red-50">
                  <td className="px-6 py-4 font-semibold text-gray-900 text-base">Less: Expenses</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600 text-base">
                    ({formatCurrency(plStatement.expenses)})
                  </td>
                </tr>

                {/* Separator */}
                <tr className="border-b-2 border-gray-400 bg-gray-50">
                  <td colSpan={2} className="h-2"></td>
                </tr>

                {/* Operating Profit */}
                <tr className="border-b border-gray-200 bg-blue-50 hover:bg-blue-100">
                  <td className="px-6 py-4 font-bold text-gray-900 text-base">Operating Profit</td>
                  <td className="px-6 py-4 text-right font-bold text-blue-700 text-lg">
                    {formatCurrency(plStatement.operatingProfit)}
                  </td>
                </tr>

                {/* Other Income */}
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>Other Income (Incentives/Schemes)</span>
                      <input
                        type="number"
                        value={plStatement.otherIncome}
                        onChange={(e) => setOtherIncome(parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatCurrency(plStatement.otherIncome)}
                  </td>
                </tr>

                {/* Interest Cost */}
                <tr className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-700">
                    <div className="flex items-center gap-2">
                      <span>Less: Interest on Loans</span>
                      <input
                        type="number"
                        value={plStatement.interestCost}
                        onChange={(e) => setInterestCost(parseFloat(e.target.value) || 0)}
                        className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    ({formatCurrency(plStatement.interestCost)})
                  </td>
                </tr>

                {/* Separator */}
                <tr className="border-b-2 border-gray-400 bg-gray-50">
                  <td colSpan={2} className="h-2"></td>
                </tr>

                {/* Profit Before Tax */}
                <tr className="border-b border-gray-200 bg-purple-50 hover:bg-purple-100">
                  <td className="px-6 py-4 font-bold text-gray-900 text-base">Profit Before Tax</td>
                  <td className="px-6 py-4 text-right font-bold text-purple-700 text-lg">
                    {formatCurrency(plStatement.profitBeforeTax)}
                  </td>
                </tr>

                {/* Tax */}
                <tr className="border-b border-gray-200 hover:bg-orange-50">
                  <td className="px-6 py-4 text-gray-700">
                    Less: Tax @ {plStatement.taxRate}%
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    ({formatCurrency(plStatement.taxAmount)})
                  </td>
                </tr>

                {/* Separator */}
                <tr className="border-b-2 border-gray-400 bg-gray-50">
                  <td colSpan={2} className="h-2"></td>
                </tr>

                {/* Net Profit / Loss */}
                <tr className={`${plStatement.netProfit >= 0 ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}>
                  <td className="px-6 py-4 font-bold text-gray-900 text-lg">Net Profit / Loss</td>
                  <td className={`px-6 py-4 text-right font-bold text-lg ${
                    plStatement.netProfit >= 0 ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {plStatement.netProfit >= 0 ? '+' : ''}{formatCurrency(plStatement.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Operating Margin</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {plStatement.sales > 0
                ? ((plStatement.operatingProfit / plStatement.sales) * 100).toFixed(2)
                : '0'}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Net Profit Margin</p>
            <p className={`text-2xl font-bold mt-2 ${plStatement.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {plStatement.sales > 0
                ? ((plStatement.netProfit / plStatement.sales) * 100).toFixed(2)
                : '0'}%
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Effective Tax Rate</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {plStatement.profitBeforeTax > 0
                ? ((plStatement.taxAmount / plStatement.profitBeforeTax) * 100).toFixed(2)
                : '0'}%
            </p>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">ℹ️ Statement Notes</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>• <strong>Sales</strong>: Total invoices for the selected month</li>
            <li>• <strong>Expenses</strong>: Total operational expenses for the selected month</li>
            <li>• <strong>Other Income</strong>: Optional incentives, schemes, or other income sources (editable)</li>
            <li>• <strong>Interest Cost</strong>: Loan interest payments for the month (editable)</li>
            <li>• <strong>Tax Rate</strong>: Configurable tax percentage (currently {plStatement.taxRate}%)</li>
            <li>• <strong>Operating Margin</strong>: Operating Profit ÷ Sales × 100</li>
            <li>• <strong>Net Profit Margin</strong>: Net Profit ÷ Sales × 100</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
