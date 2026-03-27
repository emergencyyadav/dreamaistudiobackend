import React, { useState } from 'react';
import { X, Zap, Shield, MessageCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

export default function AuthModal({ isOpen, onClose, customMessage, bannedError }) {
    const [loading, setLoading] = useState(null); // which provider is loading
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleOAuth = async (provider) => {
        setLoading(provider);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin,
                    queryParams: { prompt: 'select_account' }
                }
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || 'Something went wrong. Please try again.');
            setLoading(null);
        }
    };

    const handleTelegram = () => {
        // Telegram login bot — coming soon
        setError('Telegram login is coming soon. Please use another method for now.');
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            {/* Card */}
            <div className="relative w-full max-w-sm bg-gray-950 border border-gray-800/80 rounded-2xl shadow-2xl overflow-hidden">

                {/* Top accent line */}
                <div className="h-[2px] w-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600" />

                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-gray-800 transition-all"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="px-8 pt-8 pb-8 text-center sm:text-left">
                    {/* Brand mark */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                            <Zap size={16} className="text-purple-400" fill="currentColor" />
                        </div>
                        <span className="text-sm font-black tracking-tight"><span className="text-white">Dream</span><span className="text-purple-400">AI</span></span>
                    </div>

                    {bannedError ? (
                        /* Compact Banned UI */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <h2 className="text-3xl font-black text-red-500 tracking-tight leading-tight mb-3">
                                Account Deleted
                            </h2>
                            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                This account is no longer recoverable. All associated data has been permanently erased.
                            </p>

                            <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl text-left bg-gradient-to-br from-red-500/5 to-transparent">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                    <span className="text-red-400 font-bold text-xs uppercase tracking-widest">Access Denied</span>
                                </div>
                                <p className="text-gray-500 text-xs mb-5">If you need assistance or believe this is an error:</p>

                                <div className="space-y-4">
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider mb-1">Support Channel</span>
                                        <a
                                            href="https://discord.gg/yourlink"
                                            target="_blank"
                                            className="text-white text-sm font-bold underline decoration-red-500/50 underline-offset-4 hover:text-red-400 transition-colors"
                                        >
                                            Get Support (Discord)
                                        </a>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider mb-1">Email us</span>
                                        <span className="text-gray-300 text-xs font-mono">dreamaistudio02@gmail.com</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Normal Login UI */
                        <>
                            <h2 className="text-2xl font-black text-white tracking-tight leading-snug mb-1">
                                {customMessage || 'Start for free.'}
                            </h2>
                            <p className="text-gray-500 text-sm mb-7 leading-relaxed">
                                Sign in with your account and get <span className="text-white font-semibold">10 free Bolt Coins</span> to explore characters, chat, and create.
                            </p>

                            {/* Error */}
                            {error && (
                                <div className="mb-5 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
                                    {error}
                                </div>
                            )}

                            {/* Social buttons */}
                            <div className="space-y-3">
                                <SocialButton
                                    icon={<GoogleIcon />}
                                    label="Continue with Google"
                                    loading={loading === 'google'}
                                    onClick={() => handleOAuth('google')}
                                    disabled={!!loading}
                                />
                                <SocialButton
                                    icon={<XIcon />}
                                    label="Continue with X"
                                    loading={loading === 'x'}
                                    onClick={() => handleOAuth('x')}
                                    disabled={!!loading}
                                />
                                <SocialButton
                                    icon={<DiscordIcon />}
                                    label="Continue with Discord"
                                    loading={loading === 'discord'}
                                    onClick={() => handleOAuth('discord')}
                                    disabled={!!loading}
                                />
                                <SocialButton
                                    icon={<TelegramIcon />}
                                    label="Continue with Telegram"
                                    comingSoon
                                    loading={false}
                                    onClick={handleTelegram}
                                    disabled={!!loading}
                                />
                            </div>

                            {/* Footer trust line */}
                            <div className="mt-7 flex items-center gap-2 text-gray-600 text-[11px]">
                                <Shield size={11} className="flex-shrink-0" />
                                <span>No passwords. No spam. We never sell your data.</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ── Social Button ─────────────────────────────────────────────────────── */
function SocialButton({ icon, label, onClick, loading, disabled, comingSoon }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || comingSoon}
            className={`
                relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border
                text-sm font-semibold transition-all duration-150 active:scale-[0.98]
                ${comingSoon
                    ? 'border-gray-800/60 bg-gray-900/30 text-gray-600 cursor-not-allowed'
                    : 'border-gray-800 bg-gray-900/60 text-gray-200 hover:bg-gray-800/80 hover:border-gray-700 hover:text-white'}
                ${disabled && !comingSoon ? 'opacity-60 pointer-events-none' : ''}
            `}
        >
            {/* Icon */}
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {loading
                    ? <span className="w-4 h-4 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                    : icon
                }
            </span>

            <span className="flex-1 text-left">{label}</span>

            {comingSoon && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">
                    Soon
                </span>
            )}
        </button>
    );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function GoogleIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
            <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z" />
            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.59L19.834 21z" />
            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg className="w-[18px] h-[18px] text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function DiscordIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

function TelegramIcon() {
    return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#229ED9">
            <path d="M11.944 0A12 12 0 1 0 12 24a12 12 0 0 0-.056-24zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}
