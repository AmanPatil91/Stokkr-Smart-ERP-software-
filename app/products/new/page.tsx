'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hsnCategories, getHsnCodesByCategory, HSNCategory, HSNCode, getHsnData } from '@/lib/hsn-data';

export default function AddProductPage() {
  const router = useRouter();

  // Basic Info
  const [productName, setProductName] = useState('');
  const [productId, setProductId] = useState('');

  // HSN & Tax Logic
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedHsn, setSelectedHsn] = useState<string>('');
  const [description, setDescription] = useState('');

  const [gstRate, setGstRate] = useState<number | ''>('');
  const [cgstRate, setCgstRate] = useState<number | ''>('');
  const [sgstRate, setSgstRate] = useState<number | ''>('');
  const [igstRate, setIgstRate] = useState<number | ''>('');
  const [price, setPrice] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');

  const [manualOverride, setManualOverride] = useState(false);

  // Alerts
  const [expiryAlertDays, setExpiryAlertDays] = useState('7');
  const [lowStockAlertQty, setLowStockAlertQty] = useState('10');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived Available HSNs
  const availableHsns = getHsnCodesByCategory(selectedCategory);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // Reset HSN and tax selection when category changes unless in manual override
    if (!manualOverride) {
      setSelectedHsn('');
      setDescription('');
      setGstRate('');
      setCgstRate('');
      setSgstRate('');
      setIgstRate('');
    }
  };

  const handleHsnChange = (hsnCode: string) => {
    setSelectedHsn(hsnCode);

    if (!manualOverride) {
      const data = getHsnData(hsnCode);
      if (data) {
        setDescription(data.description);
        setGstRate(data.gstRate);
        setCgstRate(data.cgstRate);
        setSgstRate(data.sgstRate);
        setIgstRate(data.igstRate);
      }
    }
  };

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
          description: description,
          hsnCode: selectedHsn || undefined,
          category: selectedCategory || undefined,
          gstRate: gstRate === '' ? undefined : gstRate,
          cgstRate: cgstRate === '' ? undefined : cgstRate,
          sgstRate: sgstRate === '' ? undefined : sgstRate,
          igstRate: igstRate === '' ? undefined : igstRate,
          price: price === '' ? 0 : price,
          cost: cost === '' ? 0 : cost,
          expiryAlertDays: parseInt(expiryAlertDays),
          lowStockAlertQty: parseInt(lowStockAlertQty),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      router.push('/inventory');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600 mt-2">Create a new product in your inventory</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        {/* Form Card */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">1. Basic Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Product Name</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required
                    placeholder="e.g., Laptop Pro"
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Selling Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={cost}
                    onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                    required
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* HSN & Tax Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-800">2. Tax & Classification (HSN)</h2>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manualOverride"
                    checked={manualOverride}
                    onChange={(e) => setManualOverride(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="manualOverride" className="text-sm text-gray-600 font-medium cursor-pointer">
                    Manual Override
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                {/* Step 1: Category */}
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Step 1: Category</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">-- Optional Category --</option>
                    {hsnCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Step 2: HSN Code (Filtered) */}
                <div>
                  <label className="block text-gray-900 font-semibold mb-2">Step 2: HSN Code</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    value={selectedHsn}
                    onChange={(e) => handleHsnChange(e.target.value)}
                    disabled={!selectedCategory && !manualOverride}
                  >
                    <option value="">-- Select HSN Code --</option>
                    {availableHsns.map((hsn) => (
                      <option key={hsn.hsnCode} value={hsn.hsnCode}>
                        {hsn.hsnCode} — {hsn.description} ({hsn.gstRate}%)
                      </option>
                    ))}
                  </select>
                  {!selectedCategory && !manualOverride && (
                    <p className="text-xs text-gray-500 mt-1">Select a category first to filter HSN codes.</p>
                  )}
                </div>
              </div>

              {/* Auto-filled Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="md:col-span-2">
                  <label className="block text-gray-900 font-semibold mb-2">Description</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!manualOverride ? 'bg-gray-100 text-gray-700' : ''}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    readOnly={!manualOverride}
                    placeholder="e.g., Mobile Phones"
                  />
                </div>

                <div>
                  <label className="block text-gray-900 font-semibold mb-2">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!manualOverride ? 'bg-gray-100 text-gray-700' : ''}`}
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value ? Number(e.target.value) : '')}
                    readOnly={!manualOverride}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-gray-700 font-semibold mb-2 text-center">CGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full px-2 py-2 border border-gray-300 rounded-lg text-center text-sm ${!manualOverride ? 'bg-gray-100' : ''}`}
                      value={cgstRate}
                      onChange={(e) => setCgstRate(e.target.value ? Number(e.target.value) : '')}
                      readOnly={!manualOverride}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 font-semibold mb-2 text-center">SGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full px-2 py-2 border border-gray-300 rounded-lg text-center text-sm ${!manualOverride ? 'bg-gray-100' : ''}`}
                      value={sgstRate}
                      onChange={(e) => setSgstRate(e.target.value ? Number(e.target.value) : '')}
                      readOnly={!manualOverride}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-700 font-semibold mb-2 text-center">IGST (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className={`w-full px-2 py-2 border border-gray-300 rounded-lg text-center text-sm ${!manualOverride ? 'bg-gray-100' : ''}`}
                      value={igstRate}
                      onChange={(e) => setIgstRate(e.target.value ? Number(e.target.value) : '')}
                      readOnly={!manualOverride}
                    />
                  </div>
                </div>
              </div>
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
