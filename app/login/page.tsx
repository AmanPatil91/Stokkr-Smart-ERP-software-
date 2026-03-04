'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    // Prevent SSR hydration mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }

    async function handleAuth() {
        setError('');

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0], // Simple default
                        }
                    }
                });
                if (signUpError) throw signUpError;

                // Usually sign up requires email verification, but we'll assume auto confirm 
                // or just alert the user to check their email if so configured in Supabase.
                alert('Sign up successful! You can now log in.');
                setIsSignUp(false);
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;

                router.push('/');
                router.refresh();
            }
        } catch (e: any) {
            console.error('Supabase auth error:', e.message);
            setError(e.message || 'Auth failed');
        }
    }

    return (
        <div className="max-w-md mx-auto p-8 mt-20 border rounded shadow-sm bg-white">
            <h1 className="text-2xl font-bold mb-6 text-center">
                {isSignUp ? 'Create an Account' : 'ERP Login'}
            </h1>

            <input
                placeholder="Email"
                className="border p-2 w-full mb-4 rounded"
                autoComplete="email"
                type="email"
                onChange={e => setEmail(e.target.value)}
            />

            <input
                type="password"
                placeholder="Password"
                className="border p-2 w-full mb-6 rounded"
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
            />

            <button
                onClick={handleAuth}
                className="bg-black text-white px-4 py-2 w-full rounded hover:bg-gray-800 transition-colors"
            >
                {isSignUp ? 'Sign Up' : 'Login'}
            </button>

            {error && <p className="text-red-500 mt-4 text-center text-sm">{error}</p>}

            <div className="mt-6 text-center text-sm">
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-blue-600 hover:underline"
                >
                    {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
            </div>
        </div>
    );
}
