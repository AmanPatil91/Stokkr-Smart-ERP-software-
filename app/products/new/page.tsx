'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddProductPage() {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [expiryAlertDays, setExpiryAlertDays] = useState('7');
  const [lowStockAlertQty, setLowStockAlertQty] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productName,
          sku: productId,
          description: productCategory,
          price: 0,
          cost: 0,
          expiryAlertDays: parseInt(expiryAlertDays),
          lowStockAlertQty: parseInt(lowStockAlertQty),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      setProductName('');
      setProductId('');
      setProductCategory('');
      setExpiryAlertDays('7');
      setLowStockAlertQty('10');
      router.push('/inventory');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600 mt-2">Create a new product in your inventory</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        {/* Form Card */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-900 font-semibold mb-2">Product Name</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                placeholder="e.g., Laptop"
              />
            </div>

            <div>
              <label className="block text-gray-900 font-semibold mb-2">Product ID (SKU)</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                placeholder="e.g., SKU-001"
              />
            </div>

            <div>
              <label className="block text-gray-900 font-semibold mb-2">Product Category</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="e.g., Electronics"
              />
            </div>

            {/* Alert Configuration Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-4">⚠️ Alert Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Expiry Alert Days</label>
                  <p className="text-sm text-gray-600 mb-2">Days before batch expiry to trigger alert</p>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={expiryAlertDays}
                    onChange={(e) => setExpiryAlertDays(e.target.value)}
                    min="1"
                    max="365"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Low Stock Alert Quantity</label>
                  <p className="text-sm text-gray-600 mb-2">Minimum total stock across all batches</p>
                  <input
                    type="number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={lowStockAlertQty}
                    onChange={(e) => setLowStockAlertQty(e.target.value)}
                    min="0"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Product'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
