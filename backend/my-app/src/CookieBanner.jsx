import React, { useState, useEffect } from 'react';
import { Shield, Check, Settings, X } from 'lucide-react';

export default function CookieBanner({ onReadPolicy }) {
    const [isVisible, setIsVisible] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    // Only configure state if we are showing the options pane
    const [preferences, setPreferences] = useState({
        essential: true, // Always true
        performance: true,
        functional: true,
        advertising: false
    });

    useEffect(() => {
        const hasConsented = localStorage.getItem('cookie_consent');
        if (!hasConsented) {
            // Slight delay so it doesn't jarringly pop up immediately on first render
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    if (!isVisible) return null;

    const handleAcceptAll = () => {
        localStorage.setItem('cookie_consent', 'all');
        setIsVisible(false);
    };

    const handleAcceptEssential = () => {
        localStorage.setItem('cookie_consent', 'essential');
        setIsVisible(false);
    };

    const handleSavePreferences = () => {
        localStorage.setItem('cookie_consent', JSON.stringify(preferences));
        setIsVisible(false);
    };

    if (showOptions) {
        return (
            <div className="fixed inset-0 z-[9900] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowOptions(false)} />
                <div className="relative w-full max-w-md bg-gray-950 border border-white/10 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Settings size={20} className="text-purple-400" />
                            Cookie Preferences
                        </h3>
                        <button onClick={() => setShowOptions(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4 mb-8">
                        {/* Essential */}
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="mt-0.5">
                                <div className="w-5 h-5 rounded bg-purple-500 flex items-center justify-center">
                                    <Check size={14} className="text-white" />
                                </div>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Essential Cookies</h4>
                                <p className="text-white/50 text-xs leading-relaxed">Required for the website to function (login, security). Cannot be disabled.</p>
                            </div>
                        </div>

                        {/* Performance */}
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                            <div className="mt-0.5 relative z-10 cursor-pointer" onClick={() => setPreferences(p => ({ ...p, performance: !p.performance }))}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${preferences.performance ? 'bg-purple-500 border-purple-500' : 'bg-transparent border-white/20'}`}>
                                    {preferences.performance && <Check size={14} className="text-white" />}
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-white font-bold text-sm mb-1">Performance & Analytics</h4>
                                <p className="text-white/50 text-xs leading-relaxed">Help us understand how you use the site so we can improve the experience.</p>
                            </div>
                            {!preferences.performance && <div className="absolute inset-0 bg-black/40 z-0" />}
                        </div>

                        {/* Functional */}
                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden">
                            <div className="mt-0.5 relative z-10 cursor-pointer" onClick={() => setPreferences(p => ({ ...p, functional: !p.functional }))}>
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${preferences.functional ? 'bg-purple-500 border-purple-500' : 'bg-transparent border-white/20'}`}>
                                    {preferences.functional && <Check size={14} className="text-white" />}
                                </div>
                            </div>
                            <div className="relative z-10">
                                <h4 className="text-white font-bold text-sm mb-1">Functional</h4>
                                <p className="text-white/50 text-xs leading-relaxed">Remember your settings like themes and chat preferences.</p>
                            </div>
                            {!preferences.functional && <div className="absolute inset-0 bg-black/40 z-0" />}
                        </div>
                    </div>

                    <button
                        onClick={handleSavePreferences}
                        className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all active:scale-95"
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[5000] p-4 pointer-events-none">
            <div className="max-w-4xl mx-auto w-full bg-gray-950/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(147,51,234,0.2)] pointer-events-auto animate-in slide-in-from-bottom-24 duration-500 flex flex-col md:flex-row gap-6 items-center">

                {/* Info block */}
                <div className="flex-1 flex items-start md:items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/20">
                        <Shield className="text-purple-400" size={24} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg mb-1">We respect your privacy</h3>
                        <p className="text-white/60 text-xs md:text-sm leading-relaxed">
                            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
                            By clicking "Accept All", you consent to our use of cookies.
                            {' '}<button onClick={onReadPolicy} className="text-purple-400 hover:text-purple-300 underline underline-offset-2">Read our Cookie Policy</button>.
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 flex-shrink-0">
                    <button
                        onClick={() => setShowOptions(true)}
                        className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-95"
                    >
                        Manage
                    </button>
                    <button
                        onClick={handleAcceptEssential}
                        className="px-6 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm transition-all active:scale-95"
                    >
                        Essential Only
                    </button>
                    <button
                        onClick={handleAcceptAll}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(147,51,234,0.4)] text-white font-bold text-sm transition-all active:scale-95 shimmer-btn"
                    >
                        Accept All
                    </button>
                </div>

            </div>
        </div>
    );
}
