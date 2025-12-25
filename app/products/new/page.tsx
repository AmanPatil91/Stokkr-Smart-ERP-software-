'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddProductPage() {
  const router = useRouter();
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');
  const [productCategory, setProductCategory] = useState('');
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
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      setProductName('');
      setProductId('');
      setProductCategory('');
      router.push('/inventory');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Add New Product</h1>

      {error && <div className="bg-red-200 text-red-800 p-3 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">Product Name</label>
          <input
            type="text"
            className="w-full p-3 border rounded"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            placeholder="Enter product name"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">Product ID (SKU)</label>
          <input
            type="text"
            className="w-full p-3 border rounded"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            placeholder="Enter unique product ID"
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">Product Category</label>
          <input
            type="text"
            className="w-full p-3 border rounded"
            value={productCategory}
            onChange={(e) => setProductCategory(e.target.value)}
            placeholder="Enter product category"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 disabled:bg-green-300 font-semibold"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create Product'}
        </button>
      </form>
    </div>
  );
}
