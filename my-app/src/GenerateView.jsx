import React, { useState, useEffect, useRef } from 'react';
import {
    Sparkles, Wand2, RefreshCw, AlertTriangle, Image as ImageIcon, Download,
    Maximize2, Video, Edit3, Trash2, Sliders, X, Zap, Palette, User, Globe,
    Calendar, Eye, Scissors, PaintBucket, Activity, Droplets, Target, Shirt,
    Gem, Move, MapPin, ChevronRight, Check
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { backendJson, hasBackend } from './backendApi';

const COST_PER_IMAGE = 10;
const IMAGE_MODEL = 'wavespeed-ai/chroma';

const OPTIONS = {
    sizes: [
        { label: 'Square', display: '1:1', width: 1024, height: 1024 },
        { label: 'Portrait', display: '3:4', width: 768, height: 1024 },
        { label: 'Landscape', display: '4:3', width: 1024, height: 768 },
    ],
    counts: [1, 2, 3, 4],
    styles: ['Realistic', 'Anime', 'Cinematic', '3D Render', 'Digital Art', 'Cyberpunk'],
    genders: ['Female', 'Male', 'Trans'],
    ethnicities: ['White', 'Black', 'Asian', 'Latina', 'Arab', 'Indian', 'Mixed'],
    eyes: ['Blue', 'Brown', 'Green', 'Hazel', 'Grey', 'Red'],
    hairColors: ['Blonde', 'Brunette', 'Black', 'Red', 'Pink', 'Blue', 'White', 'Silver'],
    hairStyles: ['Long', 'Short', 'Ponytail', 'Messy', 'Braided', 'Bald', 'Bob', 'Curly', 'Wavy', 'Straight'],
    assSizes: ['Skinny', 'Small', 'Medium', 'Large', 'Extra Large'],
    boobSizes: ['Flat', 'Small', 'Medium', 'Large', 'Extra Large'],
    figures: {
        Female: ['Slim', 'Curvy', 'Athletic', 'Voluptuous', 'Petite', 'Thick'],
        Male: ['Athletic', 'Slim', 'Bulky', 'Dad Bod', 'Muscular'],
        Trans: ['Slim', 'Curvy', 'Athletic', 'Voluptuous', 'Thick'],
    },
    skinTextures: ['Smooth', 'Pale', 'Tan', 'Freckles', 'Oiled', 'Matte', 'Sweaty', 'Tanned'],
    environments: ['Studio', 'Bedroom', 'Beach Sunset', 'Cyberpunk City', 'Lush Forest', 'Modern Office', 'Dark Dungeon', 'Abstract', 'Outdoors'],
    clothing: ['Casual', 'Lingerie', 'Elegant Dress', 'Business Suit', 'Nude (NSFW)', 'Maid Outfit', 'Workout Gear', 'Latex', 'Streetwear', 'Bikini'],
    accessories: ['None', 'Glasses', 'Choker', 'Collar', 'Piercings', 'Tattoos', 'Cat Ears', 'Necklace', 'Earrings'],
    positions: ['Standing', 'Sitting', 'Laying Down', 'Over Shoulder', 'Kneeling', 'Action Pose', 'Close-Up Portrait', 'Full Body', 'From Below', 'From Above'],
};

const GENERATED_IMAGES_STORAGE_KEY = 'dreamai_generated_images';
const GENERATED_IMAGES_UPDATED_EVENT = 'dreamai:generated-images-updated';

function buildGeneratedImageEntries(urls, meta = {}) {
    const createdAt = new Date().toISOString();
    return urls.map((url, index) => ({
        id: `${Date.now()}_${index}`,
        url,
        createdAt,
        prompt: meta.prompt || '',
        sizeLabel: meta.sizeLabel || '',
        sizeDisplay: meta.sizeDisplay || '',
        provider: meta.provider || '',
        model: meta.model || '',
    }));
}

function persistGeneratedImages(entries) {
    try {
        const existing = JSON.parse(localStorage.getItem(GENERATED_IMAGES_STORAGE_KEY) || '[]');
        const stored = [...entries, ...existing].slice(0, 80);
        localStorage.setItem(GENERATED_IMAGES_STORAGE_KEY, JSON.stringify(stored));
        window.dispatchEvent(new CustomEvent(GENERATED_IMAGES_UPDATED_EVENT, { detail: stored }));
        return stored;
    } catch (err) {
        console.warn('[Generate] Could not persist generated images:', err);
        return entries;
    }
}

async function syncGeneratedImagesToUser(userId, entries) {
    if (!userId || entries.length === 0) return null;

    const { data, error } = await supabase
        .from('users')
        .select('cont_img')
        .eq('uuid', userId)
        .single();

    if (error) throw error;

    const existing = Array.isArray(data?.cont_img) ? data.cont_img : [];
    const merged = [...entries, ...existing].slice(0, 80);
    const { error: updateError } = await supabase
        .from('users')
        .update({ cont_img: merged })
        .eq('uuid', userId);

    if (updateError) throw updateError;

    window.dispatchEvent(new CustomEvent(GENERATED_IMAGES_UPDATED_EVENT, { detail: merged }));
    return merged;
}

function extractImageUrls(payload) {
    if (!payload) return [];

    const candidates = Array.isArray(payload) ? payload : [payload];
    return candidates
        .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return item;
            if (typeof item.url === 'string') return item.url;
            if (typeof item.image === 'string') return item.image;
            if (typeof item.src === 'string') return item.src;
            return null;
        })
        .filter(Boolean);
}

