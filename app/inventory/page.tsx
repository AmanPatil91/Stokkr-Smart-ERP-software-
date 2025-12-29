import Link from 'next/link';

export default function InventoryMainPage() {
  const tasks = [
    { href: '/inventory/products', icon: '📊', label: 'View Inventory Products', desc: 'Search and filter products' },
    { href: '/products/new', icon: '➕', label: 'Add New Product Type', desc: 'Create a new product' },
    { href: '/inventory/add-batch', icon: '📦', label: 'Add Stock in Batches', desc: 'Update inventory' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-2">Manage products and stock levels</p>
        </div>

        {/* Task Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((task) => (
            <Link
              key={task.href}
              href={task.href}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 hover:border-gray-200"
            >
              <div className="text-4xl mb-4">{task.icon}</div>
              <h3 className="font-semibold text-gray-900 text-lg">{task.label}</h3>
              <p className="text-gray-500 text-sm mt-2">{task.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}