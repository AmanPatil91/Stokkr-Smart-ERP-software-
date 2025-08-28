'use client';

import { useState, useEffect } from 'react';

type Party = {
  id: string;
  name: string;
  partyType: string;
  contactNumber?: string;
  email?: string;
  gstin?: string;
};

export default function SuppliersPage() {
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
      setParties(data.filter((p: Party) => p.partyType === 'SUPPLIER'));
    } catch (err) {
      setError('Failed to load suppliers.');
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
        body: JSON.stringify({ name, contactNumber, email, partyType: 'SUPPLIER', gstin }),
      });

      if (!response.ok) {
        throw new Error('Failed to create supplier');
      }

      await fetchParties();
      setName('');
      setContactNumber('');
      setEmail('');
      setGstin('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Supplier Management</h1>

      {error && <div className="bg-red-200 text-red-800 p-2 mb-4 rounded">{error}</div>}

      <div className="grid grid-cols-2 gap-8">
        {/* Form to Add a New Supplier */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Add New Supplier</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700">Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            {/* 👈 New input fields */}
            <div className="mb-4">
              <label className="block text-gray-700">Contact Number (Optional)</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700">Email (Optional)</label>
              <input
                type="email"
                className="w-full p-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {/* End of new fields */}
            <div className="mb-4">
              <label className="block text-gray-700">GSTIN (Optional)</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Supplier'}
            </button>
          </form>
        </div>

        {/* List of Existing Suppliers */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Existing Suppliers</h2>
          {parties.length === 0 ? (
            <p className="text-gray-500">No suppliers found. Add one using the form.</p>
          ) : (
            <ul>
              {parties.map((party) => (
                <li key={party.id} className="p-2 border-b last:border-b-0">
                  <p className="font-medium">{party.name}</p>
                  <p className="text-sm text-gray-600">ID: {party.id}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}