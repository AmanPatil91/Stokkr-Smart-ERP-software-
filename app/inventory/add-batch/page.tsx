'use client';

import { useState, useEffect } from 'react';

type Product = {
  id: string;
  name: string;
  sku: string;
};

type Party = {
  id: string;
  name: string;
  partyType: string;
};

type StockItem = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

export default function AddStockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Party[]>([]);
  const [stockSummary, setStockSummary] = useState<StockItem[]>([]);
  
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [expiry, setExpiry] = useState('');

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchInitialData = async () => {
    setInitialLoading(true);
    try {
      const [productsResponse, partiesResponse, stockResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/parties'),
        fetch('/api/reports/stock-summary'),
      ]);

      const productsData = await productsResponse.json();
      const partiesData = await partiesResponse.json();
      const stockData = await stockResponse.json();

      if (Array.isArray(productsData)) {
        setProducts(productsData);
      } else {
        setError('Invalid products data received from API.');
        setProducts([]);
      }

      if (Array.isArray(partiesData)) {
        setSuppliers(partiesData.filter((p: Party) => p.partyType === 'SUPPLIER'));
      } else {
        setError('Invalid parties data received from API.');
        setSuppliers([]);
      }
      
      if (Array.isArray(stockData)) {
        setStockSummary(stockData);
      } else {
        setError('Invalid stock summary data received from API.');
        setStockSummary([]);
      }
      
      if (productsData.length > 0) {
        setSelectedProductId(productsData[0].id);
      }
      if (partiesData.length > 0) {
        setSelectedSupplierId(partiesData.filter((p: Party) => p.partyType === 'SUPPLIER')[0].id);
      }
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedQuantity = quantity ? parseInt(quantity) : 0;
    const parsedCost = cost ? parseFloat(cost) : 0;

    try {
      const response = await fetch('/api/inventory/add-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: selectedProductId, 
          batchNo, 
          quantity: parsedQuantity,
          cost: parsedCost,
          supplierId: selectedSupplierId, 
          expiry: new Date(expiry).toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add stock batch');
      }

      await fetchInitialData();
      
      setSelectedProductId('');
      setSelectedSupplierId('');
      setBatchNo('');
      setQuantity('');
      setCost('');
      setExpiry('');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Loading...</p></div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Add Stock in Batches</h1>
          <p className="text-gray-600 mt-2">Add inventory from suppliers in batches</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form to Add Stock in a New Batch */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add New Batch</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Product</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                >
                  <option value="">-- Select a Product --</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Supplier</label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  required
                >
                  <option value="">-- Select a Supplier --</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Batch Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g., BATCH-001"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Quantity</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Cost per Item</label>
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-gray-900 font-semibold mb-2">Expiry Date</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors mt-2"
                disabled={loading || initialLoading}
              >
                {loading ? 'Adding...' : 'Add Batch'}
              </button>
            </form>
          </div>

          {/* Stock Summary List */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Current Stock</h2>
            {stockSummary.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No stock data found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Current Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockSummary.map((item, idx) => (
                      <tr key={item.id} className={idx !== (stockSummary.length - 1) ? 'border-b border-gray-100' : ''}>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900">{item.name}</td>
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
    </div>
  );
}