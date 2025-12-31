'use client';

import { useState, useEffect } from 'react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csvExport';

type Product = {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  expiryAlertDays: number;
  lowStockAlertQty: number;
  batches: Array<{
    id: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    costPerItem: number;
  }>;
};

type StockData = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

export default function InventoryProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<Map<string, number>>(new Map());
  const [expiryData, setExpiryData] = useState<Map<string, Date>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState(''); // Search: product name, SKU
  const [filterLowStock, setFilterLowStock] = useState(false); // Filter: low stock products
  const [filterExpiringBoon, setFilterExpiringBoon] = useState(false); // Filter: expiring soon products

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      setLoading(true);
      const [productsRes, stockRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/reports/stock-summary'),
      ]);

      if (!productsRes.ok || !stockRes.ok) {
        throw new Error('Failed to fetch inventory data');
      }

      const productsData = await productsRes.json();
      const stockDataRaw = await stockRes.json();

      // Build stock map for quick lookup
      const stockMap = new Map();
      stockDataRaw.forEach((item: StockData) => {
        stockMap.set(item.id, item.currentStock);
      });

      // Build expiry map - find earliest expiry date for each product
      const expiryMap = new Map();
      productsData.forEach((product: Product) => {
        if (product.batches && product.batches.length > 0) {
          let earliestExpiry = new Date(product.batches[0].expiryDate);
          product.batches.forEach((batch: any) => {
            const batchExpiry = new Date(batch.expiryDate);
            if (batchExpiry < earliestExpiry) {
              earliestExpiry = batchExpiry;
            }
          });
          expiryMap.set(product.id, earliestExpiry);
        }
      });

      setProducts(productsData);
      setStockData(stockMap);
      setExpiryData(expiryMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get current stock for a product
  const getCurrentStock = (productId: string): number => {
    return stockData.get(productId) || 0;
  };

  // Get earliest expiry date for a product
  const getEarliestExpiry = (productId: string): Date | null => {
    return expiryData.get(productId) || null;
  };

  // Check if product is expiring soon (within alert days)
  const isExpiringBoon = (product: Product): boolean => {
    const earliestExpiry = getEarliestExpiry(product.id);
    if (!earliestExpiry) return false;

    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (earliestExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry <= product.expiryAlertDays && daysUntilExpiry >= 0;
  };

  // Check if product has low stock
  const isLowStock = (product: Product): boolean => {
    const currentStock = getCurrentStock(product.id);
    return currentStock <= product.lowStockAlertQty;
  };

  // Filter and search logic - combines all filters and searches
  const getFilteredProducts = () => {
    return products.filter(product => {
      // Search: case-insensitive product name or SKU
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === '' ||
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower);

      // Filter: low stock products
      const matchesLowStock = !filterLowStock || isLowStock(product);

      // Filter: expiring soon products
      const matchesExpiring = !filterExpiringBoon || isExpiringBoon(product);

      return matchesSearch && matchesLowStock && matchesExpiring;
    });
  };

  // Export products to CSV
  const handleExportProducts = () => {
    const filtered = getFilteredProducts();
    if (filtered.length === 0) {
      alert('No products to export');
      return;
    }

    const headers = ['Product Name', 'SKU', 'Current Stock', 'Low Stock Alert', 'Earliest Expiry', 'Days Until Expiry', 'Status'];
    const rows = filtered.map(product => {
      const currentStock = getCurrentStock(product.id);
      const earliestExpiry = getEarliestExpiry(product.id);
      let daysUntilExpiry = '';
      let expiryDateStr = '';

      if (earliestExpiry) {
        const today = new Date();
        const daysDiff = Math.floor(
          (earliestExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        daysUntilExpiry = daysDiff.toString();
        expiryDateStr = formatDateForCSV(earliestExpiry.toISOString());
      }

      const status = isLowStock(product) ? 'Low Stock' : isExpiringBoon(product) ? 'Expiring Soon' : 'Normal';

      return [
        product.name,
        product.sku,
        currentStock.toString(),
        product.lowStockAlertQty.toString(),
        expiryDateStr,
        daysUntilExpiry,
        status,
      ];
    });

    const filename = `Inventory_${new Date().toISOString().split('T')[0]}`;
    exportToCSV({ filename, headers, rows });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (product: Product) => {
    if (isLowStock(product)) {
      return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Low Stock</span>;
    }
    if (isExpiringBoon(product)) {
      return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">Expiring Soon</span>;
    }
    return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Normal</span>;
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Products</h1>
            <p className="text-gray-600 mt-1">Monitor stock levels and product expiry dates</p>
          </div>
          <button
            onClick={handleExportProducts}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
            suppressHydrationWarning
          >
            📥 Export CSV
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Search and Filter Bar */}
        <div className="bg-white p-6 rounded-lg shadow mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search by product name or SKU */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Product name or SKU"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                suppressHydrationWarning
              />
            </div>

            {/* Filter: Low Stock */}
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLowStock}
                  onChange={(e) => setFilterLowStock(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  suppressHydrationWarning
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Low Stock Only</span>
              </label>
            </div>

            {/* Filter: Expiring Soon */}
            <div className="flex items-end">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterExpiringBoon}
                  onChange={(e) => setFilterExpiringBoon(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  suppressHydrationWarning
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Expiring Soon</span>
              </label>
            </div>
          </div>

          {/* Clear filters button */}
          {(searchTerm || filterLowStock || filterExpiringBoon) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterLowStock(false);
                setFilterExpiringBoon(false);
              }}
              className="mt-3 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Visible Products</p>
            <p className="text-2xl font-bold text-gray-900">{filteredProducts.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Low Stock</p>
            <p className="text-2xl font-bold text-red-600">{products.filter(p => isLowStock(p)).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Expiring Soon</p>
            <p className="text-2xl font-bold text-yellow-600">{products.filter(p => isExpiringBoon(p)).length}</p>
          </div>
        </div>

        {/* Loading State */}
        {loading && <p className="text-center text-gray-600">Loading inventory...</p>}

        {/* Products Table */}
        {!loading && filteredProducts.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Current Stock</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Alert Level</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Earliest Expiry</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Days Left</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product, index) => {
                    const currentStock = getCurrentStock(product.id);
                    const earliestExpiry = getEarliestExpiry(product.id);
                    let daysUntilExpiry = null;

                    if (earliestExpiry) {
                      const today = new Date();
                      daysUntilExpiry = Math.floor(
                        (earliestExpiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                      );
                    }

                    return (
                      <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{product.sku}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{currentStock}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{product.lowStockAlertQty}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {earliestExpiry ? formatDate(earliestExpiry.toISOString()) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {daysUntilExpiry !== null ? (
                            <span className={daysUntilExpiry <= 0 ? 'text-red-600 font-semibold' : ''}>
                              {daysUntilExpiry < 0 ? 'EXPIRED' : `${daysUntilExpiry} days`}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(product)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          !loading && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-600 text-lg">No products match your filters</p>
              <p className="text-gray-500 text-sm mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
