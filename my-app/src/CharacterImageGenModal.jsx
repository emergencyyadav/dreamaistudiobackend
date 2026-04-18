import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    X, Sparkles, Wand2, RefreshCw, AlertTriangle, Download,
    Maximize2, Image as ImageIcon, Zap, ChevronRight, Check
} from 'lucide-react';
import { backendJson, hasBackend } from './backendApi';
import { supabase } from './supabaseClient';
import { resolveCharacterMedia, FALLBACK_MEDIA_IMAGE } from './mediaUtils';

const IMG2IMG_MODEL = 'flux-2-dev';
const COST_PER_GEN = 15;

const GENERATED_IMAGES_STORAGE_KEY = 'dreamai_generated_images';
const GENERATED_IMAGES_UPDATED_EVENT = 'dreamai:generated-images-updated';

const STYLE_PRESETS = [
    'Realistic Photo', 'Anime', 'Digital Art', 'Oil Painting',
    'Cyberpunk', 'Fantasy', 'Watercolor', 'Comic Book',
    '3D Render', 'Cinematic', 'Noir', 'Retro'
];

const SCENE_PRESETS = [
    'Beach Sunset', 'Cyberpunk City', 'Enchanted Forest', 'Rooftop at Night',
    'Cozy Bedroom', 'Snowy Mountains', 'Neon Club', 'Ancient Temple',
    'Underwater', 'Space Station', 'Victorian Parlor', 'Cherry Blossom Park'
];

/* ─── Helpers ─── */
function buildImageEntries(urls, meta = {}) {
    const createdAt = new Date().toISOString();
    return urls.map((url, i) => ({
        id: `${Date.now()}_${i}`,
        url,
        createdAt,
        prompt: meta.prompt || '',
        sizeLabel: meta.sizeLabel || '',
        sizeDisplay: meta.sizeDisplay || '',
        provider: 'backend',
        model: IMG2IMG_MODEL,
    }));
}

function persistImages(entries) {
    try {
        const existing = JSON.parse(localStorage.getItem(GENERATED_IMAGES_STORAGE_KEY) || '[]');
        const merged = [...entries, ...existing].slice(0, 80);
        localStorage.setItem(GENERATED_IMAGES_STORAGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent(GENERATED_IMAGES_UPDATED_EVENT, { detail: merged }));
        return merged;
    } catch { return entries; }
}

async function syncToUser(userId, entries) {
    if (!userId || entries.length === 0) return;
    const { data } = await supabase.from('users').select('cont_img').eq('uuid', userId).single();
    const existing = Array.isArray(data?.cont_img) ? data.cont_img : [];
    const merged = [...entries, ...existing].slice(0, 80);
    await supabase.from('users').update({ cont_img: merged }).eq('uuid', userId);
    window.dispatchEvent(new CustomEvent(GENERATED_IMAGES_UPDATED_EVENT, { detail: merged }));
}

async function imageUrlToBase64(url) {
    // If it's already a public URL (cloudinary, unsplash, etc.), send it directly
    // WaveSpeed API accepts image URLs natively
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
        return url;
    }
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (err) {
        console.warn('[CharImgGen] Could not convert image to base64:', err.message);
        return url; // fallback: send URL directly
    }
}