/* ─── Premium Chip Group ─── */
function ChipGroup({ options, value, onChange, isColor = false }) {
    const [customOpen, setCustomOpen] = useState(false);
    const [customInput, setCustomInput] = useState('');
    const inputRef = useRef(null);

    const knownLabels = options.map(o => (typeof o === 'object' ? o.label : o));
    const isCustomActive = value && !knownLabels.includes(value);

    const openCustom = () => { setCustomInput(''); setCustomOpen(true); setTimeout(() => inputRef.current?.focus(), 50); };
    const commitCustom = () => { const t = customInput.trim(); if (t) onChange(t); setCustomOpen(false); setCustomInput(''); };
    const cancelCustom = () => { setCustomOpen(false); setCustomInput(''); };

    // Common premium styling classes for active state
    const activeClass = "bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-white border-pink-500/50 shadow-[0_0_12px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/20";
    const inactiveClass = "bg-white/[0.03] text-gray-400 border-white/[0.06] hover:bg-white/[0.08] hover:text-gray-200 hover:border-white/[0.15]";

    return (
        <div className="flex flex-wrap gap-2.5 items-center">
            {options.map(opt => {
                const label = typeof opt === 'object' ? opt.label : opt;
                const active = value === label || value === opt;
                return (
                    <button
                        key={label}
                        onClick={() => { onChange(opt); cancelCustom(); }}
                        className={`generate-mobile-chip px-3.5 py-2 rounded-2xl text-xs sm:text-xs font-semibold border transition-colors duration-200 ease-out backdrop-blur-sm flex items-center gap-1.5 ${active ? activeClass : inactiveClass
                            }`}
                    >
                        {isColor && (
                            <span
                                className="w-2.5 h-2.5 rounded-full shadow-inner border border-white/20"
                                style={{
                                    backgroundColor:
                                        label.toLowerCase() === 'blonde' ? '#FDE047' :
                                            label.toLowerCase() === 'brunette' ? '#451A03' :
                                                label.toLowerCase() === 'silver' ? '#D1D5DB' :
                                                    label.toLowerCase()
                                }}
                            />
                        )}
                        {label}
                        {active && <Check size={10} className="text-pink-400 opacity-80" />}
                    </button>
                );
            })}

            {isCustomActive && !customOpen && (
                <span className={`generate-mobile-chip flex items-center gap-1 pl-3.5 pr-2.5 py-2 rounded-2xl text-xs font-semibold border transition-colors duration-200 ${activeClass}`}>
                    {value}
                    <button onClick={() => onChange(knownLabels[0] || '')} className="ml-1 text-gray-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10">
                        <X size={10} />
                    </button>
                </span>
            )}

            {!customOpen ? (
                <button
                    onClick={openCustom}
                    className="generate-mobile-chip h-9 w-9 rounded-2xl border border-dashed border-white/[0.15] text-gray-500 hover:border-pink-500/60 hover:text-pink-400 hover:bg-pink-500/10 flex items-center justify-center transition-colors duration-200 bg-white/[0.02]"
                    title="Add Custom"
                >
                    +
                </button>
            ) : (
                <div className="generate-mobile-chip flex items-center h-9 bg-[#12121a] border border-pink-500/40 rounded-2xl px-2 shadow-[0_0_12px_rgba(236,72,153,0.15)] glow-animation ring-1 ring-pink-500/20">
                    <input
                        ref={inputRef}
                        value={customInput}
                        onChange={e => setCustomInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitCustom(); } if (e.key === 'Escape') cancelCustom(); }}
                        placeholder="Type & Enter"
                        className="bg-transparent text-[11px] text-white placeholder-gray-600 outline-none w-24 px-1"
                    />
                    <button onClick={commitCustom} disabled={!customInput.trim()} className="text-pink-400 hover:text-pink-300 disabled:opacity-25 font-bold p-1">
                        <Check size={12} />
                    </button>
                    <button onClick={cancelCustom} className="text-gray-500 hover:text-gray-300 p-1">
                        <X size={12} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── Collapsible Section with Icon ─── */
function Section({ title, icon, defaultOpen = true, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="generate-mobile-section bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden transition-colors duration-200 hover:border-white/[0.08]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-5 py-4 flex items-center justify-between text-left focus:outline-none"
            >
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-gray-400">
                        {React.createElement(icon, { size: 14 })}
                    </div>
                    <h3 className="text-[13px] font-bold text-gray-200 tracking-wide">{title}</h3>
                </div>
                <ChevronRight size={16} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
            </button>

            <div className={`generate-mobile-section-content transition-[max-height,opacity] duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="px-5 pb-5 pt-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

/* ─── Premium minimal loading animation ─── */
function GeneratingOverlay() {
    return (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#09090b]/80 backdrop-blur-md rounded-3xl animate-in fade-in duration-300 select-none">
            <div className="relative flex items-center justify-center mb-6">
                <div className="absolute w-28 h-28 rounded-full border border-pink-500/20 animate-[spin_4s_linear_infinite]" />
                <div className="absolute w-20 h-20 rounded-full border border-purple-500/30 animate-[spin_3s_linear_infinite_reverse]" />
                <div className="absolute w-24 h-24 rounded-full bg-pink-500/10 animate-ping" style={{ animationDuration: '2s' }} />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.4)] rotate-3">
                    <Sparkles size={22} className="text-white animate-pulse" />
                </div>
            </div>

            <p className="text-white font-black text-lg tracking-wide mb-1 flex items-center gap-2">
                Conjuring pixels <span className="flex gap-0.5"><span className="animate-bounce inline-block">.</span><span className="animate-bounce inline-block" style={{ animationDelay: '0.1s' }}>.</span><span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>.</span></span>
            </p>
            <p className="text-gray-500 text-xs font-medium">Applying styles & enhancements, usually 15–30s</p>
        </div>
    );
}

/* ══════════════════════════════════════════════════════ MAIN COMPONENT ══ */
export default function GenerateView({ sessionInfo, isPremium, onBurnCoin, onRequireUpgrade, setShowUpgradeModal }) {
    const [mode, setMode] = useState('image');
    const [inputMode, setInputMode] = useState('wizard');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [imageError, setImageError] = useState('');
    const [fullscreenImg, setFullscreenImg] = useState(null);

    const [manualPrompt, setManualPrompt] = useState('');

    const [wizStyle, setWizStyle] = useState(OPTIONS.styles[0]);
    const [wizGender, setWizGender] = useState(OPTIONS.genders[0]);
    const [wizEthnicity, setWizEthnicity] = useState(OPTIONS.ethnicities[0]);
    const [wizAge, setWizAge] = useState(23);
    const [wizEyes, setWizEyes] = useState(OPTIONS.eyes[0]);
    const [wizHairStyle, setWizHairStyle] = useState(OPTIONS.hairStyles[0]);
    const [wizHairColor, setWizHairColor] = useState(OPTIONS.hairColors[0]);
    const [wizAss, setWizAss] = useState(OPTIONS.assSizes[3]);
    const [wizBoobs, setWizBoobs] = useState(OPTIONS.boobSizes[3]);
    const [wizFigure, setWizFigure] = useState(OPTIONS.figures.Female[1]);
    const [wizSkin, setWizSkin] = useState(OPTIONS.skinTextures[0]);
    const [wizEnv, setWizEnv] = useState(OPTIONS.environments[0]);
    const [wizClothing, setWizClothing] = useState(OPTIONS.clothing[0]);
    const [wizAccessories, setWizAccessories] = useState(OPTIONS.accessories[0]);
    const [wizPosition, setWizPosition] = useState(OPTIONS.positions[0]);

    const [genSize, setGenSize] = useState(OPTIONS.sizes[1]); // Default to portrait
    const [genCount, setGenCount] = useState(1);

    useEffect(() => { setWizFigure(OPTIONS.figures[wizGender]?.[0] || 'Slim'); }, [wizGender]);

    const resetWizard = () => {
        setWizStyle(OPTIONS.styles[0]); setWizGender(OPTIONS.genders[0]); setWizEthnicity(OPTIONS.ethnicities[0]);
        setWizAge(23); setWizEyes(OPTIONS.eyes[0]); setWizHairStyle(OPTIONS.hairStyles[0]);
        setWizHairColor(OPTIONS.hairColors[0]); setWizAss(OPTIONS.assSizes[3]); setWizBoobs(OPTIONS.boobSizes[3]);
        setWizFigure(OPTIONS.figures.Female[1]); setWizSkin(OPTIONS.skinTextures[0]); setWizEnv(OPTIONS.environments[0]);
        setWizClothing(OPTIONS.clothing[0]); setWizAccessories(OPTIONS.accessories[0]); setWizPosition(OPTIONS.positions[0]);
        setGenSize(OPTIONS.sizes[1]); setGenCount(1);
    };

    const buildWizardPrompt = () => {
        const bodyDesc = `${wizFigure} figure, ${wizSkin} skin${['Female', 'Trans'].includes(wizGender) ? `, ${wizBoobs} breasts` : ''}, ${wizAss} ass`;
        return `${wizStyle} style masterpiece, highest quality, highly detailed, 8k resolution. A ${wizAge} year old ${wizGender}, ${wizEthnicity} descent. ${wizEyes} eyes, ${wizHairColor} ${wizHairStyle} hair. Body: ${bodyDesc}. Wearing: ${wizClothing}, Accessories: ${wizAccessories}. Setting: ${wizEnv}. Pose: ${wizPosition}.`;
    };

    const handleGenerate = async () => {
        const finalPrompt = inputMode === 'manual' ? manualPrompt : buildWizardPrompt();
        if (!finalPrompt.trim() || isGenerating) return;

        setIsGenerating(true);
        setImageError('');

        try {
            if (!hasBackend) throw new Error('Backend image generation is not configured. Ensure the dev server or VITE_BACKEND_URL is set.');

            // Check auth session is present
            if (!sessionInfo?.access_token) {
                // Try to refresh the session first
                const { data: refreshed } = await supabase.auth.getSession();
                if (!refreshed?.session?.access_token) {
                    throw new Error('You must be logged in to generate images. Please sign in and try again.');
                }
                // Use the refreshed session for this request
                Object.assign(sessionInfo, refreshed.session);
            }

            if (!isPremium) {
                const cost = COST_PER_IMAGE * genCount;
                const ok = await onBurnCoin(cost);
                if (!ok) {
                    if (setShowUpgradeModal) setShowUpgradeModal(true);
                    else if (onRequireUpgrade) onRequireUpgrade();
                    setIsGenerating(false);
                    return;
                }
            }

            console.log('[Generate] Sending request to /api/images/generate with model:', IMAGE_MODEL);
            const backendData = await backendJson('/api/images/generate', {
                method: 'POST',
                sessionInfo,
                body: {
                    prompt: finalPrompt,
                    width: genSize.width,
                    height: genSize.height,
                    count: genCount,
                    model: IMAGE_MODEL,
                }
            });

            console.log('[Generate] Backend response:', backendData);
            const urls = Array.isArray(backendData?.urls) ? backendData.urls : [];
            if (urls.length === 0) {
                throw new Error('No images were returned. The generation may have timed out — try again.');
            }

            setGeneratedImages(urls);
            const entries = buildGeneratedImageEntries(urls, {
                prompt: finalPrompt,
                sizeLabel: genSize.label,
                sizeDisplay: genSize.display,
                provider: 'backend',
                model: IMAGE_MODEL,
            });
            persistGeneratedImages(entries);
            try {
                await syncGeneratedImagesToUser(sessionInfo?.user?.id, entries);
            } catch (syncError) {
                console.warn('[Generate] Could not sync backend images to users.cont_img:', syncError);
            }

        } catch (err) {
            console.error('[Generate] Image Generation Error:', err);
            const msg = err.message || 'Unknown error';
            if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('expired session') || msg.includes('Missing bearer token')) {
                setImageError('Session expired. Please refresh the page and try again.');
            } else if (msg.includes('429') || msg.includes('Too many')) {
                setImageError('Rate limit reached. Please wait a moment and try again.');
            } else if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch')) {
                setImageError('Network error. Check your internet connection and try again.');
            } else {
                setImageError(`Error: ${msg}`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const totalCost = COST_PER_IMAGE * genCount;
    const canGenerate = !isGenerating && (inputMode === 'wizard' || manualPrompt.trim());
    const latestImage = generatedImages[0] || null;

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
                .glow-animation { animation: glow 2s ease-in-out infinite alternate; }
                @keyframes glow { from { box-shadow: 0 0 5px rgba(236,72,153,0.1); } to { box-shadow: 0 0 15px rgba(236,72,153,0.3); } }
                .glass-panel { background: rgba(13, 13, 20, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.05); }
                .custom-range::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #ec4899; cursor: pointer; box-shadow: 0 0 10px rgba(236,72,153,0.5); border: 2px solid white; }
                .custom-range::-webkit-slider-runnable-track { width: 100%; height: 4px; cursor: pointer; background: rgba(255,255,255,0.1); border-radius: 2px; }
                @media (max-width: 1023px) {
                    .glass-panel {
                        background: #0d0d14;
                        backdrop-filter: none;
                        -webkit-backdrop-filter: none;
                    }
                    .generate-mobile-lite {
                        box-shadow: none !important;
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                    }
                    .generate-mobile-chip {
                        backdrop-filter: none !important;
                        -webkit-backdrop-filter: none !important;
                        box-shadow: none !important;
                    }
                    .generate-mobile-section {
                        box-shadow: none !important;
                    }
                    .generate-mobile-section-content {
                        transition: none !important;
                    }
                }
            `}} />

            {/* Fullscreen lightbox */}
            {fullscreenImg && (
                <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setFullscreenImg(null)}>
                    <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition" onClick={() => setFullscreenImg(null)}>
                        <X size={18} />
                    </button>
                    <img src={fullscreenImg} alt="Full size" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {/* ═══ ROOT CONTAINER ═══ */}
            <div className="w-full h-full flex flex-col max-w-[1400px] mx-auto text-gray-200 font-sans">

                {/* ── HEADER ── */}
                <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.2)] shrink-0">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Create images</h1>
                            <p className="text-xs text-gray-500 font-medium">Unleash your imagination with AI</p>
                        </div>
                    </div>

                    {/* Image / Video toggle */}
                    <div className="flex items-center p-1 bg-black/40 border border-white/[0.05] rounded-xl self-start sm:self-auto lg:backdrop-blur-sm generate-mobile-lite">
                        {[
                            { id: 'image', icon: ImageIcon, label: 'Image' },
                            { id: 'video', icon: Video, label: 'Video', soon: true },
                        ].map(({ id, icon, label, soon }) => (
                            <button
                                key={id}
                                onClick={() => setMode(id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${mode === id
                                    ? 'bg-gradient-to-r from-purple-600/90 to-pink-500/90 text-white shadow-lg shadow-pink-500/20'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {React.createElement(icon, { size: 14 })}
                                {label}
                                {soon && <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded uppercase ml-1 block">Soon</span>}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── VIDEO PLACEHOLDER ── */}
                {mode === 'video' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 mx-4 sm:mx-6 mb-6 bg-[#09090b] border border-white/[0.05] rounded-[32px]">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-500/20 flex items-center justify-center mb-6">
                            <Video size={32} className="text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Video Generation</h2>
                        <p className="text-gray-500 max-w-sm text-sm leading-relaxed">Bring your characters to life with stunning AI video capabilities. Currently in closed beta for premium users.</p>
                    </div>
                ) : (
                    <>
                        {/* ── MOBILE TAB BAR ── */}
                        <div className="lg:hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.16),transparent_42%),linear-gradient(180deg,rgba(16,16,22,0.96),rgba(9,9,11,0.96))] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] generate-mobile-lite">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-pink-300/80">Compose Freely</p>
                                    <h2 className="mt-1 text-lg font-black text-white tracking-tight">Generate your image</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-gray-400">create your image using parameters given below or write your prompt manually!</p>
                                </div>
                                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-right shrink-0">
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold">generated</p>
                                    <p className="text-sm font-black text-white">{generatedImages.length || 0}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs font-semibold text-gray-300">
                                    {genSize.label} · {genSize.display}
                                </span>
                                <span className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-xs font-semibold text-gray-300">
                                    {genCount} {genCount === 1 ? 'image' : 'images'}
                                </span>
                                {!isPremium && (
                                    <span className="px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-semibold text-pink-300">
                                        {totalCost} credits
                                    </span>
                                )}
                            </div>

                            {latestImage && (
                                <button
                                    onClick={() => setFullscreenImg(latestImage)}
                                    className="mt-4 w-full flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/30 p-2 text-left hover:border-pink-500/30 transition-colors"
                                >
                                    <img
                                        src={latestImage}
                                        alt="Latest result"
                                        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white">Latest result ready</p>
                                        <p className="text-xs text-gray-500">Tap to open full preview</p>
                                    </div>
                                    <Maximize2 size={16} className="text-pink-300 flex-shrink-0" />
                                </button>
                            )}
                        </div>

                        {/* ── MAIN BODY ── */}
                        <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-5 px-4 sm:px-6 pb-6 sm:pb-6 lg:min-h-0 lg:overflow-hidden relative">

                            {/* ════ LEFT / CONFIG SIDEBAR ════ */}
                            <div className="lg:w-[380px] flex flex-col glass-panel rounded-[28px] overflow-hidden min-h-[540px] lg:h-auto lg:max-h-[calc(100vh-180px)] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] lg:flex-1 lg:min-h-0 relative generate-mobile-lite">
                                {/* Config Header / Toggle */}
                                <div className="px-5 py-4 sm:px-6 sm:py-5 flex items-start sm:items-center justify-between gap-3 border-b border-white/[0.05] bg-black/20 flex-shrink-0">
                                    <div>
                                        <span className="text-[11px] font-black uppercase tracking-[0.22em] text-white">Parameters</span>
                                        <p className="mt-1 text-xs text-gray-500 lg:hidden">Bigger controls, more breathing room, and a stacked result area below.</p>
                                    </div>
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/[0.05]">
                                        <button onClick={() => setInputMode('wizard')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${inputMode === 'wizard' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                            <Sliders size={11} /> Guided
                                        </button>
                                        <button onClick={() => setInputMode('manual')} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${inputMode === 'manual' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                                            <Edit3 size={11} /> Manual
                                        </button>
                                    </div>
                                </div>

                                {/* Scrollable Settings */}
                                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6 space-y-4 custom-scrollbar [scrollbar-width:none] generate-mobile-lite" style={{ WebkitOverflowScrolling: 'touch' }}>

                                    {inputMode === 'manual' ? (
                                        <div className="space-y-4">
                                            <textarea
                                                value={manualPrompt}
                                                onChange={e => setManualPrompt(e.target.value)}
                                                placeholder="A hyper-realistic highly detailed portrait of a cyberpunk hacker, neon lighting, 8k resolution, cinematic composition..."
                                                className="w-full h-56 sm:h-48 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pink-500/40 focus:ring-1 focus:ring-pink-500/20 resize-none leading-relaxed transition-all scrollbar-hide"
                                            />
                                            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl text-blue-400">
                                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                                <p className="text-xs leading-relaxed text-blue-300">For best accuracy, include detailed style tags like <strong>8k, masterpiece, depth of field, sharp focus</strong>.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Section title="Basic Info" icon={User} defaultOpen={true}>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Gender</label>
                                                        <ChipGroup options={OPTIONS.genders} value={wizGender} onChange={setWizGender} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Age ({wizAge})</label>
                                                        <div className="flex items-center gap-4 h-8 bg-black/20 px-3 rounded-xl border border-white/[0.05]">
                                                            <input type="range" min="18" max="80" value={wizAge} onChange={e => setWizAge(Number(e.target.value))} className="w-full custom-range appearance-none" />
                                                            <span className="text-xs font-bold text-pink-400 w-6 text-right">{wizAge}</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Ethnicity</label>
                                                        <ChipGroup options={OPTIONS.ethnicities} value={wizEthnicity} onChange={setWizEthnicity} />
                                                    </div>
                                                </div>
                                            </Section>

                                            <Section title="Appearance" icon={Eye} defaultOpen={true}>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Eye size={10} /> Eyes</label>
                                                        <ChipGroup options={OPTIONS.eyes} value={wizEyes} onChange={setWizEyes} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Scissors size={10} /> Hair Style</label>
                                                        <ChipGroup options={OPTIONS.hairStyles} value={wizHairStyle} onChange={setWizHairStyle} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><PaintBucket size={10} /> Hair Color</label>
                                                        <ChipGroup options={OPTIONS.hairColors} value={wizHairColor} onChange={setWizHairColor} isColor={true} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Droplets size={10} /> Skin</label>
                                                        <ChipGroup options={OPTIONS.skinTextures} value={wizSkin} onChange={setWizSkin} />
                                                    </div>
                                                </div>
                                            </Section>

                                            <Section title="Body Type" icon={Activity} defaultOpen={false}>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Figure</label>
                                                        <ChipGroup options={OPTIONS.figures[wizGender] || OPTIONS.figures.Female} value={wizFigure} onChange={setWizFigure} />
                                                    </div>
                                                    {['Female', 'Trans'].includes(wizGender) && (
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Target size={10} /> Chest Size</label>
                                                            <ChipGroup options={OPTIONS.boobSizes} value={wizBoobs} onChange={setWizBoobs} />
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Target size={10} /> Glutes Size</label>
                                                        <ChipGroup options={OPTIONS.assSizes} value={wizAss} onChange={setWizAss} />
                                                    </div>
                                                </div>
                                            </Section>

                                            <Section title="Styling & Scene" icon={Shirt} defaultOpen={false}>
                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Palette size={10} /> Art Style</label>
                                                        <ChipGroup options={OPTIONS.styles} value={wizStyle} onChange={setWizStyle} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Shirt size={10} /> Clothing</label>
                                                        <ChipGroup options={OPTIONS.clothing} value={wizClothing} onChange={setWizClothing} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Gem size={10} /> Accessories</label>
                                                        <ChipGroup options={OPTIONS.accessories} value={wizAccessories} onChange={setWizAccessories} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><Move size={10} /> Pose</label>
                                                        <ChipGroup options={OPTIONS.positions} value={wizPosition} onChange={setWizPosition} />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold inline-flex items-center gap-1.5"><MapPin size={10} /> Environment</label>
                                                        <ChipGroup options={OPTIONS.environments} value={wizEnv} onChange={setWizEnv} />
                                                    </div>
                                                </div>
                                            </Section>

                                            <div className="pt-2 text-center">
                                                <button onClick={resetWizard} className="text-[11px] text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-1.5 mx-auto">
                                                    <Trash2 size={12} /> Reset Parameters
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* Generate CTA Block */}
                                <div className="px-4 py-4 sm:px-5 sm:py-5 border-t border-white/[0.05] bg-[#09090b] flex-shrink-0 flex flex-col gap-3 rounded-b-[28px]">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                            <select
                                                value={genSize.label}
                                                onChange={e => setGenSize(OPTIONS.sizes.find(s => s.label === e.target.value))}
                                                className="w-full bg-white/[0.05] border border-white/[0.1] text-sm text-white rounded-2xl px-4 h-12 focus:border-pink-500 focus:outline-none transition-colors appearance-none"
                                            >
                                                {OPTIONS.sizes.map(opt => (
                                                    <option key={opt.label} value={opt.label}>{opt.label} • {opt.display}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex bg-white/[0.05] border border-white/[0.1] rounded-2xl overflow-hidden h-12">
                                            {OPTIONS.counts.map(n => (
                                                <button
                                                    key={n} onClick={() => setGenCount(n)}
                                                    className={`flex-1 text-sm font-bold transition-all border-r border-white/5 last:border-0 ${genCount === n ? 'bg-pink-500/20 text-pink-300 shadow-inner' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleGenerate}
                                        disabled={!canGenerate}
                                        className={`relative w-full h-14 rounded-2xl font-bold text-sm tracking-wide uppercase flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 ${!canGenerate
                                            ? 'bg-white/[0.05] text-gray-600 cursor-not-allowed'
                                            : 'bg-white text-black hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                                            }`}
                                    >
                                        {isGenerating ? (
                                            <><RefreshCw size={16} className="animate-spin text-black" /> Processing...</>
                                        ) : (
                                            <>
                                                <Wand2 size={16} />
                                                Generate
                                                {!isPremium && (
                                                    <span className="ml-1 flex items-center gap-1 text-[10px] font-black opacity-80 bg-black/10 px-1.5 py-0.5 rounded-lg border border-black/10">
                                                        <Zap size={10} className="fill-black" /> {totalCost}
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

                            {/* ════ RIGHT / GALLERY ════ */}
                            <div className="flex-1 flex flex-col bg-[#09090b] border border-white/[0.05] rounded-[28px] overflow-hidden min-h-[360px] lg:h-auto lg:min-h-0 relative">

                                {isGenerating && <GeneratingOverlay />}

                                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.03] z-0">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <ImageIcon size={14} className="text-gray-400" /> Output
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        {generatedImages.length > 0 && (
                                            <span className="text-[11px] font-semibold text-gray-500">
                                                {generatedImages.length} / {genCount} ready
                                            </span>
                                        )}
                                        {generatedImages.length > 0 && (
                                            <button onClick={() => setGeneratedImages([])} className="text-xs text-gray-500 hover:text-white transition-colors">Clear All</button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar z-0 relative">
                                    {generatedImages.length === 0 && !isGenerating ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-60">
                                            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-4 text-gray-700">
                                                <ImageIcon size={28} />
                                            </div>
                                            <p className="text-sm font-medium text-gray-400">Ready to create</p>
                                            <p className="text-xs text-gray-600 mt-1">Build your setup above and your results will land here</p>
                                        </div>
                                    ) : (
                                        <div className={`grid gap-4 ${generatedImages.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2'}`}>
                                            {generatedImages.map((imgUrl, i) => (
                                                <div
                                                    key={i}
                                                    className="relative group rounded-2xl overflow-hidden bg-black border border-white/[0.08] shadow-2xl"
                                                    style={{ aspectRatio: `${genSize.width}/${genSize.height}` }}
                                                >
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Result ${i + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                                    <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0">
                                                        <span className="bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-bold px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-wide">
                                                            {genSize.label}
                                                        </span>
                                                    </div>

                                                    <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[10px] group-hover:translate-y-0">
                                                        <span className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center cursor-pointer hover:bg-white/20 hover:scale-105 active:scale-95 transition-all" onClick={() => setFullscreenImg(imgUrl)}>
                                                            <Maximize2 size={16} />
                                                        </span>
                                                        <a href={imgUrl} download={`generate_${i}.png`} target="_blank" rel="noreferrer" className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center cursor-pointer hover:bg-gray-200 hover:scale-105 active:scale-95 transition-all shadow-lg">
                                                            <Download size={16} />
                                                        </a>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {imageError && (
                                        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                            <p className="text-sm">{imageError}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </>
                )}
            </div>
        </>
    );
}
