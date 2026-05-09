import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Check, X, User, AlertTriangle } from 'lucide-react';

export default function OnboardingModal({ session, onComplete }) {
    const [username, setUsername] = useState('');
    const [gender, setGender] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Removed automatic email-prefix extraction for privacy concerns.
    // User must actively select a compulsory unique username.

    if (!session) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const cleanUsername = username.trim();

        if (cleanUsername.length === 0) {
            setError('Username cannot be empty.');
            return;
        }
        if (cleanUsername.length > 10) {
            setError('Username must be 10 characters or less.');
            return;
        }
        if (!/^[a-zA-Z0-9]+$/.test(cleanUsername)) {
            setError('Username can only contain letters and numbers. No spaces.');
            return;
        }
        if (!gender) {
            setError('Please select your gender.');
            return;
        }

        setLoading(true);

        try {
            // Check uniqueness
            const { data: existingUsers, error: checkErr } = await supabase
                .from('users')
                .select('uuid')
                .ilike('username', cleanUsername)
                .limit(1);

            if (checkErr) throw checkErr;
            if (existingUsers && existingUsers.length > 0) {
                setError('This username is already taken. Try another.');
                setLoading(false);
                return;
            }

            // Save to Auth Metadata
            const { error: authErr } = await supabase.auth.updateUser({
                data: {
                    username: cleanUsername,
                    gender: gender,
                    onboarded: true
                }
            });
            if (authErr) throw authErr;

            // Save to users table — try update first (row may already exist from trigger)
            const { data: updated, error: updateErr } = await supabase
                .from('users')
                .update({ username: cleanUsername, gender: gender })
                .eq('uuid', session.user.id)
                .select('uuid');

            if (updateErr) {
                console.error('Update failed:', updateErr.message);
                throw new Error('Failed to save username to database: ' + updateErr.message);
            }

            // If update matched 0 rows, the user row doesn't exist yet — insert it
            if (!updated || updated.length === 0) {
                const { error: insertErr } = await supabase
                    .from('users')
                    .insert({
                        uuid: session.user.id,
                        username: cleanUsername,
                        gender: gender
                    });
                if (insertErr) {
                    console.error('Insert failed:', insertErr.message);
                    throw new Error('Failed to create user profile: ' + insertErr.message);
                }
            }

            onComplete({ username: cleanUsername, gender: gender });
        } catch (err) {
            console.error('Onboarding error:', err);
            setError(err.message || 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>

            <div className="relative w-full max-w-md bg-gray-950 border border-purple-500/20 rounded-3xl p-8 shadow-2xl shadow-purple-900/20 overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-purple-600/10 blur-[100px] rounded-full"></div>

                <div className="relative z-10">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                            <User size={32} className="text-white" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-white text-center mb-2">Welcome to DreamAI</h2>
                    <p className="text-gray-400 text-center text-sm mb-6">Let's set up your profile. You can change these later.</p>

                    {error && (
                        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2">
                            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-red-200 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Username Input */}
                        <div>
                            <label className="block text-gray-300 text-sm font-bold mb-2">Choose Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                placeholder="e.g. Alex123"
                                maxLength={10}
                            />
                            <p className="text-xs text-gray-500 mt-2">Max 10 characters. Letters and numbers only.</p>
                        </div>

                        {/* Gender Input */}
                        <div>
                            <label className="block text-gray-300 text-sm font-bold mb-2">Your Gender</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setGender('Male')}
                                    className={`py-3 rounded-xl border font-semibold transition-all ${gender === 'Male' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    Male
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setGender('Female')}
                                    className={`py-3 rounded-xl border font-semibold transition-all ${gender === 'Female' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                                >
                                    Female
                                </button>
                                {/* We can add 'Other' if wanted, but standardizes Male/Female for opposing filter */}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Used to optimize character recommendations.</p>
                        </div>

                        {/* Submit */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-xl bg-white text-black font-bold uppercase tracking-wide hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : 'Get Started'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
