import Link from 'next/link';

export default function InventoryMainPage() {
  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-6">Inventory Management</h1>
      <p className="mb-8">Select an inventory task.</p>
      <div className="flex justify-center space-x-4">
        <Link href="/products/new" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
          Add New Product Type
        </Link>
        <Link href="/inventory/add-batch" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Add Stock in Batches
        </Link>
      </div>
    </div>
  );
}