import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, Dices, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';

// ─── All image data copied directly from CreateView ───
const styleImages = {
    Female: {
        Realistic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131132/grok_image_1773124573687_fok9rt.jpg",
        Anime: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131524/grok_image_1773124073577_vuicyh.jpg"
    },
    Male: {
        Realistic: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800&h=1200",
        Anime: "https://images.unsplash.com/photo-1560611417-73595eb2fcbd?auto=format&fit=crop&q=80&w=800&h=1200"
    },
    Trans: {
        Realistic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800&h=1200",
        Anime: "https://images.unsplash.com/photo-1601814933824-fd0b574dd592?auto=format&fit=crop&q=80&w=800&h=1200"
    }
};

const ethnicityImages = {
    Realistic: {
        Female: {
            Asian: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131695/grok_image_1773119210517_oriarm.jpg",
            Black: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131367/grok_image_1773124227380_nakwfl.jpg",
            White: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131670/grok_image_1773119615427_yorjau.jpg",
            Latina: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131389/grok_image_1773124119341_jch1m1.jpg",
            Arab: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131647/grok_image_1773120086849_vaetrb.jpg",
            Indian: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131106/grok_image_1773124437481_r7rxhu.jpg",
            Elf: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131128/grok_image_1773124434045_c4y67j.jpg",
            Demon: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131576/grok_image_1773124052057_pgoip8.jpg"
        },
        Male: {
            Asian: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
            Black: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
            White: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
            Latina: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
            Arab: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
            Indian: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Asian: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=600",
            Black: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            White: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
            Latina: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
            Arab: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
            Indian: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=400&h=600",
        }
    },
    Anime: {
        Female: {
            Asian: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218326/grok_image_1773211698154_y7oaff.jpg",
            Black: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773221250/grok_image_1773218894202_y7kpe9.jpg",
            White: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218356/grok_image_1773211572074_jxaki5.jpg",
            Latina: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218961/grok_image_1773211596927_vwghy9.jpg",
            Arab: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218336/grok_image_1773211625208_elbbkn.jpg",
            Indian: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218329/grok_image_1773211663040_kd4apo.jpg",
            Elf: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218336/grok_image_1773211676305_far9bv.jpg",
            Demon: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218340/grok_image_1773211649921_p50vnb.jpg"
        },
        Male: {
            Asian: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
            Black: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
            White: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
            Latina: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
            Arab: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
            Indian: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Asian: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=600",
            Black: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            White: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
            Latina: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
            Arab: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
            Indian: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=400&h=600",
        }
    }
};

const hairStyleImages = {
    Realistic: {
        Female: {
            Braided: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218382/grok_image_1773211547107_ixdktr.jpg",
            Long: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217978/grok_image_1773211489342_rf7gwt.jpg",
            Bangs: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131651/grok_image_1773119697490_upoq6h.jpg",
            Ponytail: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217961/grok_image_1773211497307_ty64yp.jpg",
            Short: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217967/grok_image_1773211502443_jrqy8n.jpg",
            Bun: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773138833/grok_image_1773138720208_cg8hrj.jpg",
            Wavy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217964/grok_image_1773211492095_aczbqg.jpg",
            Pixie: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773138846/grok_image_1773138735226_iz9uv9.jpg"
        },
        Male: {
            Short: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
            Long: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
            Wavy: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Long: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            Ponytail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
            Short: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
        }
    },
    Anime: {
        Female: {
            Braided: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773211547107_fxzpdx.jpg",
            Long: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773223439/grok_image_1773223367259_uzucqa.jpg",
            Bangs: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773218863936_dnmfkh.jpg",
            Short: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773223441/grok_image_1773223366139_uxxfm1.jpg",
            Bun: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217939/grok_image_1773211515109_vwxsel.jpg",
            Wavy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217964/grok_image_1773211492095_aczbqg.jpg",
            Pixie: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773211502443_uqic6q.jpg"
        },
        Male: {
            Short: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
            Long: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
            Wavy: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Long: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            Ponytail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
            Short: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
        }
    }
};

