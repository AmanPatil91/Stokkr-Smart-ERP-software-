'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');

  const askAI = async (q: string) => {
    setLoading(true);
    setInsight('');
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      setInsight(data.insight);
    } catch (err) {
      setInsight('Failed to fetch insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modules = [
    { href: '/parties', label: 'Manage Parties', icon: '👥', desc: 'Customers & Suppliers' },
    { href: '/sales/new', label: 'Create Sales Invoice', icon: '📋', desc: 'New Invoice' },
    { href: '/inventory', label: 'Manage Inventory', icon: '📦', desc: 'Stock & Products' },
    { href: '/accounts-receivable', label: 'Accounts Receivable', icon: '💰', desc: 'Customer Payments' },
    { href: '/accounts-payable', label: 'Accounts Payable', icon: '💳', desc: 'Supplier Payments' },
    { href: '/expenses', label: 'Track Expenses', icon: '💸', desc: 'Expense Management' },
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

        {/* Business Insights Assistant Section */}
        <div className="mb-12 bg-white rounded-xl shadow-sm border border-indigo-100 p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Business Insights Assistant</h2>
              <p className="text-sm text-gray-500 italic">"AI-generated insights for informational purposes only."</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Quick Questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "Summarize expenses this month",
                  "Top customers by outstanding",
                  "Why is cash lower than profit?",
                  "Explain why profit changed"
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setQuestion(q); askAI(q); }}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question about your business..."
                  className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  onClick={() => askAI(question)}
                  disabled={loading || !question}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-bold disabled:bg-gray-300 hover:bg-indigo-700 transition-colors"
                >
                  Ask
                </button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 min-h-[150px] border border-gray-100 flex flex-col justify-center">
              {loading ? (
                <div className="flex items-center justify-center gap-3 text-indigo-600">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Analysing your data...</span>
                </div>
              ) : insight ? (
                <div className="prose prose-sm text-gray-700 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {insight}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center italic">
                  Select a quick question or type your own to get instant business insights.
                </p>
              )}
            </div>
          </div>
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