import Link from 'next/link';

export default function HomePage() {
  const modules = [
    { href: '/parties', label: 'Manage Parties', icon: '👥', desc: 'Customers & Suppliers' },
    { href: '/sales/new', label: 'Create Sales Invoice', icon: '📋', desc: 'New Invoice' },
    { href: '/inventory', label: 'Manage Inventory', icon: '📦', desc: 'Stock & Products' },
    { href: '/accounts-receivable', label: 'Accounts Receivable', icon: '💰', desc: 'Customer Payments' },
    { href: '/accounts-payable', label: 'Accounts Payable', icon: '💳', desc: 'Supplier Payments' },
    { href: '/expenses', label: 'Track Expenses', icon: '💸', desc: 'Expense Management' },
    { href: '/reports/cash-flow', label: 'Cash Flow', icon: '🌊', desc: 'Monthly Cash Movements' },
    { href: '/reports/general-ledger', label: 'General Ledger', icon: '📖', desc: 'Financial Record View' },
    { href: '/dashboard', label: 'View Dashboard', icon: '📊', desc: 'Analytics' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to your ERP</h1>
          <p className="text-gray-600 mt-2">Manage your business operations efficiently</p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 hover:border-gray-200 cursor-pointer"
            >
              <div className="text-3xl mb-3">{module.icon}</div>
              <h3 className="font-semibold text-gray-900 text-lg">{module.label}</h3>
              <p className="text-gray-500 text-sm mt-1">{module.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}