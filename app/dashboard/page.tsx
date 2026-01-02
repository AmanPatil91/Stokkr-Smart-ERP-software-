'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type SalesSummary = {
  totalSales: number;
};

type StockItem = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

type ExpiringBatch = {
  id: string;
  batchNumber: string;
  productName: string;
  expiryDate: string;
  remainingDays: number;
  status: 'EXPIRING_SOON' | 'EXPIRED';
};

type LowStockProduct = {
  id: string;
  name: string;
  totalStock: number;
  alertThreshold: number;
};

type MonthlyPL = {
  month: string;
  totalRevenue: number;
  totalExpenses: number;
  netProfitLoss: number;
};

type FinancialHealth = {
  month: string;
  totalSales: string;
  totalExpenses: string;
  netProfitLoss: string;
  outstandingAmount: string;
  totalReceivable: string;
  totalPayable: string;
};

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesSummary | null>(null);
  const [stockData, setStockData] = useState<StockItem[] | null>(null);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [monthlyPL, setMonthlyPL] = useState<MonthlyPL | null>(null);
  const [financialHealth, setFinancialHealth] = useState<FinancialHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Month selector state - default to current month
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());

  // Fetch financial health data based on selected month
  const fetchFinancialHealth = async (month: number, year: number) => {
    try {
      const response = await fetch(`/api/reports/financial-health?month=${month}&year=${year}`);
      if (!response.ok) throw new Error('Failed to fetch financial health data');
      const data = await response.json();
      setFinancialHealth(data);
    } catch (err: any) {
      console.error('Error fetching financial health:', err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesResponse, stockResponse, alertsResponse, plResponse] = await Promise.all([
          fetch('/api/reports/sales-summary'),
          fetch('/api/reports/stock-summary'),
          fetch('/api/alerts'),
          fetch('/api/reports/monthly-pl'),
        ]);

        if (!salesResponse.ok || !stockResponse.ok || !alertsResponse.ok || !plResponse.ok) {
          throw new Error('Failed to fetch dashboard data.');
        }

        const sales = await salesResponse.json();
        const stock = await stockResponse.json();
        const alerts = await alertsResponse.json();
        const pl = await plResponse.json();

        const formattedSales = {
          totalSales: sales.totalSales ? parseFloat(sales.totalSales) : 0,
        };
        
        setSalesData(formattedSales);
        setStockData(stock);
        setExpiringBatches(alerts.expiringBatches || []);
        setLowStockProducts(alerts.lowStockProducts || []);
        setMonthlyPL(pl);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    // Fetch financial health for current month on load
    fetchFinancialHealth(selectedMonth, selectedYear);
  }, []);

  // Handle month change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setSelectedMonth(newMonth);
    fetchFinancialHealth(newMonth, selectedYear);
  };

  // Handle year change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setSelectedYear(newYear);
    fetchFinancialHealth(selectedMonth, newYear);
  };

  // Export P&L to CSV
  const handleExportPL = () => {
    if (!financialHealth) {
      alert('No financial data to export');
      return;
    }

    const headers = ['Month', 'Total Sales', 'Total Expenses', 'Net Profit / Loss'];
    const rows = [
      [
        financialHealth.month,
        formatCurrencyForCSV(financialHealth.totalSales),
        formatCurrencyForCSV(financialHealth.totalExpenses),
        formatCurrencyForCSV(financialHealth.netProfitLoss),
      ],
    ];

    const filename = `ProfitLoss_${new Date().toISOString().split('T')[0]}`;
    exportToCSV({ filename, headers, rows });
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Loading dashboard...</p></div>;
  if (error) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-red-600">Error: {error}</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your business metrics</p>
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <div className="flex gap-3 flex-wrap">
            <a
              href="/reports/profit-loss"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
            >
              📊 View P&L Statement
            </a>
            <a
              href="/reports/cash-flow"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              🌊 View Cash Flow
            </a>
            <a
              href="/reports/general-ledger"
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition text-sm font-medium"
            >
              📖 View General Ledger
            </a>
            <a
              href="/reports/credit-risk"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition text-sm font-medium"
            >
              🛡️ Credit & Risk
            </a>
            <a
              href="/reports/balance-sheet"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-sm font-medium"
            >
              ⚖️ Balance Sheet
            </a>
            <a
              href="/reports/reconciliation"
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition text-sm font-medium"
            >
              🔄 Cash vs Profit
            </a>
            <a
              href="/reports/exception-reports"
              className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition text-sm font-medium"
            >
              🚨 Exception Reports
            </a>
            <a
              href="/reports/party-performance"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium"
            >
              📈 Party Performance
            </a>
            <a
              href="/reports/trial-balance"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium"
            >
              ⚖️ Trial Balance
            </a>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ${salesData?.totalSales ? salesData.totalSales.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stockData?.length || 0}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Stock</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stockData?.reduce((sum, item) => sum + item.currentStock, 0) || 0}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>
        </div>

        {/* Financial Health Section with Month Selector */}
        {financialHealth && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6 mb-8">
            {/* Month Selector */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">📈 Financial Health</h2>
              <div className="flex gap-3 items-end">
                <button
                  onClick={handleExportPL}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  📥 Export P&L CSV
                </button>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:border-blue-500"
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
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                  <select
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:border-blue-500"
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
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-gray-600 text-sm font-medium">Total Sales</p>
                <p className="text-xl font-bold text-green-600 mt-2">
                  ₹{parseFloat(financialHealth.totalSales).toFixed(2)}
                </p>
              </div>

              {/* Total Expenses */}
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                <p className="text-xl font-bold text-red-600 mt-2">
                  ₹{parseFloat(financialHealth.totalExpenses).toFixed(2)}
                </p>
              </div>

              {/* Net Profit/Loss */}
              <div className={`bg-white rounded-lg p-4 border-2 ${parseFloat(financialHealth.netProfitLoss) >= 0 ? 'border-green-400' : 'border-red-400'}`}>
                <p className="text-gray-600 text-sm font-medium">Net Profit/Loss</p>
                <p className={`text-xl font-bold mt-2 ${parseFloat(financialHealth.netProfitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {parseFloat(financialHealth.netProfitLoss) >= 0 ? '+' : ''}₹{parseFloat(financialHealth.netProfitLoss).toFixed(2)}
                </p>
              </div>

              {/* Outstanding Amount */}
              <div className={`bg-white rounded-lg p-4 border-2 ${parseFloat(financialHealth.outstandingAmount) >= 0 ? 'border-blue-400' : 'border-orange-400'}`}>
                <p className="text-gray-600 text-sm font-medium">Outstanding Amount</p>
                <p className={`text-xl font-bold mt-2 ${parseFloat(financialHealth.outstandingAmount) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                  {parseFloat(financialHealth.outstandingAmount) >= 0 ? '+' : ''}₹{parseFloat(financialHealth.outstandingAmount).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Receivable - Payable</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-gray-600">Total Receivable (Customer Debt)</p>
                <p className="font-semibold text-gray-900">₹{parseFloat(financialHealth.totalReceivable).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-gray-600">Total Payable (Supplier Debt)</p>
                <p className="font-semibold text-gray-900">₹{parseFloat(financialHealth.totalPayable).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Alerts */}
        {(expiringBatches.length > 0 || lowStockProducts.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Expiring Soon Batches */}
            {expiringBatches.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-900 mb-4">⏰ Expiring Soon Batches</h3>
                <div className="space-y-3">
                  {expiringBatches.map((batch) => (
                    <div key={batch.id} className="bg-white p-4 rounded border border-orange-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{batch.productName}</p>
                          <p className="text-xs text-gray-600">Batch: {batch.batchNumber}</p>
                          <p className="text-xs text-gray-600">Expires: {new Date(batch.expiryDate).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          batch.status === 'EXPIRED' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {batch.remainingDays < 0 ? 'EXPIRED' : `${batch.remainingDays}d`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Products */}
            {lowStockProducts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4">📉 Low Stock Products</h3>
                <div className="space-y-3">
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className="bg-white p-4 rounded border border-red-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-600">Current: {product.totalStock} | Alert: {product.alertThreshold}</p>
                        </div>
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800">
                          {product.totalStock}/{product.alertThreshold}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stock Summary */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Stock Summary</h2>
          {stockData?.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No stock data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData?.map((item, idx) => (
                    <tr key={item.id} className={idx !== (stockData.length - 1) ? 'border-b border-gray-100' : ''}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.sku}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{item.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}