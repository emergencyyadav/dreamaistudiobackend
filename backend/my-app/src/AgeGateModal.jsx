import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function AgeGateModal({ isOpen, onAgree, onDecline, onOpenPolicy }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xl" />

            <div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b13]/95 p-8 text-center shadow-[0_32px_120px_rgba(0,0,0,0.72)] sm:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.14),transparent_35%),radial-gradient(circle_at_bottom,rgba(217,70,239,0.08),transparent_28%)]" />

                <div className="relative">
                    <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-[28px] border border-fuchsia-400/20 bg-fuchsia-500/10">
                        <ShieldCheck className="text-fuchsia-300" size={36} />
                    </div>

                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-fuchsia-200/70">
                        Account Verification
                    </p>
                    <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white">
                        Confirm you are 18+
                    </h2>
                    <p className="mx-auto mb-8 max-w-sm text-sm leading-7 text-white/58">
                        This step appears only after login. Confirm your age once to continue into the app and unlock the full experience.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onAgree}
                            className="rounded-2xl bg-white px-6 py-4 text-sm font-semibold text-black transition-all hover:bg-white/92 active:scale-[0.99]"
                        >
                            I am 18 or older
                        </button>
                        <button
                            onClick={onDecline}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm font-medium text-white/72 transition-all hover:bg-white/[0.06] hover:text-white active:scale-[0.99]"
                        >
                            Exit
                        </button>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-4 text-[11px] uppercase tracking-[0.22em] text-white/35">
                        <button onClick={() => onOpenPolicy?.('terms')} className="transition-colors hover:text-white">
                            Terms
                        </button>
                        <span className="text-white/20">•</span>
                        <button onClick={() => onOpenPolicy?.('privacy')} className="transition-colors hover:text-white">
                            Privacy
                        </button>
                        <span className="text-white/20">•</span>
                        <button onClick={() => onOpenPolicy?.('cookies')} className="transition-colors hover:text-white">
                            Cookies
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
