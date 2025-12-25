import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-4xl font-bold text-gray-800 mb-4">
        Welcome to your ERP system
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Manage your business from here.
      </p>
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <Link href="/parties" className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-center">
          Manage Parties
        </Link>
        <Link href="/sales/new" className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 text-center">
          Create Sales Invoice
        </Link>
        <Link href="/inventory" className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-center">
          Manage Inventory
        </Link>
        <Link href="/dashboard" className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 text-center">
          View Dashboard
        </Link>
      </div>
    </div>
  );
}