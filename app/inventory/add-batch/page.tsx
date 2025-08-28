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
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all necessary data on page load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, partiesResponse, stockResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/parties'),
          fetch('/api/reports/stock-summary'),
        ]);

        const productsData = await productsResponse.json();
        const partiesData = await partiesResponse.json();
        const stockData = await stockResponse.json();

        setProducts(productsData);
        setSuppliers(partiesData.filter((p: Party) => p.partyType === 'SUPPLIER'));
        setStockSummary(stockData);
        
        if (productsData.length > 0) {
          setSelectedProductId(productsData[0].id);
        }
        if (partiesData.length > 0) {
          setSelectedSupplierId(partiesData.filter((p: Party) => p.partyType === 'SUPPLIER')[0].id);
        }
      } catch (err) {
        setError('Failed to fetch data.');
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsedQuantity = quantity ? parseInt(quantity) : 0;
    const parsedCost = cost ? parseFloat(cost) : 0;

    try {
      const response = await fetch('/api/inventory/add-stock', {
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

      const updatedStockResponse = await fetch('/api/reports/stock-summary');
      const updatedStockData = await updatedStockResponse.json();
      setStockSummary(updatedStockData);

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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Add Stock in Batches</h1>

      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}

      <div className="grid grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add New Batch</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700">Product</label>
              <select
                className="w-full p-2 border rounded"
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

            <div className="mb-4">
              <label className="block text-gray-700">Supplier</label>
              <select
                className="w-full p-2 border rounded"
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

            <div className="mb-4">
              <label className="block text-gray-700">Batch No.</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700">Quantity</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700">Cost per Item</label>
              <input
                type="number"
                className="w-full p-2 border rounded"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700">Expiry Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Batch'}
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Current Stock</h2>
          {stockSummary.length === 0 ? (
            <p className="text-gray-500">No stock data found.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockSummary.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.currentStock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}