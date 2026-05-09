import React, { useState } from 'react';
import { Drama, Sparkles, Send, CheckCircle2 } from 'lucide-react';

export default function Roleplay() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');

        // Simulate API call
        setTimeout(() => {
            setStatus('success');
            setEmail('');
        }, 1500);
    };

    return (
        <div className="flex-1 w-full h-full bg-[#0a0a0a] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px]" />

            <div className="relative max-w-2xl w-full flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.4)] mb-8 animate-[bounce_3s_ease-in-out_infinite]">
                    <Drama size={40} className="text-white" />
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500 mb-6 tracking-tight">
                    Immersive Roleplay
                </h1>

                <p className="text-gray-400 text-lg md:text-xl leading-relaxed mb-10 max-w-lg mx-auto font-medium">
                    you will be able to create your own game simulation to unleash your wildest fantasies, its VR supported, solid story generation and unsencored images and videos right into game! stay tunned.
                </p>

                <div className="bg-gray-900/50 border border-gray-800 backdrop-blur-xl rounded-3xl p-6 md:p-10 w-full shadow-2xl">
                    <div className="flex items-center gap-3 justify-center mb-4">
                        <Sparkles size={20} className="text-pink-400" />
                        <h3 className="text-xl font-bold text-white tracking-tight">Early Access Preview</h3>
                    </div>
                    <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-8">
                        We are fine-tuning the foundational models for an unparalleled roleplay experience. Enter your email below to be the first to know when we go live.
                    </p>

                    {status === 'success' ? (
                        <div className="flex flex-col items-center gap-3 py-4 animate-in fade-in zoom-in duration-500">
                            <CheckCircle2 size={48} className="text-green-500" />
                            <p className="text-white font-bold text-lg">You're on the list!</p>
                            <p className="text-gray-500 text-sm">We'll catch you on the flip side.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address"
                                required
                                className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                            >
                                {status === 'loading' ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Join Waitlist
                                        <Send size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

