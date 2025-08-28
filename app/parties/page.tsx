import Link from 'next/link';

export default function PartiesMainPage() {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-6">Parties Management</h1>
      <p className="mb-8">Select a type of party to manage.</p>
      <div className="flex justify-center space-x-4">
        <Link href="/parties/customers" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Manage Customers
        </Link>
        <Link href="/parties/suppliers" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
          Manage Suppliers
        </Link>
      </div>
    </div>
  );
}