const bodyTypeImages = {
    Realistic: {
        Female: {
            Slim: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773144189/grok_image_1773124592031_fposoy.jpg",
            Athletic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143704/IMG_20260310_171206_rtje4c.jpg",
            Voluptuous: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143437/IMG_20260310_171149_kt4ppi.jpg",
            Curvy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143441/IMG_20260310_171428_z2pxyy.jpg",
            Muscular: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143740/IMG_20260310_171034_cv4gbk.jpg"
        },
        Male: {
            Slim: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
            Athletic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
            Muscular: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Slim: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            Athletic: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&q=80&w=400&h=600",
            Curvy: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
        }
    },
    Anime: {
        Female: {
            Slim: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773212823/grok_image_1773212580753_bnjj1m.jpg",
            Athletic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218371/grok_image_1773211567493_wmg5nf.jpg",
            Voluptuous: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224297/grok_image_1773224145981_xd57hf.jpg",
            Curvy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218955/grok_image_1773211604125_klgl2w.jpg",
            Muscular: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217968/grok_image_1773211478141_djyood.jpg"
        },
        Male: {
            Slim: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
            Athletic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
            Muscular: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
        },
        Trans: {
            Slim: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
            Athletic: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&q=80&w=400&h=600",
            Curvy: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
        }
    }
};

const ETHNICITIES = ['Asian', 'Black', 'White', 'Latina', 'Arab', 'Indian', 'Elf', 'Demon'];
const HAIR_STYLES_F = ['Braided', 'Long', 'Bangs', 'Ponytail', 'Short', 'Bun', 'Wavy', 'Pixie'];
const HAIR_STYLES_M = ['Short', 'Long', 'Wavy'];
const BODY_TYPES_F = ['Slim', 'Athletic', 'Voluptuous', 'Curvy', 'Muscular'];
const BODY_TYPES_M = ['Slim', 'Athletic', 'Muscular'];
const PERSONALITIES = [
    { name: 'Sweet', emoji: '🥰' }, { name: 'Flirty', emoji: '💋' }, { name: 'Shy', emoji: '🌸' },
    { name: 'Playful', emoji: '✨' }, { name: 'Mysterious', emoji: '🌙' }, { name: 'Dominant', emoji: '⛓️' },
    { name: 'Submissive', emoji: '🥺' }, { name: 'Tsundere', emoji: '😤' }, { name: 'Yandere', emoji: '🔪' },
    { name: 'Romantic', emoji: '💝' }, { name: 'Confident', emoji: '💪' }, { name: 'Mischievous', emoji: '😈' }
];

