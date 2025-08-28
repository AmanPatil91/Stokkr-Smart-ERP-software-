'use client';

import { useState, useEffect } from 'react';

type Party = {
  id: string;
  name: string;
  partyType: string;
};

type Product = {
  id: string;
  name: string;
  cost: number;
};

export default function NewPurchaseInvoice() {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, costPerItem: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesResponse, productsResponse] = await Promise.all([
          fetch('/api/parties'),
          fetch('/api/products'),
        ]);

        if (!partiesResponse.ok || !productsResponse.ok) {
          throw new Error('Failed to fetch data.');
        }

        const partiesData = await partiesResponse.json();
        const productsData = await productsResponse.json();

        const formattedProducts = productsData.map((p: any) => ({
          ...p,
          cost: Number(p.cost)
        }));

        setParties(partiesData);
        setProducts(formattedProducts);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, costPerItem: 0 }]);
  };

  const handleProductChange = (index: number, value: string) => {
    const newItems = [...items];
    const selectedProduct = products.find(p => p.id === value);

    if (selectedProduct) {
      newItems[index] = {
        productId: selectedProduct.id,
        quantity: 1,
        costPerItem: selectedProduct.cost
      };
    } else {
      newItems[index] = { ...newItems[index], productId: value };
    }
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: 'quantity' | 'costPerItem', value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyId: selectedPartyId,
          items,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase invoice');
      }

      alert('Purchase invoice created successfully!');
      setSelectedPartyId('');
      setItems([{ productId: '', quantity: 1, costPerItem: 0 }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">New Purchase Invoice</h1>
      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Supplier</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            required
          >
            <option value="">-- Select a Supplier --</option>
            {parties.filter(p => p.partyType === 'SUPPLIER').map(party => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-xl font-semibold mb-2">Invoice Items</h2>
        {items.map((item, index) => (
          <div key={index} className="flex space-x-4 mb-4">
            <select
              className="flex-1 p-2 border border-gray-300 rounded"
              value={item.productId}
              onChange={(e) => handleProductChange(index, e.target.value)}
              required
            >
              <option value="">-- Select a Product --</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
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
              placeholder="Cost"
              value={item.costPerItem}
              onChange={(e) => handleItemChange(index, 'costPerItem', parseFloat(e.target.value))}
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
            className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Purchase'}
          </button>
        </div>
      </form>
    </div>
  );
}