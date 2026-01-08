'use client';

import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export default function LoginPage() {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // ✅ Prevent SSR hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null; // or loading spinner
    }

    async function login() {
        try {
            const res = await signInWithEmailAndPassword(auth, email, password);
            const token = await res.user.getIdToken();
            localStorage.setItem('firebaseToken', token);
            window.location.href = '/';
        } catch (e: any) {
            console.error('Firebase login error:', e.code, e.message)
            setError(e.code || 'login_failed')
        }

    }

    return (
        <div className="max-w-md mx-auto p-8">
            <h1 className="text-xl mb-4">Login</h1>

            <input
                placeholder="Email"
                className="border p-2 w-full mb-2"
                autoComplete="email"
                onChange={e => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                className="border p-2 w-full mb-4"
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
            />

            <button onClick={login} className="bg-black text-white px-4 py-2">
                Login
            </button>

            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
}
