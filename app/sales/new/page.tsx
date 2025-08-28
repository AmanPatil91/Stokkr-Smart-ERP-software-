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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">New Sales Invoice</h1>
      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700">Customer</label>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={selectedPartyId}
            onChange={(e) => setSelectedPartyId(e.target.value)}
            required
          >
            <option value="">-- Select a Customer --</option>
            {parties.map(party => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </div>

        <h2 className="text-xl font-semibold mb-2">Invoice Items</h2>
        {items.map((item, index) => {
          const selectedProduct = products.find(p => p.id === item.productId);
          return (
            <div key={index} className="bg-gray-100 p-4 rounded-lg mb-4">
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm">Product Name</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
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
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm">SKU/Barcode</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded bg-white"
                    value={selectedProduct?.sku || ''}
                    disabled
                  />
                </div>
              </div>
              <div className="flex space-x-4 mb-4">
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm">Quantity</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm">Unit Price</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded"
                    placeholder="Price"
                    value={item.pricePerItem}
                    onChange={(e) => handleItemChange(index, 'pricePerItem', e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 text-sm">Total Price</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded bg-gray-200 font-bold"
                    value={item.total.toFixed(2)}
                    disabled
                  />
                </div>
              </div>
            </div>
          );
        })}
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
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  );
}