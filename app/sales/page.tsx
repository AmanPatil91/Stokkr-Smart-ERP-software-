
'use client';

import { useState } from 'react';

export default function NewSalesInvoice() {
  const [partyId, setPartyId] = useState('');
  const [items, setItems] = useState([
    { productId: '', quantity: 1, pricePerItem: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, pricePerItem: 0 }]);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyId,
          items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      // Success!
      alert('Invoice created successfully!');
      // TODO: Redirect to invoice details page or clear form
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">New Sales Invoice</h1>
      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Customer</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            placeholder="Enter Customer ID" // In a real app, this would be a dropdown
            required
          />
        </div>

        <h2 className="text-xl font-semibold mb-2">Invoice Items</h2>
        {items.map((item, index) => (
          <div key={index} className="flex space-x-4 mb-4">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded"
              placeholder="Product ID" // In a real app, this would be a search field
              value={item.productId}
              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
              required
            />
            <input
              type="number"
              className="w-20 p-2 border border-gray-300 rounded"
              placeholder="Qty"
              value={item.quantity}
              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
              required
            />
            <input
              type="number"
              className="w-28 p-2 border border-gray-300 rounded"
              placeholder="Price"
              value={item.pricePerItem}
              onChange={(e) => handleItemChange(index, 'pricePerItem', parseFloat(e.target.value))}
              required
            />
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddItem}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Add Item
        </button>

        <div className="mt-6">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}