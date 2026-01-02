
'use client';

import { useState, useMemo } from 'react';
import { calculateGST, DEFAULT_GST_RATE } from '@/lib/gstUtils';

export default function NewSalesInvoice() {
  const [partyId, setPartyId] = useState('');
  const [customerState, setCustomerState] = useState('Maharashtra'); // Default state
  const [items, setItems] = useState([
    { productId: '', quantity: 1, pricePerItem: 0, gstRate: DEFAULT_GST_RATE },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gstSummary = useMemo(() => {
    return items.reduce((acc, item) => {
      const calc = calculateGST(item.quantity, item.pricePerItem, 'Maharashtra', customerState, item.gstRate);
      return {
        taxableValue: acc.taxableValue + (calc.taxableValue || 0),
        cgst: acc.cgst + (calc.cgst || 0),
        sgst: acc.sgst + (calc.sgst || 0),
        igst: acc.igst + (calc.igst || 0),
        total: acc.total + (calc.total || 0)
      };
    }, { taxableValue: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });
  }, [items, customerState]);

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, pricePerItem: 0, gstRate: DEFAULT_GST_RATE }]);
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
          // Total amount passed to API is ONLY the taxable value to keep accounting clean
          totalAmount: gstSummary.taxableValue, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invoice');
      }

      alert('Invoice created successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="container mx-auto p-6 max-w-4xl bg-white shadow-lg rounded-xl my-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">New GST Invoice</h1>
      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Customer ID</label>
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              placeholder="Enter Customer ID"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Customer State</label>
            <select 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              value={customerState}
              onChange={(e) => setCustomerState(e.target.value)}
            >
              <option value="Maharashtra">Maharashtra (Local)</option>
              <option value="Karnataka">Karnataka (Outstate)</option>
              <option value="Delhi">Delhi (Outstate)</option>
              <option value="Gujarat">Gujarat (Outstate)</option>
            </select>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-700 flex items-center gap-2">
            <span>📦</span> Line Items
          </h2>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm relative group">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Product ID</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
                    placeholder="Product ID"
                    value={item.productId}
                    onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Qty</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Price</label>
                  <input
                    type="number"
                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
                    placeholder="Price"
                    value={item.pricePerItem}
                    onChange={(e) => handleItemChange(index, 'pricePerItem', parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div className="w-24">
                  <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">GST %</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none bg-white"
                    value={item.gstRate}
                    onChange={(e) => handleItemChange(index, 'gstRate', parseInt(e.target.value))}
                  >
                    {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="mt-4 flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors"
          >
            <span className="text-xl">+</span> Add Another Item
          </button>
        </div>

        <div className="border-t pt-6 bg-gray-50 -mx-6 px-6 rounded-b-xl border-gray-200">
          <div className="max-w-xs ml-auto space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (Taxable):</span>
              <span className="font-semibold">{formatCurrency(gstSummary.taxableValue)}</span>
            </div>
            {gstSummary.cgst > 0 && (
              <>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>CGST:</span>
                  <span className="font-medium">{formatCurrency(gstSummary.cgst)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm">
                  <span>SGST:</span>
                  <span className="font-medium">{formatCurrency(gstSummary.sgst)}</span>
                </div>
              </>
            )}
            {gstSummary.igst > 0 && (
              <div className="flex justify-between text-gray-600 text-sm">
                <span>IGST:</span>
                <span className="font-medium">{formatCurrency(gstSummary.igst)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-blue-900 border-t pt-3 mt-3">
              <span>Grand Total:</span>
              <span>{formatCurrency(gstSummary.total)}</span>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 transform hover:-translate-y-1 transition-all disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Generate GST Invoice'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