/* ─── Chip Select ─── */
function ChipSelect({ options, value, onChange, label }) {
    return (
        <div>
            {label && <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</p>}
            <div className="flex flex-wrap gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(value === opt ? '' : opt)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all duration-200 ${value === opt
                            ? 'bg-gradient-to-r from-pink-500/25 to-purple-500/25 text-white border-pink-500/50 shadow-[0_0_10px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/20'
                            : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-gray-200'
                            }`}
                    >
                        {opt}
                        {value === opt && <Check size={10} className="inline ml-1.5 text-pink-400" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── Loading Overlay ─── */
function GeneratingOverlay() {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090b]/90 backdrop-blur-lg rounded-3xl">
            <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-24 h-24 rounded-full border border-pink-500/20 animate-[spin_4s_linear_infinite]" />
                <div className="absolute w-16 h-16 rounded-full border border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]" />
                <div className="absolute w-20 h-20 rounded-full bg-pink-500/10 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.4)] rotate-3">
                    <Sparkles size={20} className="text-white animate-pulse" />
                </div>
            </div>
            <p className="text-white font-black text-base tracking-wide mb-1 flex items-center gap-2">
                Transforming character
                <span className="flex gap-0.5">
                    <span className="animate-bounce inline-block">.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '0.1s' }}>.</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>.</span>
                </span>
            </p>
            <p className="text-gray-500 text-xs font-medium">Using Flux-2-dev img2img · Usually 20–40s</p>
        </div>
    );
}

/* ══════════════════════════ MAIN MODAL ══════════════════════════ */
export default function CharacterImageGenModal({
    isOpen,
    onClose,
    character,
    sessionInfo,
    isPremium,
    onBurnCoin,
    onRequireUpgrade,
    setShowUpgradeModal,
}) {
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('');
    const [selectedScene, setSelectedScene] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [error, setError] = useState('');
    const [fullscreenImg, setFullscreenImg] = useState(null);
    const [refImageUrl, setRefImageUrl] = useState('');

    const promptRef = useRef(null);

    // Resolve the character's first still image as reference
    useEffect(() => {
        if (!character) return;
        const { stillImage } = resolveCharacterMedia(character);
        setRefImageUrl(stillImage || character?.image || FALLBACK_MEDIA_IMAGE);
    }, [character]);

    // Auto-focus prompt
    useEffect(() => {
        if (isOpen) setTimeout(() => promptRef.current?.focus(), 200);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const buildFinalPrompt = useCallback(() => {
        const parts = [];
        if (selectedStyle) parts.push(`${selectedStyle} style`);
        parts.push(`an image of ${character?.name || 'the character'}`);
        if (prompt.trim()) parts.push(prompt.trim());
        if (selectedScene) parts.push(`in a ${selectedScene} setting`);
        parts.push('highest quality, highly detailed, masterpiece, 8k resolution');
        return parts.join(', ');
    }, [prompt, selectedStyle, selectedScene, character]);

    const handleGenerate = async () => {
        if (isGenerating) return;
        if (!prompt.trim() && !selectedStyle && !selectedScene) {
            setError('Please enter a prompt or select a style/scene.');
            return;
        }

        setIsGenerating(true);
        setError('');
        setGeneratedImages([]);

        try {
            if (!hasBackend) throw new Error('Backend is not configured.');

            if (!sessionInfo?.access_token) {
                const { data: refreshed } = await supabase.auth.getSession();
                if (!refreshed?.session?.access_token) {
                    throw new Error('You must be logged in. Please sign in and try again.');
                }
                Object.assign(sessionInfo, refreshed.session);
            }

            // Deduct credits
            if (!isPremium) {
                const ok = await onBurnCoin(COST_PER_GEN);
                if (!ok) {
                    if (setShowUpgradeModal) setShowUpgradeModal(true);
                    else if (onRequireUpgrade) onRequireUpgrade();
                    setIsGenerating(false);
                    return;
                }
            }

            // Convert ref image to base64 for the API
            const refBase64 = await imageUrlToBase64(refImageUrl);
            const finalPrompt = buildFinalPrompt();

            console.log('[CharImgGen] Sending img2img request with model:', IMG2IMG_MODEL);
            const result = await backendJson('/api/images/generate', {
                method: 'POST',
                sessionInfo,
                body: {
                    prompt: finalPrompt,
                    width: 768,
                    height: 1024,
                    count: 1,
                    model: IMG2IMG_MODEL,
                    image: refBase64,
                },
            });

            const urls = Array.isArray(result?.urls) ? result.urls : [];
            if (urls.length === 0) {
                throw new Error('No images returned. The generation may have timed out — try again.');
            }

            setGeneratedImages(urls);

            const entries = buildImageEntries(urls, {
                prompt: finalPrompt,
                sizeLabel: 'Portrait',
                sizeDisplay: '3:4',
            });
            persistImages(entries);

            try {
                await syncToUser(sessionInfo?.user?.id, entries);
            } catch (syncErr) {
                console.warn('[CharImgGen] Could not sync to user:', syncErr);
            }

            // Sync to character's public gallery
            try {
                if (character?.id) {
                    const { data: charData } = await supabase.from('characters').select('gallery').eq('id', character.id).single();
                    const existingGallery = Array.isArray(charData?.gallery) ? charData.gallery : [];
                    const galleryEntries = urls.map(url => ({ url, type: 'image', addedAt: new Date().toISOString() }));
                    const updatedGallery = [...galleryEntries, ...existingGallery].slice(0, 50);
                    await supabase.from('characters').update({ gallery: updatedGallery }).eq('id', character.id);
                }
            } catch (galErr) {
                console.warn('[CharImgGen] Gallery sync error:', galErr);
            }

        } catch (err) {
            console.error('[CharImgGen] Error:', err);
            const msg = err.message || 'Unknown error';
            if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('expired')) {
                setError('Session expired. Please refresh page and try again.');
            } else if (msg.includes('429') || msg.includes('Too many')) {
                setError('Rate limit reached. Please wait and try again.');
            } else if (msg.includes('fetch') || msg.includes('Network')) {
                setError('Network error. Check your connection.');
            } else {
                setError(`Error: ${msg}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen || !character) return null;

    const canGenerate = !isGenerating && (prompt.trim() || selectedStyle || selectedScene);

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes charImgGenSlideUp {
                    from { opacity: 0; transform: translateY(30px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes charImgGenFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .char-gen-modal { animation: charImgGenSlideUp 0.35s cubic-bezier(0.175,0.885,0.32,1.275); }
                .char-gen-backdrop { animation: charImgGenFadeIn 0.2s ease-out; }
            `}} />

            {/* ─── Fullscreen Lightbox ─── */}
            {fullscreenImg && (
                <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setFullscreenImg(null)}>
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition" onClick={() => setFullscreenImg(null)}>
                        <X size={18} />
                    </button>
                    <img src={fullscreenImg} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {/* ─── Backdrop ─── */}
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 char-gen-backdrop">
                <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onClose} />

                {/* ─── Modal Container ─── */}
                <div className="relative w-full max-w-2xl max-h-[92vh] bg-[#0d0d14] border border-white/[0.08] rounded-[28px] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.6)] char-gen-modal flex flex-col">

                    {/* ═══ Header ═══ */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-black/40 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_16px_rgba(236,72,153,0.25)]">
                                <Wand2 size={16} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-white tracking-tight">Reimagine {character.name}</h2>
                                <p className="text-[10px] text-gray-500 font-medium">Flux-2-dev img2img · Character reference</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-all active:scale-90">
                            <X size={16} />
                        </button>
                    </div>

                    {/* ═══ Body ═══ */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                        <div className="p-5 space-y-5">

                            {/* ─── Reference Image Preview ─── */}
                            <div className="flex gap-4 items-start">
                                <div className="relative flex-shrink-0 group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl opacity-50 blur-sm group-hover:opacity-75 transition-opacity" />
                                    <img
                                        src={refImageUrl}
                                        alt={`${character.name} reference`}
                                        className="relative w-24 h-32 rounded-2xl object-cover border-2 border-[#0d0d14] shadow-xl"
                                    />
                                    <div className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-0.5 text-center">
                                        <span className="text-[8px] font-bold text-pink-300 uppercase tracking-wider">Reference</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-white font-bold text-sm truncate">{character.name}</h3>
                                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed line-clamp-2">{character.desc || character.persona || 'AI Character'}</p>
                                    <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg w-fit">
                                        <ImageIcon size={10} className="text-purple-400" />
                                        <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Character image will be used as reference</span>
                                    </div>
                                </div>
                            </div>

                            {/* ─── Prompt Input ─── */}
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Your Prompt</p>
                                <textarea
                                    ref={promptRef}
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Describe how you want to reimagine this character… e.g. 'wearing a medieval armor in a dark castle, dramatic lighting'"
                                    className="w-full h-28 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/20 resize-none leading-relaxed transition-all"
                                />
                            </div>

                            {/* ─── Style Presets ─── */}
                            <ChipSelect
                                label="Art Style"
                                options={STYLE_PRESETS}
                                value={selectedStyle}
                                onChange={setSelectedStyle}
                            />

                            {/* ─── Scene Presets ─── */}
                            <ChipSelect
                                label="Scene / Environment"
                                options={SCENE_PRESETS}
                                value={selectedScene}
                                onChange={setSelectedScene}
                            />

                            {/* ─── Result Area ─── */}
                            <div className="relative min-h-[200px] bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden">
                                {isGenerating && <GeneratingOverlay />}

                                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.03]">
                                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                                        <ImageIcon size={12} className="text-gray-400" /> Result
                                    </h3>
                                    {generatedImages.length > 0 && (
                                        <button onClick={() => setGeneratedImages([])} className="text-[10px] text-gray-500 hover:text-white transition-colors">Clear</button>
                                    )}
                                </div>

                                <div className="p-4">
                                    {generatedImages.length === 0 && !isGenerating ? (
                                        <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                            <div className="w-14 h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-3 text-gray-700">
                                                <Wand2 size={24} />
                                            </div>
                                            <p className="text-xs text-gray-400 font-medium">Reimagined result appears here</p>
                                            <p className="text-[10px] text-gray-600 mt-1">Describe a scene and hit generate</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 max-w-md mx-auto gap-4">
                                            {generatedImages.map((imgUrl, i) => (
                                                <div key={i} className="relative group rounded-2xl overflow-hidden bg-black border border-white/[0.08] shadow-2xl" style={{ aspectRatio: '3/4' }}>
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Generated ${i + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                        <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-wide">
                                                            Reimagined
                                                        </span>
                                                    </div>

                                                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[10px] group-hover:translate-y-0">
                                                        <button
                                                            onClick={() => setFullscreenImg(imgUrl)}
                                                            className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-white/20 hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            <Maximize2 size={16} />
                                                        </button>
                                                        <a
                                                            href={imgUrl}
                                                            download={`${character.name}_reimagined_${i}.png`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-lg"
                                                        >
                                                            <Download size={16} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-red-400">
                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                            <p className="text-xs">{error}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ Footer / Generate CTA ═══ */}
                    <div className="px-5 py-4 border-t border-white/[0.05] bg-[#09090b] flex-shrink-0">
                        <button
                            onClick={handleGenerate}
                            disabled={!canGenerate}
                            className={`relative w-full h-13 py-3.5 rounded-2xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ${!canGenerate
                                ? 'bg-white/[0.05] text-gray-600 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                                }`}
                        >
                            {isGenerating ? (
                                <><RefreshCw size={16} className="animate-spin text-black" /> Processing...</>
                            ) : (
                                <>
                                    <Wand2 size={16} />
                                    Reimagine Character
                                    {!isPremium && (
                                        <span className="ml-1 flex items-center gap-1 text-[10px] font-black opacity-80 bg-black/10 px-1.5 py-0.5 rounded-lg border border-black/10">
                                            <Zap size={10} className="fill-black" /> {COST_PER_GEN}
                                        </span>
                                    )}
                                </>
                            )}
                            {canGenerate && !isGenerating && (
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[150%] hover:animate-[shimmer_1.5s_infinite]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
