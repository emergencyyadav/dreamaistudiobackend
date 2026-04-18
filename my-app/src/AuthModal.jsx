import React, { useState } from 'react';
import { Shield, X, AlertCircle } from 'lucide-react';
import { supabase } from './supabaseClient';

const OAUTH_PROVIDERS = {
    google: {
        provider: 'google',
        label: 'Continue with Google'
    },
    x: {
        provider: 'x',
        label: 'Continue with X'
    },
    discord: {
        provider: 'discord',
        label: 'Continue with Discord'
    }
};

export default function AuthModal({ isOpen, onClose, customMessage, bannedError }) {
    const [loading, setLoading] = useState(null);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleOAuth = async (providerKey) => {
        const providerConfig = OAUTH_PROVIDERS[providerKey];
        if (!providerConfig) {
            setError('That login method is not available right now.');
            return;
        }

        setLoading(providerKey);
        setError('');

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: providerConfig.provider,
                options: {
                    redirectTo: `${window.location.origin}/`,
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
        setError('Telegram login is coming soon. Please use another method for now.');
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6 font-sans antialiased">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Subtle Purple Ambient Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Modal Container */}
            <div className="relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a]/95 shadow-2xl backdrop-blur-xl">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Close"
                >
                    <X size={18} />
                </button>

                <div className="px-6 py-10 sm:px-10">
                    
                    {bannedError ? (
                        /* Banned / Account Deleted State */
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                                <AlertCircle size={24} className="text-red-400" />
                            </div>
                            
                            <h2 className="mb-3 text-2xl font-light tracking-tight text-white">
                                Account Deleted
                            </h2>
                            <p className="mb-8 text-sm font-light leading-relaxed text-white/60">
                                This account is no longer recoverable. All associated data has been permanently erased.
                            </p>

                            <div className="rounded-2xl border border-red-500/10 bg-red-500/5 p-5">
                                <p className="mb-4 text-xs font-medium uppercase tracking-wider text-red-400">
                                    Access Denied
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Support</span>
                                        <a href="https://discord.gg/yourlink" target="_blank" rel="noreferrer" className="text-sm text-white transition-colors hover:text-red-300">
                                            Join our Discord
                                        </a>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Email</span>
                                        <span className="text-sm text-white/70">dreamaistudio02@gmail.com</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Standard Login State */
                        <>
                            <div className="mb-8 text-center">
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/20 to-purple-500/0 shadow-[0_0_18px_rgba(168,85,247,0.16)]">
                                    <img
                                        src="/logo.svg"
                                        alt="DreamAI logo"
                                        className="h-9 w-9 object-contain"
                                    />
                                </div>

                                <h2 className="mb-3 text-3xl font-light tracking-tight text-white">
                                    {customMessage || 'Join DreamAI'}
                                </h2>

                                <p className="text-sm font-light leading-relaxed text-white/60">
                                    Sign in to unlock private chats, visuals, and your first <span className="font-medium text-purple-300">10 free Bolt Coins</span>.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 text-center">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <SocialButton
                                    icon={<GoogleIcon />}
                                    label={OAUTH_PROVIDERS.google.label}
                                    loading={loading === 'google'}
                                    onClick={() => handleOAuth('google')}
                                    disabled={!!loading}
                                    variant="primary"
                                />
                                <SocialButton
                                    icon={<XIcon />}
                                    label={OAUTH_PROVIDERS.x.label}
                                    loading={loading === 'x'}
                                    onClick={() => handleOAuth('x')}
                                    disabled={!!loading}
                                />
                                <SocialButton
                                    icon={<DiscordIcon />}
                                    label={OAUTH_PROVIDERS.discord.label}
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

                            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-white/40">
                                <Shield size={14} className="text-purple-400/70" />
                                <span>Private by design. No passwords, no spam.</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Subcomponents

function SocialButton({ icon, label, onClick, loading, disabled, comingSoon, variant = 'secondary' }) {
    const isPrimary = variant === 'primary';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || comingSoon}
            className={`
                relative w-full flex items-center justify-center gap-3 rounded-full px-5 py-3.5
                text-sm font-medium transition-all duration-200 active:scale-[0.98]
                ${comingSoon
                    ? 'cursor-not-allowed bg-white/5 text-white/30 border border-white/5'
                    : isPrimary
                        ? 'bg-white text-black hover:bg-white/90 shadow-lg'
                        : 'bg-transparent text-white border border-white/15 hover:bg-white/5 hover:border-white/30'
                }
                ${disabled && !comingSoon ? 'pointer-events-none opacity-60' : ''}
            `}
        >
            <span className="absolute left-5 flex h-5 w-5 items-center justify-center">
                {loading ? (
                    <span className={`h-4 w-4 animate-spin rounded-full border-2 ${isPrimary ? 'border-black/20 border-t-black' : 'border-white/20 border-t-white'}`} />
                ) : (
                    icon
                )}
            </span>

            <span>{label}</span>

            {comingSoon && (
                <span className="absolute right-5 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/50">
                    Soon
                </span>
            )}
        </button>
    );
}

// Icons

function GoogleIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
            <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 0 1-6.723-4.823l-4.04 3.067A11.965 11.965 0 0 0 12 24c2.933 0 5.735-1.043 7.834-3l-3.793-2.987z" />
            <path fill="#4A90E2" d="M19.834 21c2.195-2.048 3.62-5.096 3.62-9 0-.71-.109-1.473-.272-2.182H12v4.637h6.436c-.317 1.559-1.17 2.766-2.395 3.59L19.834 21z" />
            <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 0 1 4.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 0 0 0 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z" />
        </svg>
    );
}

function XIcon() {
    return (
        <svg className="h-[15px] w-[15px] text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function DiscordIcon() {
    return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
    );
}

function TelegramIcon() {
    return (
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="#229ED9" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 1 0 12 24a12 12 0 0 0-.056-24zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
    );
}
