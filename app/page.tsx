'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function HomePage() {
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const askAI = async (q: string) => {
    if (!q.trim()) return;
    
    const userMessage = { role: 'user' as const, content: q };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      setChatHistory(prev => [...prev, { role: 'ai' as const, content: data.insight }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai' as const, content: 'Failed to fetch insights. Please try again.' }]);
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

        {/* AI Features Section */}
        {mounted && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>✨</span> AI Features
            </h2>
            <div className="grid grid-cols-1 gap-6">
              {/* Business Insights Assistant Card */}
              <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-8 flex flex-col h-[600px]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Business Insights Assistant</h2>
                    <p className="text-sm text-gray-500 italic">"AI-generated insights for informational purposes only."</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                  {/* Chat History */}
                  <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {chatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <p className="text-gray-400 text-sm italic mb-4">
                          Ask a question to get instant business insights.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          {[
                            "What are my sales this month?",
                            "Summarize expenses",
                            "Low stock products?",
                            "Top debtors?"
                          ].map((q) => (
                            <button
                              key={q}
                              onClick={() => askAI(q)}
                              className="text-xs bg-white text-indigo-700 px-3 py-2 rounded-full border border-indigo-100 hover:bg-indigo-50 transition-colors shadow-sm"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {chatHistory.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                                msg.role === 'user'
                                  ? 'bg-indigo-600 text-white rounded-tr-none'
                                  : 'bg-white text-gray-700 border border-gray-200 rounded-tl-none shadow-sm'
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {loading && (
                          <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm">
                              <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Input area */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && askAI(question)}
                      placeholder="Ask about your business..."
                      className="flex-1 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      onClick={() => askAI(question)}
                      disabled={loading || !question.trim()}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-bold disabled:bg-gray-300 hover:bg-indigo-700 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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