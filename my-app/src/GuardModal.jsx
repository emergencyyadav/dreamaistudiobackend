import React from 'react';
import { ShieldAlert, AlertCircle, Ban, X, MessageSquareWarning } from 'lucide-react';

/**
 * GuardModal
 * A prominent warning popup triggered when a user violates the T&C content filter.
 */
export default function GuardModal({ isOpen, onClose, reason }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop with heavy blur */}
            <div
                className="absolute inset-0 bg-black/80 animate-in fade-in duration-500"
                onClick={onClose}
            />

            {/* Warning Card */}
            <div
                className="relative w-full max-w-sm bg-gray-950 border border-red-500/30 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden animate-in zoom-in-95 duration-300"
            >
                {/* Red danger stripe */}
                <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />

                <div className="p-8 text-center sm:text-left">
                    {/* Icon */}
                    <div className="flex justify-center sm:justify-start mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/10">
                            <ShieldAlert size={28} className="text-red-500" />
                        </div>
                    </div>

                    {/* Content */}
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-tight mb-2">
                        Content Policy Alert
                    </h2>
                    <p className="text-red-400 font-bold text-xs uppercase tracking-widest mb-6">
                        Violation Detected
                    </p>

                    <div className="space-y-4 mb-8">
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Your input contains forbidden language or concepts (e.g., <span className="text-red-400 font-mono italic">"{reason}"</span>) that violate our <span className="text-white font-bold">Terms of Service</span>.
                        </p>

                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl">
                            <div className="flex gap-3">
                                <Ban size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                    DreamAI enforces a strict zero-tolerance policy against non-compliant content. <span className="text-red-500 font-bold uppercase">Repeated violations will result in a permanent account ban</span> without appeal.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 rounded-xl bg-red-600 text-white font-black hover:bg-red-500 hover:scale-[1.02] shadow-[0_0_20px_rgba(220,38,38,0.2)] active:scale-95 transition-all text-sm uppercase tracking-widest"
                        >
                            I Understand & Disagree
                        </button>
                        <p className="text-center text-[10px] text-gray-600">
                            All violations are logged for moderation review.
                        </p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full text-gray-600 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
}
