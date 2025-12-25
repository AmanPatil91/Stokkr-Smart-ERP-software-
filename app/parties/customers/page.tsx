'use client';

import { useState, useEffect } from 'react';

type Party = {
  id: string;
  name: string;
  partyType: string;
  contactNumber?: string; // 👈 Updated type
  email?: string; // 👈 Updated type
  gstin?: string;
};

export default function CustomersPage() {
  const [parties, setParties] = useState<Party[]>([]);
  const [name, setName] = useState('');
  const [contactNumber, setContactNumber] = useState(''); // 👈 New state
  const [email, setEmail] = useState(''); // 👈 New state
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParties = async () => {
    try {
      const response = await fetch('/api/parties');
      const data = await response.json();
      setParties(data.filter((p: Party) => p.partyType === 'CUSTOMER'));
    } catch (err) {
      setError('Failed to load customers.');
    }
  };

  useEffect(() => {
    fetchParties();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contactNumber, email, partyType: 'CUSTOMER', gstin }), // 👈 Updated API body
      });

      if (!response.ok) {
        throw new Error('Failed to create customer');
      }

      await fetchParties();
      setName('');
      setContactNumber(''); // 👈 Reset state
      setEmail(''); // 👈 Reset state
      setGstin('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Customers</h1>
          <p className="text-gray-600 mt-2">Add and view your customers</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form to Add a New Customer */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Add New Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Contact Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., +1234567890"
                />
              </div>
              <div>
                <label className="block text-gray-900 font-semibold mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., john@example.com"
                />
              </div>
              <div>
                <label className="block text-gray-900 font-semibold mb-2">GSTIN</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g., 18AABCT1234H1Z0"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors mt-2"
                disabled={loading}
              >
                {loading ? 'Adding...' : 'Add Customer'}
              </button>
            </form>
          </div>

          {/* List of Existing Customers */}
          <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Existing Customers</h2>
            {parties.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No customers found. Add one using the form.</p>
            ) : (
              <div className="space-y-4">
                {parties.map((party) => (
                  <div key={party.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                    <p className="font-semibold text-gray-900">{party.name}</p>
                    {party.contactNumber && <p className="text-sm text-gray-600">📞 {party.contactNumber}</p>}
                    {party.email && <p className="text-sm text-gray-600">📧 {party.email}</p>}
                    {party.gstin && <p className="text-sm text-gray-600">🏷️ {party.gstin}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}