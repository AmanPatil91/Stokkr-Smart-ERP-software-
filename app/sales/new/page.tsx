'use client';

import { useState, useEffect } from 'react';

type Party = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
};

export default function NewSalesInvoice() {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [items, setItems] = useState([{ productId: '', quantity: 1, pricePerItem: 0, total: 0 }]);
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

        // Convert decimal strings from API to numbers for the form
        const formattedProducts = productsData.map((p: any) => ({
          ...p,
          price: Number(p.price)
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
    setItems([...items, { productId: '', quantity: 1, pricePerItem: 0, total: 0 }]);
  };

  const handleProductChange = (index: number, value: string) => {
    const newItems = [...items];
    const selectedProduct = products.find(p => p.id === value);

    if (selectedProduct) {
      newItems[index] = {
        productId: selectedProduct.id,
        quantity: 1,
        pricePerItem: selectedProduct.price,
        total: selectedProduct.price
      };
    } else {
      newItems[index] = { ...newItems[index], productId: value };
    }
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: 'quantity' | 'pricePerItem', value: any) => {
    const newItems = [...items];
    const newQuantity = field === 'quantity' ? parseInt(value) : newItems[index].quantity;
    const newPrice = field === 'pricePerItem' ? parseFloat(value) : newItems[index].pricePerItem;

    newItems[index] = { 
      ...newItems[index], 
      [field]: field === 'quantity' ? newQuantity : newPrice,
      total: (newQuantity || 0) * (newPrice || 0)
    };
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
          partyId: selectedPartyId,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            pricePerItem: item.pricePerItem
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      alert('Invoice created successfully!');
      setSelectedPartyId('');
      setItems([{ productId: '', quantity: 1, pricePerItem: 0, total: 0 }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Sales Invoice</h1>
          <p className="text-gray-600 mt-2">Add items and create an invoice</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <div className="mb-8">
            <label className="block text-gray-900 font-semibold mb-2">Select Customer</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              required
            >
              <option value="">-- Select a Customer --</option>
              {parties.map(party => (
                <option key={party.id} value={party.id}>{party.name}</option>
              ))}
            </select>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-6">Invoice Items</h2>
          <div className="space-y-4 mb-6">
            {items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === item.productId);
              return (
                <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Product</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        required
                      >
                        <option value="">-- Select a Product --</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">SKU</label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                        value={selectedProduct?.sku || ''}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Quantity</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Unit Price</label>
                      <input
                        type="number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.pricePerItem}
                        onChange={(e) => handleItemChange(index, 'pricePerItem', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Total</label>
                      <div className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 font-semibold text-gray-900">
                        ${item.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 font-semibold mb-8"
          >
            + Add Another Item
          </button>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </form>
      </div>
    </div>
  );
}