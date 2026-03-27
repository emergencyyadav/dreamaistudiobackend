import React, { useState, useEffect } from 'react';
import { CheckCircle2, MessageCircle, Sparkles, Plus } from 'lucide-react';

const LOADING_MESSAGES = [
    "Awakening your AI companion... ✨",
    "Designing the perfect look... 🎨",
    "Searching for the ideal image... 🔍",
    "Crafting a unique personality... 💫",
    "Adding the finishing touches... 🌟",
];

// Pre-generate star positions once at module level (stable)
const STARS = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: `${((i * 137.508) % 100).toFixed(2)}%`,
    top: `${((i * 97.391) % 100).toFixed(2)}%`,
    opacity: (((i * 0.618) % 0.7) + 0.1).toFixed(2),
    delay: `${((i * 0.23) % 3).toFixed(2)}s`,
    duration: `${(((i * 0.41) % 2) + 1.5).toFixed(2)}s`,
}));

/** Loading screen shown while character is being created */
function CreatingScreen({ msgIdx }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 30%, #1a0a2e 0%, #09090b 65%)' }}
        >
            {/* Ambient glow orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-15 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #ec4899, transparent)' }} />

            {/* Star field */}
            {STARS.map(s => (
                <div key={s.id}
                    className="absolute rounded-full bg-white animate-pulse pointer-events-none"
                    style={{ width: 2, height: 2, left: s.left, top: s.top, opacity: s.opacity, animationDelay: s.delay, animationDuration: s.duration }}
                />
            ))}

            {/* Triple spinning rings + glowing core */}
            <div className="relative flex items-center justify-center mb-10">
                <div className="absolute w-52 h-52 rounded-full animate-spin"
                    style={{ border: '2px solid transparent', borderTopColor: '#a855f7', borderRightColor: '#ec4899', animationDuration: '2.5s' }} />
                <div className="absolute w-40 h-40 rounded-full animate-spin"
                    style={{ border: '2px solid transparent', borderBottomColor: '#ec4899', borderLeftColor: '#818cf8', animationDuration: '3.5s', animationDirection: 'reverse' }} />
                <div className="absolute w-28 h-28 rounded-full animate-spin"
                    style={{ border: '1.5px solid transparent', borderTopColor: '#f472b6', animationDuration: '1.8s' }} />
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center animate-pulse"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 0 60px rgba(168,85,247,0.8), 0 0 120px rgba(168,85,247,0.3)' }}>
                    <Sparkles size={30} className="text-white" />
                </div>
            </div>

            {/* Text */}
            <h2 className="text-2xl md:text-3xl font-black text-white mb-4 text-center px-4">
                Creating Your AI Companion
            </h2>
            <p className="text-sm font-medium text-center px-6 transition-all duration-700 ease-in-out" style={{ color: '#d8b4fe' }}>
                {LOADING_MESSAGES[msgIdx]}
            </p>

            {/* Bouncing dots */}
            <div className="flex items-center gap-2 mt-8">
                {[0, 1, 2, 3, 4].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: i % 2 === 0 ? '#a855f7' : '#ec4899', animationDelay: `${i * 0.12}s`, animationDuration: '0.9s' }} />
                ))}
            </div>
        </div>
    );
}

/** Success card shown after character is fully created */
function SuccessCard({ character, onCreateAnother, onStartChat }) {
    const img = character?.images || character?.image || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';
    const name = character?.name || 'Your Companion';
    const age = character?.age;
    const persona = character?.persona || character?.desc || '';
    const tags = Array.isArray(character?.tags) ? character.tags : [];

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(0,0,0,0.93)', backdropFilter: 'blur(24px)' }}
        >
            {/* Bg glow */}
            <div className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none"
                style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />

            {/* Card */}
            <div
                className="relative w-full max-w-[360px] rounded-3xl overflow-hidden"
                style={{ boxShadow: '0 0 80px rgba(168,85,247,0.45), 0 0 200px rgba(168,85,247,0.15)', animation: 'zoomIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}
            >
                <style>{`@keyframes zoomIn { from { opacity:0; transform:scale(0.8) translateY(20px);} to { opacity:1; transform:scale(1) translateY(0);} }`}</style>

                {/* Image */}
                <div className="relative" style={{ aspectRatio: '3/4' }}>
                    <img src={img} alt={name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.05) 100%)' }} />

                    {/* Badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{ background: 'rgba(34,197,94,0.9)', backdropFilter: 'blur(8px)' }}>
                        <CheckCircle2 size={13} className="text-white" />
                        <span className="text-white text-xs font-bold">Character Created!</span>
                    </div>
                </div>

                {/* Info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#a855f7' }}>
                        Your New AI Companion
                    </p>
                    <h2 className="text-3xl font-black text-white mb-0.5">{name}</h2>
                    {age && <p className="text-sm mb-3" style={{ color: '#9ca3af' }}>{age} years old</p>}

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {tags.slice(0, 5).map((tag, i) => (
                                <span key={i} className="px-2.5 py-0.5 text-xs font-semibold rounded-full"
                                    style={{ background: 'rgba(168,85,247,0.25)', border: '1px solid rgba(168,85,247,0.4)', color: '#e9d5ff' }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Persona */}
                    {persona && (
                        <p className="text-xs leading-relaxed mb-5" style={{ color: '#d1d5db', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {persona}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCreateAnother}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-white/5 flex items-center justify-center gap-1.5"
                            style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af' }}
                        >
                            <Plus size={14} /> Create Another
                        </button>
                        <button
                            onClick={() => onStartChat && onStartChat({
                                ...character,
                                image: img,
                                desc: persona,
                            })}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:scale-105"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)', boxShadow: '0 0 25px rgba(168,85,247,0.5)' }}
                        >
                            <MessageCircle size={15} /> Start Chatting
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Root export — renders based on stage prop */
export default function CharacterCreatedModal({ stage, character, onCreateAnother, onStartChat }) {
    const [msgIdx, setMsgIdx] = useState(0);

    useEffect(() => {
        if (stage !== 'creating') { setMsgIdx(0); return; }
        const interval = setInterval(() => setMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length), 1800);
        return () => clearInterval(interval);
    }, [stage]);

    if (stage === 'creating') return <CreatingScreen msgIdx={msgIdx} />;
    if (stage === 'done' && character) return <SuccessCard character={character} onCreateAnother={onCreateAnother} onStartChat={onStartChat} />;
    return null;
}
