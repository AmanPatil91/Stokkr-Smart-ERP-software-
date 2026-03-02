'use client';

import { useState, useEffect } from 'react';
import { formatINR } from '@/lib/currency';

type Party = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  gstRate: number | null;
};

export default function NewSalesInvoice() {
  const [parties, setParties] = useState<Party[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [isInterState, setIsInterState] = useState(false);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [items, setItems] = useState([{ productId: '', quantity: 1, pricePerItem: 0, subtotal: 0, taxAmount: 0, total: 0 }]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesResponse, productsResponse, stockResponse] = await Promise.all([
          fetch('/api/parties'),
          fetch('/api/products'),
          fetch('/api/reports/stock-summary'),
        ]);

        if (!partiesResponse.ok || !productsResponse.ok || !stockResponse.ok) {
          throw new Error('Failed to fetch data.');
        }

        const partiesData = await partiesResponse.json();
        const productsData = await productsResponse.json();
        const stockData = await stockResponse.json();

        // Convert decimal strings from API to numbers for the form
        const formattedProducts = productsData.map((p: any) => ({
          ...p,
          price: Number(p.price),
          gstRate: p.gstRate ? Number(p.gstRate) : 0
        }));

        const newStockMap: Record<string, number> = {};
        stockData.forEach((item: any) => {
          newStockMap[item.id] = item.currentStock;
        });

        setParties(partiesData);
        setProducts(formattedProducts);
        setStockMap(newStockMap);
      } catch (err: any) {
        setError(err.message);
      }
    };
    fetchData();
  }, []);

  const calculateItemRow = (product: Product | undefined, quantity: number, pricePerItem: number) => {
    const subtotal = quantity * pricePerItem;
    const gstRate = product?.gstRate || 0;
    const taxAmount = (subtotal * gstRate) / 100;
    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, pricePerItem: 0, subtotal: 0, taxAmount: 0, total: 0 }]);
  };

  const handleProductChange = (index: number, value: string) => {
    const newItems = [...items];
    const selectedProduct = products.find(p => p.id === value);

    if (selectedProduct) {
      const q = 1;
      const calc = calculateItemRow(selectedProduct, q, selectedProduct.price);

      newItems[index] = {
        productId: selectedProduct.id,
        quantity: q,
        pricePerItem: selectedProduct.price,
        ...calc
      };
    } else {
      newItems[index] = { ...newItems[index], productId: value };
    }
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: 'quantity' | 'pricePerItem', value: any) => {
    const newItems = [...items];
    const newQuantity = field === 'quantity' ? parseInt(value) || 0 : newItems[index].quantity;
    const newPrice = field === 'pricePerItem' ? parseFloat(value) || 0 : newItems[index].pricePerItem;

    const selectedProduct = products.find(p => p.id === newItems[index].productId);
    const calc = calculateItemRow(selectedProduct, newQuantity, newPrice);

    newItems[index] = {
      ...newItems[index],
      quantity: newQuantity,
      pricePerItem: newPrice,
      ...calc
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
          isInterState,
          paymentMode,
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
      setIsInterState(false);
      setPaymentMode('CASH');
      setItems([{ productId: '', quantity: 1, pricePerItem: 0, subtotal: 0, taxAmount: 0, total: 0 }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const overallSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const overallTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = overallSubtotal + overallTax;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create Sales Invoice (Tax Enabled)</h1>
          <p className="text-gray-600 mt-2">Add items, configure GST routing, and generate an invoice.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-gray-900 font-semibold mb-2">Select Customer</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

            <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col justify-center">
              <label className="text-green-900 font-semibold mb-2">Payment Mode</label>
              <select
                className="w-full px-4 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                required
              >
                <option value="CASH">Cash</option>
                <option value="CREDIT">Credit / Outstanding</option>
                <option value="UPI">UPI</option>
                <option value="BANK">Bank Transfer</option>
              </select>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center">
              <label className="text-blue-900 font-semibold mb-2">Supply Type (GST Scope)</label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsInterState(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!isInterState ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
                >
                  Intra-State (CGST + SGST)
                </button>
                <button
                  type="button"
                  onClick={() => setIsInterState(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isInterState ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 mb-6 border-b pb-2">Line Items</h2>
          <div className="space-y-4 mb-6">
            {items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === item.productId);
              return (
                <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200 shadow-sm relative">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, i) => i !== index))}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Product</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={item.productId}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        required
                      >
                        <option value="">-- Select a Product --</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.gstRate ? `(GST: ${product.gstRate}%)` : ''}
                          </option>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-gray-900 font-semibold mb-2 flex flex-col">
                        <span>Quantity</span>
                      </label>
                      <input
                        type="number"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${item.productId && item.quantity > (stockMap[item.productId] || 0)
                          ? 'border-red-500 bg-red-50 focus:ring-red-500 text-red-900'
                          : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        required
                        min="1"
                      />
                      {item.productId && stockMap[item.productId] !== undefined && (
                        <p className={`text-xs mt-1 ${item.quantity > stockMap[item.productId] ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                          Stock: {stockMap[item.productId]}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Price/Unit</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={item.pricePerItem}
                        onChange={(e) => handleItemChange(index, 'pricePerItem', e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Subtotal</label>
                      <div className="w-full px-4 py-2 border border-transparent rounded-lg bg-gray-200 text-gray-800 text-right">
                        {formatINR(item.subtotal)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-900 font-semibold mb-2">Tax ({selectedProduct?.gstRate || 0}%)</label>
                      <div className="w-full px-4 py-2 border border-transparent rounded-lg bg-blue-100 text-blue-900 text-right">
                        +{formatINR(item.taxAmount)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-gray-900 font-bold mb-2">Item Total</label>
                      <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-green-50 text-green-900 font-bold text-right">
                        {formatINR(item.total)}
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
            className="bg-gray-100 text-gray-800 border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-200 font-semibold mb-8"
          >
            + Add Another Item
          </button>

          {/* Totals Section */}
          <div className="border-t border-gray-200 pt-6 mb-8">
            <div className="max-w-xs ml-auto space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal (Before Tax)</span>
                <span>{formatINR(overallSubtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Total Tax ({isInterState ? 'IGST' : 'CGST + SGST'})</span>
                <span>{formatINR(overallTax)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-900 font-bold text-xl pt-3 border-t">
                <span>Grand Total</span>
                <div className="flex flex-col items-end">
                  <span className="text-3xl text-green-700">{formatINR(grandTotal)}</span>
                  {paymentMode === 'CREDIT' ? (
                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-1">Added to Receivables</span>
                  ) : paymentMode === 'CASH' ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded mt-1">Paid in Cash</span>
                  ) : (
                    <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded mt-1">Paid via {paymentMode}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors shadow-sm ${loading || items.some(item => item.productId && item.quantity > (stockMap[item.productId] || 0))
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            disabled={loading || items.some(item => item.productId && item.quantity > (stockMap[item.productId] || 0))}
          >
            {loading
              ? 'Processing Invoice...'
              : items.some(item => item.productId && item.quantity > (stockMap[item.productId] || 0))
                ? 'Cannot Create: Resolving Stock Issues'
                : 'Create & Save Invoice'}
          </button>
        </form>
      </div>
    </div>
  );
}