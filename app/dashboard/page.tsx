'use client';

import { useState, useEffect } from 'react';

type SalesSummary = {
  totalSales: number;
};

type StockItem = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<SalesSummary | null>(null);
  const [stockData, setStockData] = useState<StockItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesResponse, stockResponse] = await Promise.all([
          fetch('/api/reports/sales-summary'),
          fetch('/api/reports/stock-summary'),
        ]);

        if (!salesResponse.ok || !stockResponse.ok) {
          throw new Error('Failed to fetch dashboard data.');
        }

        const sales = await salesResponse.json();
        const stock = await stockResponse.json();

        const formattedSales = {
          totalSales: sales.totalSales ? parseFloat(sales.totalSales) : 0,
        };
        
        setSalesData(formattedSales);
        setStockData(stock);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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