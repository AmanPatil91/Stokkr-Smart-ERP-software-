import Link from 'next/link';

export default function PartiesMainPage() {
  const parties = [
    { href: '/parties/customers', icon: '🛍️', label: 'Manage Customers', desc: 'View and manage customers' },
    { href: '/parties/suppliers', icon: '🏭', label: 'Manage Suppliers', desc: 'View and manage suppliers' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Parties Management</h1>
          <p className="text-gray-600 mt-2">Manage customers and suppliers</p>
        </div>

        {/* Party Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parties.map((party) => (
            <Link
              key={party.href}
              href={party.href}
              className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100 hover:border-gray-200"
            >
              <div className="text-4xl mb-4">{party.icon}</div>
              <h3 className="font-semibold text-gray-900 text-lg">{party.label}</h3>
              <p className="text-gray-500 text-sm mt-2">{party.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}