// ─── Component ───
export default function LandingPage({
    onLogin = () => console.log('Login clicked'),
    onGetStarted = () => console.log('Get Started clicked'),
    onOpenPolicies = () => console.log('Policies clicked')
}) {
    const [step, setStep] = useState(1);
    const [gender, setGender] = useState('Female');
    const [style, setStyle] = useState('Realistic');
    const [ethnicity, setEthnicity] = useState('White');
    const [hairStyle, setHairStyle] = useState('Long');
    const [bodyType, setBodyType] = useState('Slim');
    const [personality, setPersonality] = useState('Sweet');

    const scrollRef = useRef(null);
    const videoRef = useRef(null);
    const [videoFailed, setVideoFailed] = useState(false);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // Autoplay background video
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.defaultMuted = true;
            videoRef.current.muted = true;
            videoRef.current.play().catch(() => setVideoFailed(true));
        }
    }, []);

    const hairList = gender === 'Male' ? HAIR_STYLES_M : HAIR_STYLES_F;
    const bodyList = gender === 'Male' ? BODY_TYPES_M : (gender === 'Trans' ? BODY_TYPES_M : BODY_TYPES_F);

    const getEthImg = (name) => ethnicityImages[style]?.[gender]?.[name] || ethnicityImages.Realistic?.Female?.[name] || styleImages[gender]?.[style];
    const getHairImg = (name) => hairStyleImages[style]?.[gender]?.[name] || hairStyleImages.Realistic?.Female?.[name] || styleImages[gender]?.[style];
    const getBodyImg = (name) => bodyTypeImages[style]?.[gender]?.[name] || bodyTypeImages.Realistic?.Female?.[name] || styleImages[gender]?.[style];

    const [diceResult, setDiceResult] = useState(null);

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const handleDice = () => {
        const g = gender; // keep current gender
        const s = pick(['Realistic', 'Anime']);
        const eth = pick(ETHNICITIES);
        const hl = g === 'Male' ? HAIR_STYLES_M : HAIR_STYLES_F;
        const h = pick(hl);
        const bl = g === 'Male' ? BODY_TYPES_M : (g === 'Trans' ? BODY_TYPES_M : BODY_TYPES_F);
        const b = pick(bl);
        const p = pick(PERSONALITIES);

        setStyle(s);
        setEthnicity(eth);
        setHairStyle(h);
        setBodyType(b);
        setPersonality(p.name);

        const img = ethnicityImages[s]?.[g]?.[eth] || styleImages[g]?.[s];
        setDiceResult({ gender: g, style: s, ethnicity: eth, hairStyle: h, bodyType: b, personality: p.name, emoji: p.emoji, image: img });
    };

    const handleChat = () => {
        localStorage.setItem('pendingLandingCharacter', JSON.stringify({
            gender, style, ethnicity, hairStyle, bodyType, personality,
            image: getEthImg(ethnicity)
        }));
        onLogin();
    };

    const handleDiceChat = () => {
        if (!diceResult) return;
        localStorage.setItem('pendingLandingCharacter', JSON.stringify({
            ...diceResult, image: diceResult.image
        }));
        setDiceResult(null);
        onLogin();
    };

    // ─── Glass Card helper ───
    const GlassCard = ({ children, className = '' }) => (
        <div className={`relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden ${className}`}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            {children}
        </div>
    );

    // ─── Image Card for grid selections ───
    const ImgCard = ({ src, label, selected, onClick }) => (
        <div
            onClick={onClick}
            className={`relative rounded-2xl overflow-hidden cursor-pointer aspect-[3/4] transition-all duration-300 group ${selected
                ? 'ring-[3px] ring-pink-500 scale-[1.03] shadow-[0_0_25px_rgba(236,72,153,0.25)]'
                : 'opacity-75 hover:opacity-100 hover:scale-[1.02]'
                }`}
        >
            <img src={src} alt={label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            {selected && (
                <div className="absolute top-2.5 right-2.5 bg-pink-500 rounded-full p-1 shadow-lg animate-in zoom-in duration-200">
                    <CheckCircle2 size={16} className="text-white fill-current" />
                </div>
            )}
            <div className="absolute bottom-3 inset-x-0 text-center">
                <span className={`text-sm font-black drop-shadow-lg ${selected ? 'text-pink-300' : 'text-white'}`}>{label}</span>
            </div>
        </div>
    );

    const stepLabels = ['Style', 'Ethnicity', 'Hair', 'Body', 'Personality'];
    const totalSteps = 5;

    return (
        <section className="relative min-h-screen w-full overflow-hidden bg-[#06060a] text-white flex flex-col font-sans antialiased">

            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                {!videoFailed ? (
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover scale-105"
                        autoPlay muted loop playsInline preload="auto"
                        onError={() => setVideoFailed(true)}
                    >
                        <source src="https://cdn.pixabay.com/video/2023/08/17/176434-855480487_large.mp4" type="video/mp4" />
                    </video>
                ) : (
                    <div className="absolute inset-0 bg-[#06060a]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/90 backdrop-blur-[3px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10 shrink-0">
                <div className="flex items-center gap-2.5">
                    <img
                        src="/logo.svg"
                        alt="DreamAI logo"
                        className="h-8 w-8 rounded-xl object-contain"
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                    <div className="hidden h-8 w-8 rounded-xl items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 text-white font-black text-sm shadow-[0_0_12px_rgba(168,85,247,0.5)]">D</div>
                    <span className="text-lg font-black tracking-tight">
                        <span className="text-white">Dream</span><span className="text-purple-400">AI</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleDice} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all" title="Randomize">
                        <Dices size={18} className="text-gray-300" />
                    </button>
                    <button onClick={onLogin} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-white/10 border border-white/10 hover:bg-white/15 transition-all">
                        Log in
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto pb-16 pt-10 sm:pt-20 scrollbar-hide">
                <div className="max-w-5xl mx-auto px-6 lg:px-10">
                    <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 drop-shadow-2xl">
                            Unlock the Ultimate <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">AI Experience</span>
                        </h1>
                        <p className="text-gray-300 text-base sm:text-lg max-w-2xl mx-auto mb-10 font-medium">
                            Step into a fully private, end-to-end encrypted ecosystem. DreamAI is your limitless studio for uncensored creativity, deep conversations, and immersive roleplay.
                        </p>

                        <div className="flex flex-col items-center gap-3 mb-6">
                            <button onClick={onLogin} className="group relative overflow-hidden px-14 py-5 rounded-2xl font-black text-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_40px_rgba(168,85,247,0.5)] hover:shadow-[0_0_60px_rgba(236,72,153,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2">
                                Start Your Free Trial
                                <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                            </button>
                            <p className="text-xs text-pink-300 font-bold tracking-widest uppercase drop-shadow-sm mt-2">
                                Free credits available • NO Credit card required for trial
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                                <Users size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">Generate Characters</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Craft hyper-personalized companions with immense depth. Control their personality, appearance, dynamics, and backstory.</p>
                        </GlassCard>

                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-pink-500/20 text-pink-400 rounded-xl flex items-center justify-center mb-6 border border-pink-500/30 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
                                <ImageIcon size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">Stunning Images</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Request selfies, outfits, and realistic visual renders dynamically in-chat to visualize your companion exactly how you want.</p>
                        </GlassCard>

                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6 border border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                                <Play size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">Motion Videos</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Bring characters to life with cinematic generative motion. Turn any requested photo into a deeply immersive breathing visual.</p>
                        </GlassCard>

                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-6 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                <Phone size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">Live Phone Calls</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Actually speak to your AI. With high-fidelity cloned voices, experience real-time two-way voice conversations with zero latency.</p>
                        </GlassCard>

                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-6 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                                <BookOpen size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">Narrative Stories</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Write infinite, totally uncensored storylines using the native Story Generator engine to synthesize beautiful sprawling worlds.</p>
                        </GlassCard>

                        <GlassCard className="p-8 hover:-translate-y-2 transition-transform duration-500">
                            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                                <Sparkles size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2 tracking-wide">...and Many More</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">Total privacy keys, autonomous memory, explicit parameter settings, global community discovery, and lightning-fast chat streaming.</p>
                        </GlassCard>
                    </div>

                </div>
            </main>

            {/* ═══ Dice Result Overlay ═══ */}
            {diceResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setDiceResult(null)}>
                    <div
                        className="relative w-full max-w-lg bg-white/[0.05] backdrop-blur-3xl border border-white/[0.1] rounded-[2rem] shadow-[0_0_80px_rgba(168,85,247,0.15)] overflow-hidden animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Ambient blobs */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px] pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/15 rounded-full blur-[60px] pointer-events-none" />

                        <div className="relative z-10 flex flex-col sm:flex-row">
                            {/* Character Image */}
                            <div className="sm:w-[45%] aspect-[3/4] sm:aspect-auto relative shrink-0">
                                <img src={diceResult.image} alt="Random companion" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent to-black/60" />
                                {/* Floating emoji */}
                                <div className="absolute top-4 left-4 text-4xl drop-shadow-lg animate-bounce">{diceResult.emoji}</div>
                            </div>

                            {/* Traits */}
                            <div className="flex-1 p-6 sm:p-7 flex flex-col justify-center gap-5">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Your Random</p>
                                    <h3 className="text-2xl font-black text-white leading-none">
                                        {diceResult.style} <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Companion</span>
                                    </h3>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: diceResult.gender, bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.3)', text: '#c4b5fd' },
                                        { label: diceResult.style, bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', text: '#93c5fd' },
                                        { label: diceResult.ethnicity, bg: 'rgba(236,72,153,0.12)', border: 'rgba(236,72,153,0.3)', text: '#f9a8d4' },
                                        { label: diceResult.hairStyle, bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d' },
                                        { label: diceResult.bodyType, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7' },
                                        { label: diceResult.personality, bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)', text: '#fda4af' }
                                    ].map(trait => (
                                        <span
                                            key={trait.label}
                                            className="px-3 py-1.5 rounded-full text-[11px] font-bold border"
                                            style={{ background: trait.bg, borderColor: trait.border, color: trait.text }}
                                        >
                                            {trait.label}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={handleDice}
                                        className="flex-1 py-3 rounded-2xl font-bold text-sm border border-white/10 text-gray-300 hover:bg-white/5 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Dices size={16} /> Re-roll
                                    </button>
                                    <button
                                        onClick={handleDiceChat}
                                        className="flex-[2] py-3 rounded-2xl font-black text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle size={16} /> Chat Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="relative z-10 flex items-center justify-center gap-8 py-5 text-[10px] font-bold uppercase tracking-widest text-gray-600 shrink-0 border-t border-white/5">
                <button onClick={() => onOpenPolicies('terms')} className="hover:text-purple-400 transition-colors">Terms</button>
                <button onClick={() => onOpenPolicies('privacy')} className="hover:text-purple-400 transition-colors">Privacy</button>
                <button onClick={() => onOpenPolicies('cookies')} className="hover:text-purple-400 transition-colors">Cookies</button>
            </footer>

            {/* Global shimmer animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer { 100% { transform: translateX(100%); } }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </section>
    );
}
