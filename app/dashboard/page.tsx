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

        // Convert the totalSales string to a number for the component state
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

  if (loading) return <div className="p-4 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Sales Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-700">Total Sales</h2>
          <p className="text-4xl font-bold text-blue-600 mt-2">
            ${salesData?.totalSales ? salesData.totalSales.toFixed(2) : '0.00'}
          </p>
        </div>
      </div>

      {/* Stock Summary Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Stock Summary</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {stockData?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">No stock data available.</td>
              </tr>
            ) : (
              stockData?.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.currentStock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}