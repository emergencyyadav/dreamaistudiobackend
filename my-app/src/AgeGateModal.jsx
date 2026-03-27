import React, { useState } from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AgeGateModal({ isOpen, onAgree, onDecline }) {
    const [showPolicies, setShowPolicies] = useState(false);

    if (!isOpen) return null;

    if (showPolicies) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowPolicies(false)} />
                <div className="relative max-w-3xl w-full bg-gray-950/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_0_1px_rgba(147,51,234,0.1),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">

                    {/* Header */}
                    <div className="bg-white/5 border-b border-white/5 p-6 flex items-center gap-4 flex-shrink-0 relative">
                        <button onClick={() => setShowPolicies(false)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-white flex items-center justify-center absolute left-6 group">
                            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="flex-1 flex justify-center items-center gap-3">
                            <ShieldCheck className="text-purple-400" size={24} />
                            <h2 className="text-xl font-black text-white tracking-tight">Policies & Agreement</h2>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-8 md:p-12 overflow-y-auto w-full custom-scrollbar bg-transparent">
                        <div className="space-y-10 text-white/50 text-sm leading-relaxed max-w-2xl mx-auto">

                            {/* Privacy Policy */}
                            <div id="privacy" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h2 className="text-3xl font-black text-white mb-3">Privacy Policy</h2>
                                <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest mb-10">Last Updated: March 24, 2026</p>

                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            1. Our "No-Sale" Commitment
                                        </h3>
                                        <p>At DreamAI Studios, we believe your private life should stay private. <strong className="text-white">We do not sell, rent, or trade your personal information, chat histories, or generated images to third parties.</strong> Your data is used exclusively to provide and improve your experience within our ecosystem.</p>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            2. Information We Collect
                                        </h3>
                                        <ul className="space-y-4 text-white/40">
                                            <li><strong className="text-white">Account Data:</strong> Email address and login credentials (stored securely via Supabase Auth).</li>
                                            <li><strong className="text-white">User-Generated Content:</strong> Chat logs, image prompts, and saved character settings.</li>
                                            <li><strong className="text-white">Technical Data:</strong> IP addresses and device identifiers to prevent fraud and ensure stability.</li>
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            3. Instant Deletion
                                        </h3>
                                        <p>We provide a <strong className="text-white">Permanent Delete</strong> feature. Clicking delete in settings initiates a cascade wipe, instantly removing every trace of your account from our systems forever.</p>
                                    </section>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/5 my-12"></div>

                            {/* Terms of Service */}
                            <div id="terms" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                <h2 className="text-3xl font-black text-white mb-8">Terms of Service</h2>

                                <div className="space-y-8">
                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
                                            Acceptance & Age
                                        </h3>
                                        <p>This platform contains adult themes. You must be at least 18 years of age to interact. By clicking "I Agree", you arrive at a legally binding verification of your age. If you are under 18, you must exit immediately.</p>
                                    </section>

                                    <section className="p-6 rounded-3xl bg-red-500/5 border border-red-500/10">
                                        <h3 className="text-red-400 font-black text-base mb-3 uppercase tracking-widest text-xs">Zero-Tolerance Policy</h3>
                                        <p className="text-red-200/60 text-xs font-medium">Any attempt to generate content involving minors, non-consensual acts, or extreme real-world violence will result in immediate permanent termination and reporting to authorities.</p>
                                    </section>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/5 my-12"></div>

                            {/* Cookie Policy */}
                            <div id="cookies" className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                <h2 className="text-3xl font-black text-white mb-3">Cookie Policy</h2>
                                <p className="text-white/20 text-[11px] font-bold uppercase tracking-widest mb-10">Last Updated: March 25, 2026</p>

                                <div className="space-y-8">
                                    <p>This Cookie Policy explains how we use cookies and similar technologies when you use our website. Cookies are small text files stored on your device that help the website function properly and improve your experience.</p>

                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            1. How We Use Cookies
                                        </h3>
                                        <div className="space-y-4">
                                            <div>
                                                <strong className="text-white block mb-1">Essential Cookies:</strong>
                                                <p>Necessary for the website to function properly (e.g., user login, session management, security). Without these, the website cannot operate correctly.</p>
                                            </div>
                                            <div>
                                                <strong className="text-white block mb-1">Performance & Analytics Cookies:</strong>
                                                <p>Help us understand how users interact with our website by collecting anonymous information (pages visited, errors encountered) to improve performance and user experience.</p>
                                            </div>
                                            <div>
                                                <strong className="text-white block mb-1">Functional Cookies:</strong>
                                                <p>Remember your preferences and settings, such as theme choice (dark/light) or specific tool preferences.</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-white font-black text-base mb-3 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            2. Third-Party Cookies & Control
                                        </h3>
                                        <p>We may allow third-party services (like authentication providers such as Google/Discord or payment providers) to place cookies on your device. You can manage or block cookies through your browser settings, though doing so may affect website functionality.</p>
                                        <p className="mt-4">If you have any questions, you can contact us at: <a href="mailto:dreamaistudio2@gmail.com" className="text-purple-400 hover:text-purple-300 transition-colors">dreamaistudio2@gmail.com</a></p>
                                    </section>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-white/5 bg-transparent flex flex-col sm:flex-row gap-4 flex-shrink-0 items-center justify-between">
                        <button
                            onClick={onDecline}
                            className="w-full sm:w-1/3 py-4 rounded-[1.25rem] border border-white/10 text-white/40 font-bold hover:bg-white/5 hover:text-white transition-all active:scale-95"
                        >
                            Exit Site
                        </button>
                        <button
                            onClick={onAgree}
                            className="w-full sm:w-2/3 py-4 rounded-[1.25rem] bg-gradient-to-r from-purple-600 via-purple-500 to-pink-600 hover:shadow-[0_10px_40px_rgba(147,51,234,0.4)] text-white font-black text-sm tracking-tight flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shimmer-btn"
                        >
                            <ShieldCheck size={20} />
                            I AM 18+ AND I AGREE
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default Sleek View
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
            <div className="relative max-w-sm w-full bg-gray-950/80 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.9),0_0_0_1px_rgba(147,51,234,0.15),inset_0_1px_0_rgba(255,255,255,0.05)] p-10 md:p-12 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">

                <div className="w-20 h-20 rounded-3xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-10 shadow-[0_0_40px_rgba(147,51,234,0.1)] relative group">
                    <div className="absolute inset-0 bg-purple-400/20 blur-xl group-hover:bg-purple-400/40 transition-all duration-700" />
                    <ShieldCheck className="text-purple-400 relative z-10" size={40} />
                </div>

                <h2 className="text-4xl font-black text-white mb-3 tracking-tight">Identity</h2>
                <p className="text-white/40 text-sm mb-12 leading-relaxed font-medium">
                    This realm contains mature themes. <br /><span className="text-white">Verify your age to proceed.</span>
                </p>

                <div className="flex flex-col w-full gap-4">
                    <button
                        onClick={onAgree}
                        className="w-full py-4 rounded-[1.25rem] bg-gradient-to-r from-purple-600 to-purple-500 hover:shadow-[0_10px_40px_rgba(147,51,234,0.4)] text-white font-black text-sm tracking-tight transition-all hover:scale-[1.02] active:scale-95"
                    >
                        I AM 18+ ENTER
                    </button>
                    <button
                        onClick={onDecline}
                        className="w-full py-4 rounded-[1.25rem] border border-white/10 text-white/30 font-bold text-sm hover:bg-white/5 hover:text-white transition-all active:scale-95"
                    >
                        EXIT
                    </button>
                </div>

                <div className="mt-8 text-[11px] text-white/40 font-semibold uppercase tracking-wider leading-relaxed">
                    By entering you accept our <br />
                    <div className="mt-2 flex items-center justify-center gap-3">
                        <button onClick={() => setShowPolicies(true)} className="underline decoration-white/20 hover:decoration-purple-400 hover:text-purple-300 transition-colors underline-offset-4">Terms of Service</button>
                        <span>•</span>
                        <button onClick={() => setShowPolicies(true)} className="underline decoration-white/20 hover:decoration-purple-400 hover:text-purple-300 transition-colors underline-offset-4">Privacy Policy</button>
                        <span>•</span>
                        <button onClick={() => setShowPolicies(true)} className="underline decoration-white/20 hover:decoration-purple-400 hover:text-purple-300 transition-colors underline-offset-4">Cookie Policy</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
