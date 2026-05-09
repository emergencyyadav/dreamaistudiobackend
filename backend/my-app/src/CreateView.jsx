import React, { useState, useRef, useEffect } from 'react';
import {
    CheckCircle2, Wand2, ArrowRight, Info,
    ChevronDown as ChevronDownIcon, ChevronLeft, ChevronRight,
    User, CreditCard, Smile, User as UserIcon,
    FileText, Image as ImageIcon, Play, Pause,
    X, Search
} from 'lucide-react';
import { supabase } from './supabaseClient';
import { findBestMatchingImage, buildCharacterTags } from './imageSearch';
import { checkContentSafe } from './guard';
import { backendJson, hasBackend } from './backendApi';
import CharacterCreatedModal from './CharacterCreatedModal';

const CREATED_CHARACTER_EVENT = 'dreamai:character-created';
const CHAT_MODEL = 'llama-3.1-8b-instant';

export default function CreateView({ user, sessionInfo, onRequireLogin, onStartChat, coinBalance, onBurnCoin, onRequireUpgrade, onGuard }) {
    const [step, setStep] = useState(1);

    // Auto-scroll to top when step changes
    useEffect(() => {
        const main = document.querySelector('main');
        if (main) {
            main.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [step]);

    // Step 1 — Gender & Style
    const [gender, setGender] = useState('Female');
    const [style, setStyle] = useState('Realistic');

    // Step 2 — Ethnicity & Skin Tone
    const [ethnicity, setEthnicity] = useState('Black');
    const [skinTone, setSkinTone] = useState('#ffcd94');

    // Step 3 — Eyes & Hair
    const [eyeColor, setEyeColor] = useState('blue');
    const [hairColor, setHairColor] = useState('yellow');
    const [hairStyle, setHairStyle] = useState('Braided');

    // Step 4 — Body Type & Features
    const [bodyType, setBodyType] = useState('Slim');
    const [breastSize, setBreastSize] = useState('Medium');
    const [buttSize, setButtSize] = useState('Medium');

    // Step 5 — Persona
    const [charName, setCharName] = useState('');
    const [charAge, setCharAge] = useState(23);
    const [voiceName, setVoiceName] = useState('Default Female');
    const [voiceId, setVoiceId] = useState('oyOgbRLsneo58YVkU7Di');
    const [customVoiceName, setCustomVoiceName] = useState('');
    const [customVoiceId, setCustomVoiceId] = useState('');
    const [personality, setPersonality] = useState('Sweet');
    const [occupation, setOccupation] = useState('');
    const [relationship, setRelationship] = useState('');
    const [fetish, setFetish] = useState('');
    const [hobby, setHobby] = useState('');
    const [startingScene, setStartingScene] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customScenario, setCustomScenario] = useState('');
    const [customPersonality, setCustomPersonality] = useState('');
    const [customTags, setCustomTags] = useState('');
    const [playingVoice, setPlayingVoice] = useState(null);

    // Modal state for persona detail selection
    const [activeModal, setActiveModal] = useState(null); // 'voice' | 'personality' | 'occupation' | 'relationship' | 'fetish' | 'hobby'
    const [modalSearch, setModalSearch] = useState('');

    const [expandedFaq, setExpandedFaq] = useState(null);
    const [showDesignWithAI, setShowDesignWithAI] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Character creation modal state
    const [charCreationStage, setCharCreationStage] = useState('idle'); // 'idle' | 'creating' | 'done'
    const [createdChar, setCreatedChar] = useState(null);

    // ===========================
    // STEP 1 — STYLE IMAGES
    // Replace URLs as needed. Supports .jpg .png .gif .webp
    // ===========================
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

    // ===========================
    // STEP 2 — ETHNICITY IMAGES per gender
    // ===========================
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
                Alien: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131111/grok_image_1773124428694_qsr8eq.jpg",
                Demon: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131576/grok_image_1773124052057_pgoip8.jpg",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Male: {
                Asian: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
                Black: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
                White: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Latina: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Arab: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
                Indian: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
                Elf: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=600",
                Alien: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131111/grok_image_1773124428694_qsr8eq.jpg",
                Demon: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Asian: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=600",
                Black: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                White: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Latina: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Arab: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
                Indian: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=400&h=600",
                Elf: "https://images.unsplash.com/photo-1615814013681-37cd88df6c20?auto=format&fit=crop&q=80&w=400&h=600",
                Alien: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=600",
                Demon: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
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
                Alien: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218326/grok_image_1773211692189_bobc7n.jpg",
                Demon: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218340/grok_image_1773211649921_p50vnb.jpg",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Male: {
                Asian: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
                Black: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
                White: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Latina: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Arab: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
                Indian: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
                Elf: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=600",
                Alien: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131111/grok_image_1773124428694_qsr8eq.jpg",
                Demon: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Asian: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=600",
                Black: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                White: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Latina: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Arab: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
                Indian: "https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=400&h=600",
                Elf: "https://images.unsplash.com/photo-1615814013681-37cd88df6c20?auto=format&fit=crop&q=80&w=400&h=600",
                Alien: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=600",
                Demon: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            }
        }
    };

    const ethnicityList = [
        { name: 'Asian' }, { name: 'Black' }, { name: 'White' },
        { name: 'Latina' }, { name: 'Arab' }, { name: 'Indian' },
        { name: 'Elf' }, { name: 'Alien' }, { name: 'Demon' },
        { name: 'Custom', premium: true }
    ];

    const skinTones = ['#ffe0bd', '#ffcd94', '#eac086', '#ffad60', '#8d5524', '#c68642', '#3d2210', '#1a110a'];

    // ===========================
    // STEP 3 — COLORS
    // ===========================
    const colors = [
        { id: 'black', hex: '#1a1a1a', label: 'Black' },
        { id: 'brown', hex: '#5c3a21', label: 'Brown' },
        { id: 'red', hex: '#e34234', label: 'Red' },
        { id: 'yellow', hex: '#ffd700', label: 'Blonde' },
        { id: 'green', hex: '#2ecc71', label: 'Green' },
        { id: 'blue', hex: '#3498db', label: 'Blue' },
        { id: 'purple', hex: '#9b59b6', label: 'Purple' },
        { id: 'pink', hex: '#ff69b4', label: 'Pink' },
        { id: 'white', hex: '#ffffff', label: 'White' },
        { id: 'gray', hex: '#bdc3c7', label: 'Gray' }
    ];

    // ===========================
    // STEP 3 — HAIRSTYLE IMAGES per gender
    // ===========================
    const hairStyleImages = {
        Realistic: {
            Female: {
                Braided: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218382/grok_image_1773211547107_ixdktr.jpg",
                Long: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217978/grok_image_1773211489342_rf7gwt.jpg",
                Bangs: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131651/grok_image_1773119697490_upoq6h.jpg",
                Ponytail: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217961/grok_image_1773211497307_ty64yp.jpg",
                Short: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217967/grok_image_1773211502443_jrqy8n.jpg",
                Bun: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773138833/grok_image_1773138720208_cg8hrj.jpg",
                Buns: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217939/grok_image_1773211515109_vwxsel.jpg",
                Wavy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217964/grok_image_1773211492095_aczbqg.jpg",
                Pixie: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773138846/grok_image_1773138735226_iz9uv9.jpg",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Male: {
                Braided: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
                Long: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Bangs: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
                Ponytail: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Short: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
                Bun: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
                Buns: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=600",
                Wavy: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600",
                Pixie: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Braided: "https://images.unsplash.com/photo-1588665793016-5e589cc5f2da?auto=format&fit=crop&q=80&w=400&h=600",
                Long: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                Bangs: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Ponytail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Short: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
                Bun: "https://images.unsplash.com/photo-1531123897727-8f129e1bf08c?auto=format&fit=crop&q=80&w=400&h=600",
                Buns: "https://images.unsplash.com/photo-1615814013681-37cd88df6c20?auto=format&fit=crop&q=80&w=400&h=600",
                Wavy: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=600",
                Pixie: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            }
        },
        Anime: {
            Female: {
                Braided: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773211547107_fxzpdx.jpg",
                Long: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773223439/grok_image_1773223367259_uzucqa.jpg",
                Bangs: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773218863936_dnmfkh.jpg",
                Ponytail: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217961/grok_image_1773211497307_ty64yp.jpg",
                Short: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773223441/grok_image_1773223366139_uxxfm1.jpg",
                Bun: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217939/grok_image_1773211515109_vwxsel.jpg",
                Buns: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217966/grok_image_1773211485457_qbski4.jpg",
                Wavy: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773217964/grok_image_1773211492095_aczbqg.jpg",
                Pixie: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773222917/grok_image_1773211502443_uqic6q.jpg",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Male: {
                Braided: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600",
                Long: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Bangs: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=600",
                Ponytail: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Short: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400&h=600",
                Bun: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?auto=format&fit=crop&q=80&w=400&h=600",
                Buns: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=600",
                Wavy: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600",
                Pixie: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1519058082700-08a0b56da9b4?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Braided: "https://images.unsplash.com/photo-1588665793016-5e589cc5f2da?auto=format&fit=crop&q=80&w=400&h=600",
                Long: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                Bangs: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Ponytail: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Short: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400&h=600",
                Bun: "https://images.unsplash.com/photo-1531123897727-8f129e1bf08c?auto=format&fit=crop&q=80&w=400&h=600",
                Buns: "https://images.unsplash.com/photo-1615814013681-37cd88df6c20?auto=format&fit=crop&q=80&w=400&h=600",
                Wavy: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=600",
                Pixie: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=400&h=600",
                Custom: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=400&h=600"
            }
        }
    };

    const hairStyleList = [
        { name: 'Braided' }, { name: 'Long' }, { name: 'Bangs' },
        { name: 'Ponytail' }, { name: 'Short' }, { name: 'Bun' },
        { name: 'Buns' }, { name: 'Wavy' }, { name: 'Pixie' },
        { name: 'Custom', premium: true }
    ];

    // ===========================
    // STEP 4 — BODY TYPE IMAGES per gender
    // Replace with your own images/gifs
    // ===========================
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
                Bulky: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Muscular: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Dad_Bod: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Slim: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                Athletic: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&q=80&w=400&h=600",
                Voluptuous: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Curvy: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Muscular: "https://images.unsplash.com/photo-1531123897727-8f129e1bf08c?auto=format&fit=crop&q=80&w=400&h=600"
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
                Bulky: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=600",
                Muscular: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=600",
                Dad_Bod: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=600"
            },
            Trans: {
                Slim: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=600",
                Athletic: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&q=80&w=400&h=600",
                Voluptuous: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=600",
                Curvy: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=600",
                Muscular: "https://images.unsplash.com/photo-1531123897727-8f129e1bf08c?auto=format&fit=crop&q=80&w=400&h=600"
            }
        }
    };

    const bodyTypeList = {
        Female: ['Slim', 'Athletic', 'Voluptuous', 'Curvy', 'Muscular'],
        Male: ['Slim', 'Athletic', 'Bulky', 'Muscular', 'Dad_Bod'],
        Trans: ['Slim', 'Athletic', 'Voluptuous', 'Curvy', 'Muscular']
    };

    // BREAST SIZE IMAGES per gender (Female & Trans only)
    // Replace URLs with your own
    const breastSizeImages = {
        Realistic: {
            Female: {
                Flat: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143751/IMG_20260310_170657_q2nb3k.jpg",
                Small: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143746/IMG_20260310_170609_n1gdsn.jpg",
                Medium: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143751/IMG_20260310_170929_v7fbxm.jpg",
                Large: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143742/IMG_20260310_171106_tsfcg0.jpg",
                XL: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143742/IMG_20260310_170712_cvye9y.jpg"
            },
            Trans: {
                Flat: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400&h=500",
                Small: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=500",
                Medium: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=500",
                Large: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=500",
                XL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=500"
            }
        },
        Anime: {
            Female: {
                Flat: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143751/IMG_20260310_170657_q2nb3k.jpg",
                Small: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143746/IMG_20260310_170609_n1gdsn.jpg",
                Medium: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143751/IMG_20260310_170929_v7fbxm.jpg",
                Large: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143742/IMG_20260310_171106_tsfcg0.jpg",
                XL: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143742/IMG_20260310_170712_cvye9y.jpg"
            },
            Trans: {
                Flat: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400&h=500",
                Small: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=500",
                Medium: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=500",
                Large: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=500",
                XL: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=500"
            }
        }
    };

    const breastSizeList = ['Flat', 'Small', 'Medium', 'Large', 'XL'];

    // BUTT SIZE IMAGES per gender
    // Replace URLs with your own
    const buttSizeImages = {
        Realistic: {
            Female: {
                Small: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773143433/grok_image_1773143357818_u4n4td.jpg",
                Skinny: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131406/grok_image_1773124169288_dbiccw.jpg",
                Athletic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131381/grok_image_1773124198389_x7ocgm.jpg",
                Medium: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131387/grok_image_1773124186019_lk1hwv.jpg",
                Large: "b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=500"
            },
            Male: {
                Small: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=500",
                Skinny: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=500",
                Athletic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=500",
                Medium: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=500",
                Large: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=500"
            },
            Trans: {
                Small: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400&h=500",
                Skinny: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=400&h=500",
                Athletic: "https://images.unsplash.com/photo-1518310952931-b1de897abd40?auto=format&fit=crop&q=80&w=400&h=500",
                Medium: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400&h=500",
                Large: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400&h=500"
            }
        },
        Anime: {
            Female: {
                Small: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224282/grok_image_1773224257855_lh4kfx.jpg",
                Skinny: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131406/grok_image_1773124169288_dbiccw.jpg",
                Athletic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218384/grok_image_1773211575774_yjqkte.jpg",
                Medium: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224644/grok_image_1773224047302_g2xfyi.jpg",
                Large: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224440/grok_image_1773224140835_ptujth.jpg"
            },
            Male: {
                Small: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=500",
                Skinny: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=500",
                Athletic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400&h=500",
                Medium: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400&h=500",
                Large: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400&h=500"
            },
            Trans: {
                Small: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224282/grok_image_1773224257855_lh4kfx.jpg",
                Skinny: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773131406/grok_image_1773124169288_dbiccw.jpg",
                Athletic: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218384/grok_image_1773211575774_yjqkte.jpg",
                Medium: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773218371/grok_image_1773211578639_s7uqy1.jpg",
                Large: "https://res.cloudinary.com/dtjyfw1op/image/upload/v1773224440/grok_image_1773224140835_ptujth.jpg",
            }
        }
    };

    const buttSizeList = ['Small', 'Skinny', 'Athletic', 'Medium', 'Large'];

    // ===========================
    // STEP 5 — PERSONA DATA
    // ===========================

    // VOICES dynamically mapped to gender with realistic IDs
    const voiceOptionsMap = {
        Female: [
            { name: 'Bella', emoji: '🍯', id: 'EXAVITQu4vr4xnSDxMaL' },
            { name: 'Rachel', emoji: '🌅', id: '21m00Tcm4TlvDq8ikWAM' },
            { name: 'Domi', emoji: '💋', id: 'AZnzlk1XvdvUeBnXmlld' },
            { name: 'Mimi', emoji: '🥰', id: 'zrHiDhphv9RhvfB52Ozh' },
            { name: 'Shreya (Hindi)', emoji: '🌺', id: 'Oq0cIHWGcnbOGozOQv0t' },
            { name: 'Anaissa (English)', emoji: '🇬🇧', id: 'DU2z7JKzyitx4FdXpJBR' },
            { name: 'Aussie (Australian)', emoji: '🦘', id: 'jQQiXyFE3PBHLF8znAIb' },
            { name: 'Shenzi (Korean)', emoji: '🌸', id: '0oqpliV6dVSr9XomngOW' },
            { name: 'Vega (Russian)', emoji: '❄️', id: 'pTX8uGyVgHCWLj6IkcbC' },
            { name: 'Custom Voice', emoji: '⚙️', id: 'custom' }
        ],
        Male: [
            { name: 'Adam', emoji: '👔', id: 'pNInz6obpgDQGcFmaJgB' },
            { name: 'Antoni', emoji: '😎', id: 'ErXwobaYiN019PkySvjV' },
            { name: 'Josh', emoji: '🏋️', id: 'TxGEqnHWrfWFTfGW9XjX' },
            { name: 'Arnold', emoji: '🦾', id: 'VR6AewLTigWG4xSOukaG' },
            { name: 'Custom Voice', emoji: '⚙️', id: 'custom' }
        ],
        Trans: [
            { name: 'Bella', emoji: '🍯', id: 'EXAVITQu4vr4xnSDxMaL' },
            { name: 'Rachel', emoji: '🌅', id: '21m00Tcm4TlvDq8ikWAM' },
            { name: 'Domi', emoji: '💋', id: 'AZnzlk1XvdvUeBnXmlld' },
            { name: 'Shreya (Hindi)', emoji: '🌺', id: 'Oq0cIHWGcnbOGozOQv0t' },
            { name: 'Anaissa (English)', emoji: '🇬🇧', id: 'DU2z7JKzyitx4FdXpJBR' },
            { name: 'Aussie (Australian)', emoji: '🦘', id: 'jQQiXyFE3PBHLF8znAIb' },
            { name: 'Shenzi (Korean)', emoji: '🌸', id: '0oqpliV6dVSr9XomngOW' },
            { name: 'Vega (Russian)', emoji: '❄️', id: 'pTX8uGyVgHCWLj6IkcbC' },
            { name: 'Custom Voice', emoji: '⚙️', id: 'custom' }
        ]
    };

    // PERSONALITIES
    const personalityOptions = [
        { name: 'Custom', emoji: '🖌️', premium: true },
        { name: 'Sweet', emoji: '🥰' },
        { name: 'Flirty', emoji: '💋' },
        { name: 'Shy', emoji: '🌸' },
        { name: 'Playful', emoji: '✨' },
        { name: 'Mysterious', emoji: '🌙' },
        { name: 'Sassy', emoji: '💅' },
        { name: 'Tsundere', emoji: '😤' },
        { name: 'Yandere', emoji: '🔪' },
        { name: 'Dominant', emoji: '⛓️' },
        { name: 'Submissive', emoji: '🥺' },
        { name: 'Intellectual', emoji: '🧠' },
        { name: 'Adventurous', emoji: '🔥' },
        { name: 'Caring', emoji: '💖' },
        { name: 'Witty', emoji: '😏' },
        { name: 'Passionate', emoji: '❤️' },
        { name: 'Charming', emoji: '✨' },
        { name: 'Quirky', emoji: '🤪' },
        { name: 'Seductive', emoji: '😘' },
        { name: 'Gentle', emoji: '🕊️' },
        { name: 'Confident', emoji: '💪' },
        { name: 'Mischievous', emoji: '😈' },
        { name: 'Dreamy', emoji: '🌈' },
        { name: 'Artistic', emoji: '🎨' },
        { name: 'Analytical', emoji: '🔍' },
        { name: 'Enthusiastic', emoji: '🤩' },
        { name: 'Rebellious', emoji: '🤘' },
        { name: 'Melancholic', emoji: '🥀' },
        { name: 'Romantic', emoji: '💝' },
        { name: 'Protective', emoji: '🛡️' },
        { name: 'Nurturing', emoji: '🌱' },
        { name: 'Ambitious', emoji: '🏆' },
        { name: 'Diplomatic', emoji: '🤝' },
        { name: 'Stoic', emoji: '🗿' },
        { name: 'Optimistic', emoji: '☀️' },
        { name: 'Pessimistic', emoji: '☁️' },
        { name: 'Spiritual', emoji: '✨' },
        { name: 'Pragmatic', emoji: '🧰' },
        { name: 'Eccentric', emoji: '🎭' },
        { name: 'Empathetic', emoji: '🫂' },
        { name: 'Introspective', emoji: '🧘' },
        { name: 'Intense', emoji: '⚡' },
        { name: 'Charismatic', emoji: '🌟' }
    ];

    // OCCUPATIONS
    const occupationOptions = [
        { name: 'Custom', emoji: '🖌️', premium: true },
        { name: 'None', emoji: '⚪' },
        { name: 'Nurse', emoji: '🏥' },
        { name: 'Doctor', emoji: '🩺' },
        { name: 'Teacher', emoji: '📖' },
        { name: 'Professor', emoji: '🎓' },
        { name: 'Student', emoji: '📚' },
        { name: 'Model', emoji: '📸' },
        { name: 'Artist', emoji: '🎨' },
        { name: 'Chef', emoji: '👨‍🍳' },
        { name: 'Scientist', emoji: '🔬' },
        { name: 'Athlete', emoji: '⚽' },
        { name: 'Musician', emoji: '🎵' },
        { name: 'Gamer', emoji: '🎮' },
        { name: 'Programmer', emoji: '💻' },
        { name: 'Dancer', emoji: '💃' },
        { name: 'Streamer', emoji: '📺' },
        { name: 'Soldier', emoji: '🎖️' },
        { name: 'Witch', emoji: '🧙‍♀️' },
        { name: 'Assassin', emoji: '🗡️' },
        { name: 'Royal', emoji: '👸' },
        { name: 'Maid', emoji: '🧹' },
        { name: 'Entrepreneur', emoji: '💼' },
        { name: 'Bartender', emoji: '🍸' },
        { name: 'Librarian', emoji: '📕' },
        { name: 'Pilot', emoji: '✈️' },
        { name: 'Detective', emoji: '🔎' },
        { name: 'Lawyer', emoji: '⚖️' },
        { name: 'Photographer', emoji: '📷' },
        { name: 'Influencer', emoji: '📱' },
        { name: 'Therapist', emoji: '🛋️' },
        { name: 'Firefighter', emoji: '🚒' },
        { name: 'Mechanic', emoji: '🔧' },
        { name: 'Writer', emoji: '✍️' },
        { name: 'Actress', emoji: '🎭' },
        { name: 'Singer', emoji: '🎤' },
        { name: 'Spy', emoji: '🕵️' },
        { name: 'Pirate', emoji: '🏴‍☠️' },
        { name: 'Vampire', emoji: '🧛' },
        { name: 'Angel', emoji: '😇' }
    ];

    // RELATIONSHIPS
    const relationshipOptions = [
        { name: 'Custom', emoji: '🖌️', premium: true },
        { name: 'None', emoji: '⚪' },
        { name: 'Step-Mum', emoji: '👩‍👧' },
        { name: 'Step-Sister', emoji: '👭' },
        { name: 'Step-Daughter', emoji: '👧' },
        { name: 'Lover', emoji: '❤️' },
        { name: 'Friend', emoji: '👫' },
        { name: 'Stranger', emoji: '🤔' },
        { name: 'Crush', emoji: '😍' },
        { name: 'Ex', emoji: '💔' },
        { name: 'Roommate', emoji: '🏠' },
        { name: 'Colleague', emoji: '💼' },
        { name: 'Classmate', emoji: '📚' },
        { name: 'Mentor', emoji: '🧠' },
        { name: 'Student', emoji: '📝' },
        { name: 'Neighbor', emoji: '🏡' },
        { name: 'Secret Admirer', emoji: '👀' },
        { name: 'Rival', emoji: '⚔️' },
        { name: 'Boss', emoji: '👔' },
        { name: 'Employee', emoji: '📋' },
        { name: 'Family Friend', emoji: '👪' },
        { name: 'Therapist', emoji: '🛋️' },
        { name: 'Client', emoji: '💰' },
        { name: 'Online Friend', emoji: '💻' },
        { name: 'Fling', emoji: '🔥' }
    ];

    // FETISHES
    const fetishOptions = [
        { name: 'Custom', emoji: '🖌️', premium: true },
        { name: 'None', emoji: '⚪' },
        { name: 'Vanilla', emoji: '🍦' },
        { name: 'Roleplay', emoji: '🎭' },
        { name: 'Lingerie', emoji: '👙' },
        { name: 'High Heels', emoji: '👠' },
        { name: 'Stockings', emoji: '🦵' },
        { name: 'Uniforms', emoji: '👮' },
        { name: 'Feet', emoji: '🦶' },
        { name: 'Muscle Worship', emoji: '💪' },
        { name: 'Crossdressing', emoji: '👗' },
        { name: 'Leather', emoji: '🧥' },
        { name: 'Latex', emoji: '🧤' },
        { name: 'Corsets', emoji: '⏳' },
        { name: 'Spanking', emoji: '👋' },
        { name: 'Tickling', emoji: '🤏' },
        { name: 'Hair Fetish', emoji: '✂️' },
        { name: 'Voyeurism', emoji: '👀' },
        { name: 'Exhibitionism', emoji: '😳' },
        { name: 'Public Play', emoji: '🏞️' },
        { name: 'Group Encounters', emoji: '👥' },
        { name: 'Swinging', emoji: '🔄' },
        { name: 'Blindfolds', emoji: '🙈' },
        { name: 'Gags', emoji: '🤐' },
        { name: 'Collars', emoji: '🔗' },
        { name: 'Bondage (Shibari)', emoji: '🪢' },
        { name: 'Impact Play', emoji: '💥' },
        { name: 'Temperature Play', emoji: '❄️' },
        { name: 'Wax Play', emoji: '🕯️' },
        { name: 'Sensory Deprivation', emoji: '⚫' },
        { name: 'Humiliation', emoji: '😳' },
        { name: 'Objectification', emoji: '🧍‍♀️' },
        { name: 'FemDom', emoji: '👑' },
        { name: 'Dom', emoji: '🤴' },
        { name: 'FemSub', emoji: '🧎‍♀️' },
        { name: 'Sub', emoji: '🧎‍♂️' },
        { name: 'Hotwifing', emoji: '🔥' },
        { name: 'Cuckolding', emoji: '💔' },
        { name: 'Stag', emoji: '👁️' },
        { name: 'Sharing', emoji: '🎁' },
        { name: 'Compersion Kink', emoji: '😊' },
        { name: 'Exhibitionist', emoji: '👀' },
        { name: 'Clean-up Duty', emoji: '🧹' },
        { name: 'Masks', emoji: '🎭' },
        { name: 'Tentacles', emoji: '🦑' },
        { name: 'Body Modification', emoji: '💉' },
        { name: 'Freeuse', emoji: '🔓' },
        { name: 'Hypnosis', emoji: '🌀' },
        { name: 'Mind Control', emoji: '🧠' },
        { name: 'Pet Play', emoji: '🐶' },
        { name: 'Furry Fandom', emoji: '🐺' },
        { name: 'Transformation', emoji: '🦋' },
        { name: 'Medical Play', emoji: '🩺' },
        { name: 'Food Play', emoji: '🍓' },
        { name: 'Wet & Messy', emoji: '⚫' },
        { name: 'Inflation', emoji: '🎈' },
        { name: 'Freezing', emoji: '🥶' },
        { name: 'Body Painting', emoji: '🎨' },
        { name: 'Cyborgs', emoji: '🤖' },
        { name: 'Monster/Non-human', emoji: '👾' },
        { name: 'Smoking Fetish', emoji: '🚬' },
        { name: 'Asphyxiation', emoji: '😮‍💨' },
        { name: 'Sperm Thief Fantasy', emoji: '🧬' },
        { name: 'Somnophilia', emoji: '😴' },
        { name: 'Abduction Fantasy', emoji: '😨' }
    ];

    // HOBBIES
    const hobbyOptions = [
        { name: 'Custom', emoji: '🖌️', premium: true },
        { name: 'None', emoji: '⚪' },
        { name: 'Gaming', emoji: '🎮' },
        { name: 'Reading', emoji: '📚' },
        { name: 'Cooking', emoji: '🍳' },
        { name: 'Traveling', emoji: '✈️' },
        { name: 'Fitness', emoji: '🏋️' },
        { name: 'Music', emoji: '🎵' },
        { name: 'Art', emoji: '🎨' },
        { name: 'Dancing', emoji: '💃' },
        { name: 'Photography', emoji: '📷' },
        { name: 'Shopping', emoji: '🛍️' },
        { name: 'Movies', emoji: '🎬' },
        { name: 'Anime', emoji: '🌸' },
        { name: 'Yoga', emoji: '🧘' },
        { name: 'Hiking', emoji: '🥾' },
        { name: 'Swimming', emoji: '🏊' },
        { name: 'Gardening', emoji: '🌱' },
        { name: 'Writing', emoji: '✍️' },
        { name: 'Crafts', emoji: '🧶' },
        { name: 'Skateboarding', emoji: '🛹' },
        { name: 'Surfing', emoji: '🏄' },
        { name: 'Cycling', emoji: '🚴' },
        { name: 'Meditation', emoji: '🕊️' },
        { name: 'Astrology', emoji: '🔮' },
        { name: 'Board Games', emoji: '🎲' },
        { name: 'Karaoke', emoji: '🎤' },
        { name: 'Cosplay', emoji: '🎭' },
        { name: 'Baking', emoji: '🧁' },
        { name: 'Fishing', emoji: '🎣' },
        { name: 'Camping', emoji: '⛺' },
        { name: 'Martial Arts', emoji: '🥋' },
        { name: 'Wine Tasting', emoji: '🍷' },
        { name: 'Collecting', emoji: '🗃️' },
        { name: 'Volunteering', emoji: '🤝' },
        { name: 'Streaming', emoji: '📺' },
        { name: 'Podcasting', emoji: '🎙️' },
        { name: 'Fashion', emoji: '👗' },
        { name: 'Cars', emoji: '🏎️' },
        { name: 'Science', emoji: '🔬' }
    ];

    // ===========================
    // HELPERS
    // ===========================
    const getEthnicityImage = (name) => ethnicityImages[style]?.[gender]?.[name] || ethnicityImages.Realistic?.[gender]?.[name] || ethnicityImages.Realistic.Female[name];
    const getHairStyleImage = (name) => hairStyleImages[style]?.[gender]?.[name] || hairStyleImages.Realistic?.[gender]?.[name] || hairStyleImages.Realistic.Female[name];
    const getBodyTypeImage = (name) => bodyTypeImages[style]?.[gender]?.[name] || bodyTypeImages.Realistic?.[gender]?.[name] || bodyTypeImages.Realistic.Female[name];
    const getBreastSizeImage = (name) => breastSizeImages[style]?.[gender]?.[name] || breastSizeImages.Realistic?.[gender]?.[name] || breastSizeImages.Realistic.Female?.[name];
    const getButtSizeImage = (name) => buttSizeImages[style]?.[gender]?.[name] || buttSizeImages.Realistic?.[gender]?.[name] || buttSizeImages.Realistic.Female[name];

    const titleSuffix = gender === 'Female' ? 'Girl' : gender === 'Male' ? 'Boy' : 'Trans';

    const handlePlayVoice = (voiceName) => {
        // TODO: Replace with actual audio playback logic
        // Each voice in voiceOptions has an 'audio' field — set it to the audio file URL
        if (playingVoice === voiceName) {
            setPlayingVoice(null);
        } else {
            setPlayingVoice(voiceName);
            // Simulate stop after 2s
            setTimeout(() => setPlayingVoice(null), 2000);
        }
    };

    const toggleFaq = (index) => {
        setExpandedFaq(expandedFaq === index ? null : index);
    };

    const faqs = [
        { q: "How many messages can I send?", a: "Free accounts allow up to 50 messages with AI companions. Premium subscriptions unlock unlimited messaging." },
        { q: "Is there a free trial?", a: "Yes. New users receive 55 tokens when signing up for free." },
        { q: "Can I customize beyond the presets?", a: "Yes. Premium users can use the custom prompt feature." },
        { q: "Where can I chat with my AI?", a: "Go to the chat page where your AI character lives." },
        { q: "How much does it cost to generate a character?", a: "Creating a character costs 5 tokens." }
    ];

    // ===========================
    // PROGRESS BAR
    // ===========================
    const stepIcons = [User, CreditCard, Smile, UserIcon, FileText, ImageIcon];

    const renderProgressBar = () => (
        <div className="flex items-center justify-center gap-1.5 md:gap-3 mb-10 mt-4">
            {stepIcons.map((Icon, idx) => (
                <React.Fragment key={idx}>
                    <div
                        onClick={() => setStep(idx + 1)}
                        className={`relative flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-all duration-300 hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] ${step > idx + 1 ? 'bg-pink-500/20' : step === idx + 1 ? 'bg-purple-500/20 ring-2 ring-purple-500' : 'bg-gray-800'}`}
                    >
                        <Icon size={14} className={step > idx ? 'text-pink-400' : 'text-gray-600'} />
                    </div>
                    {idx < 5 && (
                        <div className={`w-6 md:w-10 h-0.5 transition-colors duration-300 ${step > idx + 1 ? 'bg-pink-500' : 'bg-gray-800'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    // ===========================
    // REUSABLE COMPONENTS
    // ===========================
    const GenderBadge = () => (
        <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-sm text-gray-300">
                {gender === 'Female' && <span className="text-pink-400">♀</span>}
                {gender === 'Male' && <span className="text-blue-400">♂</span>}
                {gender === 'Trans' && <span className="text-purple-400">⚧</span>}
                {gender} • {style}
                {step >= 3 && <> • {ethnicity}</>}
            </span>
        </div>
    );

    const NavButtons = ({ onBack, onNext, nextLabel = 'Next', nextDisabled = false }) => (
        <div className="flex justify-center gap-4 mt-8 mb-8">
            <button onClick={onBack} className="px-8 py-3 rounded-xl font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors">
                ← Back
            </button>
            <button
                onClick={onNext}
                disabled={nextDisabled}
                className={`group px-12 py-3 rounded-xl font-black bg-gradient-to-r from-pink-500 to-purple-500 text-white transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] flex items-center gap-2 ${nextDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]'}`}
            >
                {nextLabel}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );

    // ===========================
    // SELECTION MODAL
    // ===========================
    const getModalData = () => {
        switch (activeModal) {
            case 'voice': return { title: 'Select Voice', items: voiceOptionsMap[gender] || voiceOptionsMap['Female'], selected: voiceName, onSelect: (vName, vId) => { setVoiceName(vName); setVoiceId(vId); } };
            case 'personality': return { title: 'Select Personality', items: personalityOptions, selected: personality, onSelect: setPersonality };
            case 'occupation': return { title: 'Select Occupation', items: occupationOptions, selected: occupation, onSelect: setOccupation };
            case 'relationship': return { title: 'Select Relationship', items: relationshipOptions, selected: relationship, onSelect: setRelationship };
            case 'fetish': return { title: 'Select Fetish', items: fetishOptions, selected: fetish, onSelect: setFetish };
            case 'hobby': return { title: 'Select Hobby', items: hobbyOptions, selected: hobby, onSelect: setHobby };
            default: return null;
        }
    };

    const renderModal = () => {
        const data = getModalData();
        if (!data) return null;

        const filtered = data.items.filter(item =>
            item.name.toLowerCase().includes(modalSearch.toLowerCase())
        );

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setActiveModal(null); setModalSearch(''); }}>
                <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                        <h3 className="text-xl font-bold text-white">{data.title}</h3>
                        <button onClick={() => { setActiveModal(null); setModalSearch(''); }} className="text-gray-400 hover:text-white transition-colors p-1">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 py-3 border-b border-gray-800">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={modalSearch}
                                onChange={(e) => setModalSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Items Grid */}
                    <div className="p-4 overflow-y-auto max-h-[55vh]">
                        {activeModal === 'voice' ? (
                            // Voice has special layout with play button
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {filtered.map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => { data.onSelect(item.name, item.id); }}
                                            className={`relative flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all duration-300 text-left ${data.selected === item.name
                                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50'
                                                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                                }`}
                                        >
                                            <span className="text-xl">{item.emoji}</span>
                                            <span className="text-sm font-bold flex-1">{item.name}</span>
                                            {/* Play button */}
                                            {item.id !== 'custom' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePlayVoice(item.name); }}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${playingVoice === item.name
                                                        ? 'bg-pink-500 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-pink-500/30 hover:text-pink-300'
                                                        }`}
                                                >
                                                    {playingVoice === item.name ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                                                </button>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {data.selected === 'Custom Voice' && (
                                    <div className="p-4 bg-gray-900/50 border border-pink-500/30 rounded-xl space-y-3 mt-2 animate-in fade-in duration-300">
                                        <label className="block text-sm font-bold text-pink-400 mb-1">Paste Your Custom Voice details</label>
                                        <input
                                            type="text"
                                            placeholder="Voice Name (e.g. Scarlett)"
                                            value={customVoiceName}
                                            onChange={(e) => setCustomVoiceName(e.target.value)}
                                            className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500"
                                        />
                                        <input
                                            type="text"
                                            placeholder="ElevenLabs Voice ID (e.g. EXAVITQu4vr4xnSDxMaL)"
                                            value={customVoiceId}
                                            onChange={(e) => setCustomVoiceId(e.target.value.trim())}
                                            className="w-full px-4 py-3 bg-black/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-pink-500 font-mono text-sm"
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Standard grid for everything else
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                                {filtered.map((item) => (
                                    <button
                                        key={item.name}
                                        onClick={() => { data.onSelect(item.name); setActiveModal(null); setModalSearch(''); }}
                                        className={`relative px-3 py-3 rounded-xl font-bold text-center transition-all duration-300 ${data.selected === item.name
                                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/50 scale-105'
                                            : 'bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                            }`}
                                    >
                                        {item.premium && (
                                            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">PRO</span>
                                        )}
                                        <div className="text-xl mb-1">{item.emoji}</div>
                                        <div className="text-[11px] font-bold leading-tight">{item.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filtered.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                No results found for "{modalSearch}"
                            </div>
                        )}
                    </div>

                    {/* Done button for voice modal */}
                    {activeModal === 'voice' && (
                        <div className="px-6 py-4 border-t border-gray-800">
                            <button
                                onClick={() => { setActiveModal(null); setModalSearch(''); }}
                                className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-[1.02] transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ===========================
    // AI CHARACTER GENERATION
    // ===========================
    const handleDesignWithAI = async () => {
        if (!aiPrompt.trim()) return;
        if (!user) {
            if (onRequireLogin) onRequireLogin();
            return;
        }

        // Deduct 5 Bolt Coins
        const ok = await onBurnCoin(5);
        if (!ok) {
            if (onRequireUpgrade) onRequireUpgrade();
            return;
        }

        setIsGenerating(true);
        setCharCreationStage('creating');
        try {
            let persona = aiPrompt;
            let name = "AI Generated Companion";
            let tags = [gender, style];
            let targetAge = 22;
            let extractedEthnicity = '';  // Will be extracted from AI response

            if (hasBackend) {
                const systemPrompt = `You are an expert, highly creative AI character designer.
Based on the provided prompt and fantasy description, create a compelling character. 
You MUST format your output strictly as a JSON object with the following keys:
"name": A fitting, creative name for the character.
"age": A number representing their age (between 18 and 90).
"ethnicity": The character's ethnicity/race as mentioned or implied by the user (e.g. "Latina", "Asian", "Caucasian", "Black", "Middle Eastern", "Indian", "Mixed"). Infer this carefully from the user's description. If they say "latina" return "Latina", if they say "asian" return "Asian", etc. NEVER default to a different ethnicity than what the user described.
"persona": A concise, engaging 20-30 word summary explaining their appearance, vibe, quirks, and relationship to the user. Do NOT make it longer than 30 words!
"tags": An array of strings containing up to 6 descriptive tags/tropes (e.g. "Gamer", "Tsundere", "Artist").

Do NOT include any extra text outside the JSON object.`;

                const apiMessages = [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Base Constraints: ${gender} character, ${style} style. User Fantasy/Description: ${aiPrompt}` }
                ];

                try {
                    const response = {
                        ok: true, json: async () => backendJson('/api/ai/chat', {
                            method: 'POST',
                            sessionInfo,
                            body: {
                                provider: 'groq',
                                model: CHAT_MODEL,
                                messages: apiMessages,
                                response_format: { type: 'json_object' }
                            }
                        })
                    };

                    if (response.ok) {
                        const data = await response.json();
                        try {
                            const parsed = JSON.parse(data.choices[0].message.content);
                            if (parsed.persona) persona = parsed.persona;
                            if (parsed.name) name = parsed.name;
                            if (parsed.age) targetAge = parsed.age;
                            if (parsed.ethnicity) extractedEthnicity = parsed.ethnicity;
                            if (parsed.tags && Array.isArray(parsed.tags)) {
                                tags = [...tags, ...parsed.tags];
                            }
                        } catch (e) {
                            console.error("Failed to parse AI JSON response", e);
                        }
                    } else {
                        console.error("Failed to fetch from Groq");
                    }
                } catch (apiErr) {
                    console.warn("Groq API error or blocked. Using fallback traits.", apiErr.message);
                }
            }

            // ── Auto-generate best matching image via img gen api ──
            const FALLBACK = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';
            let bestImage = null;

            if (hasBackend) {
                try {
                    const isRealistic = style === 'Realistic';
                    const imageModel = isRealistic ? 'flux-2-dev' : 'wavespeed-ai/chroma';

                    // Use AI-extracted ethnicity if available, otherwise try to detect from user prompt, finally fall back to selected ethnicity
                    const imageEthnicity = extractedEthnicity || ethnicity;

                    const qualityPrefix = isRealistic
                        ? 'Photorealistic portrait of a character, seductive theme, casual portrait, natural skin texture, soft flattering lighting, shallow depth of field, ultra-detailed, high resolution'
                        : 'Masterpiece, best quality, high-quality anime illustration, vibrant colors, detailed shading, beautiful lighting, trending on Pixiv';

                    const environmentHint = isRealistic
                        ? 'background and facial expression matching the character personality, natural relaxed pose, intimate casual setting, warm ambient lighting'
                        : 'with a beautifully detailed anime background, soft pastel tones, atmospheric lighting';

                    const uniqueTags = [...new Set(tags)].filter(t =>
                        t.toLowerCase() !== gender.toLowerCase() &&
                        t.toLowerCase() !== style.toLowerCase() &&
                        t.toLowerCase() !== imageEthnicity.toLowerCase()
                    );
                    const searchPrompt = `${qualityPrefix}, ${gender} ${imageEthnicity} person, ${uniqueTags.join(', ')}, ${persona}, ${environmentHint}`;

                    console.log('[Create/AI] Image prompt:', searchPrompt);
                    console.log('[Create/AI] Using model:', imageModel);

                    const imgData = await backendJson('/api/images/generate', {
                        method: 'POST',
                        sessionInfo,
                        body: {
                            prompt: searchPrompt,
                            width: 768,
                            height: 1024,
                            count: 1,
                            model: imageModel
                        }
                    });
                    if (imgData && imgData.urls && imgData.urls.length > 0) {
                        bestImage = imgData.urls[0];
                        console.log('[Create/AI] ✅ Image generated:', bestImage);
                    } else {
                        console.error('[Create/AI] ❌ No URLs in response. Full response:', JSON.stringify(imgData));
                    }
                } catch (imgErr) {
                    console.error('[Create/AI] ❌ Image generation FAILED:', imgErr.message);
                    console.error('[Create/AI] Full error:', imgErr);
                }
            }

            if (!bestImage) {
                try {
                    const searchTags = buildCharacterTags({ gender, style });
                    bestImage = await findBestMatchingImage([...searchTags, ...tags.slice(2)], FALLBACK);
                } catch (fallbackErr) {
                    console.warn("Fallback image search failed", fallbackErr);
                    bestImage = FALLBACK;
                }
            }

            // ── Generate public description (second-person, 100-200 words) ──
            let aiPublicDesc = '';
            if (hasBackend) {
                try {
                    const descPrompt = `You are a creative writer for an AI companion app. Write an engaging 100-200 word public profile description for the character described below. 

IMPORTANT RULES:
- Write in second-person perspective using words like "your", "you'll", "you", "with you"
- Make it feel personal, warm and enticing — like describing someone the reader will fall in love with
- Mention their personality, vibe, relationship type and what chatting with them feels like
- Do NOT list raw stats or technical details. Write it as flowing, natural prose
- Example style: "She is your devoted, obsessed wife who lives for every moment with you. You'll find her to be sweet yet quietly intense, always knowing what you need before you say a word..."
- Keep it between 100-200 words. Return ONLY the description text, no quotes, no intro.`;

                    const descRes = {
                        ok: true, json: async () => backendJson('/api/ai/chat', {
                            method: 'POST',
                            sessionInfo,
                            body: {
                                provider: 'groq',
                                model: CHAT_MODEL,
                                messages: [
                                    { role: 'system', content: descPrompt },
                                    { role: 'user', content: `Character: ${name}, Age: ${targetAge}, Gender: ${gender}, Style: ${style}. Tags: ${tags.join(', ')}. Persona: ${persona}` }
                                ],
                                max_tokens: 350,
                                temperature: 0.85
                            }
                        })
                    };
                    if (descRes.ok) {
                        const descData = await descRes.json();
                        const descText = descData.choices?.[0]?.message?.content?.trim();
                        if (descText && descText.length > 50) aiPublicDesc = descText;
                    }
                } catch (descErr) {
                    console.warn('AI public description failed (Design-with-AI):', descErr.message);
                }
            }

            const { data: insertedRows, error } = await supabase.from('characters').insert([
                {
                    name: name,
                    age: targetAge,
                    persona: persona,
                    public_description: aiPublicDesc || null,
                    tags: tags,
                    username: user,
                    uuid: sessionInfo?.user?.id,
                    is_public: true,
                    images: bestImage
                }
            ]).select();

            if (error) throw error;
            if (insertedRows?.[0]) {
                window.dispatchEvent(new CustomEvent(CREATED_CHARACTER_EVENT, { detail: insertedRows[0] }));
            }
            setShowDesignWithAI(false);
            setCreatedChar(insertedRows?.[0] || { name, age: targetAge, persona, tags, images: bestImage });
            setCharCreationStage('done');

        } catch (err) {
            console.error(err);
            alert(`Failed to design character: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // ===========================
    // MAIN RENDER
    // ===========================
    return (
        <div className="w-full max-w-5xl mx-auto px-4 lg:px-6 py-8 pb-32 animate-in fade-in zoom-in-95 duration-500">
            {/* Character creation loading / success modal */}
            <CharacterCreatedModal
                stage={charCreationStage}
                character={createdChar}
                onCreateAnother={() => { setCharCreationStage('idle'); setCreatedChar(null); setStep(1); }}
                onStartChat={(char) => { if (onStartChat) onStartChat(char); }}
            />

            {/* Modal overlay */}
            {activeModal && renderModal()}

            {/* Design with AI Modal */}
            {showDesignWithAI && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowDesignWithAI(false)}>
                    <div className="bg-[#1a1a1b] border border-[#2a2a2b] rounded-2xl w-full max-w-2xl p-6 relative animate-in zoom-in-95 duration-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Wand2 size={20} /> Design with AI
                            </h3>
                            <button onClick={() => setShowDesignWithAI(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Badges */}
                        <div className="flex gap-2 mb-6">
                            <span className="px-3 py-1 bg-[#2a2a2b] text-gray-300 rounded-md text-sm font-medium">{style}</span>
                            <span className="px-3 py-1 bg-[#2a2a2b] text-gray-300 rounded-md text-sm font-medium">{gender}</span>
                        </div>

                        {/* Textarea */}
                        <div className="relative mb-6">
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder='Describe your dream companion... (e.g. "A kind and nurturing person with a passion for art and a gentle smile, who enjoys quiet evenings and deep conversations")'
                                className="w-full min-h-[160px] bg-transparent border-2 border-[#3a3a3b] rounded-xl p-4 text-white placeholder-gray-500 focus:outline-none focus:border-gray-400 resize-none transition-colors"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowDesignWithAI(false)}
                                className="px-6 py-3 rounded-xl font-bold border border-gray-700 text-white hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDesignWithAI}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className={`px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${isGenerating || !aiPrompt.trim() ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-[#713885] hover:bg-[#A26FB3] text-white'}`}
                            >
                                <Wand2 size={16} className={isGenerating ? "animate-spin" : ""} /> {isGenerating ? "Generating..." : "Generate Character"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Header */}
            <div className="text-center mb-6">
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                    Create Your Dream AI{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                        {step > 1 ? titleSuffix : 'Companion'}
                    </span>
                </h1>
                {step === 1 && <p className="text-gray-400 italic text-lg">select gender & style</p>}
                {step === 2 && <p className="text-gray-400 italic text-lg">choose ethnicity & skin tone</p>}
                {step === 3 && <p className="text-gray-400 italic text-lg">customize eyes & hair</p>}
                {step === 4 && <p className="text-gray-400 italic text-lg">choose body type & features</p>}
                {step === 5 && <p className="text-gray-400 italic text-lg">name, age & personality</p>}

                {step > 1 && step <= 6 && renderProgressBar()}
            </div>

            {/* ========================================= */}
            {/* STEP 1: Gender and Style                  */}
            {/* ========================================= */}
            {step === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-wrap justify-center gap-3 mb-10">
                        {['Female', 'Male', 'Trans'].map((g) => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ${gender === g
                                    ? 'bg-purple-900/40 text-purple-300 border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] scale-105'
                                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                    }`}
                            >
                                {g === 'Female' && <span className="text-pink-400 text-xl">♀</span>}
                                {g === 'Male' && <span className="text-blue-400 text-xl">♂</span>}
                                {g === 'Trans' && <span className="text-purple-400 text-xl">⚧</span>}
                                {g}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                        {['Realistic', 'Anime'].map((s) => (
                            <div
                                key={s}
                                onClick={() => setStyle(s)}
                                className={`relative rounded-3xl overflow-hidden cursor-pointer aspect-[3/4] transition-all duration-500 ${style === s
                                    ? `ring-4 ${s === 'Realistic' ? 'ring-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.3)]' : 'ring-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]'} scale-[1.02]`
                                    : 'hover:scale-[1.01] hover:shadow-2xl hover:shadow-purple-900/40 opacity-80 hover:opacity-100'
                                    }`}
                            >
                                <img key={`${gender}-${s}`} src={styleImages[gender][s]} alt={`${s} Style`} className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                {style === s && (
                                    <div className={`absolute top-4 right-4 ${s === 'Realistic' ? 'bg-pink-500 shadow-pink-500/50' : 'bg-purple-500 shadow-purple-500/50'} rounded-full p-1.5 shadow-lg animate-bounce`}>
                                        <CheckCircle2 size={24} className="text-white fill-current" />
                                    </div>
                                )}
                                <div className="absolute bottom-6 left-0 right-0 text-center">
                                    <h3 className={`text-2xl font-black tracking-wider uppercase drop-shadow-lg ${style === s ? (s === 'Realistic' ? 'text-pink-400' : 'text-purple-400') : 'text-white'}`}>{s}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mb-24">
                        <button
                            onClick={() => setShowDesignWithAI(true)}
                            className="flex items-center gap-2 px-8 py-4 rounded-xl font-bold bg-gray-900 border border-gray-700 text-gray-200 hover:bg-gray-800 transition-colors w-full sm:w-auto justify-center"
                        >
                            <Wand2 size={20} className="text-gray-400" />
                            Design with AI
                        </button>
                        <button
                            onClick={() => setStep(2)}
                            className="group flex items-center gap-2 px-12 py-4 rounded-xl font-black bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_40px_rgba(236,72,153,0.7)] hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto justify-center"
                        >
                            Begin
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* FAQ */}
                    <div className="max-w-4xl mx-auto space-y-20">
                        <section className="text-center space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-900/30 border border-purple-500/20 text-purple-300 font-medium text-sm mb-4">
                                <Info size={16} /> How it works
                            </div>
                            <h2 className="text-3xl font-bold text-white">How to Build Your Perfect AI Companion</h2>
                            <p className="text-gray-400 leading-relaxed text-lg max-w-3xl mx-auto">
                                Build your own AI companion using powerful creation tools. Enjoy engaging conversations and form a connection designed exactly the way you like.
                            </p>
                        </section>
                        <section className="pt-8 mb-24">
                            <h2 className="text-3xl font-bold text-center text-white mb-10">Frequently Asked Questions</h2>
                            <div className="space-y-3 max-w-3xl mx-auto">
                                {faqs.map((faq, index) => (
                                    <div key={index} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                                        <button onClick={() => toggleFaq(index)} className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-800/50 transition-colors">
                                            <span className="font-semibold text-gray-200 pr-4">{faq.q}</span>
                                            <div className={`text-purple-400 transition-transform duration-300 ${expandedFaq === index ? 'rotate-180' : ''}`}>
                                                <ChevronDownIcon size={20} />
                                            </div>
                                        </button>
                                        <div className={`overflow-hidden transition-all duration-300 ${expandedFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                            <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-gray-800 pt-4">{faq.a}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            )}

            {/* ========================================= */}
            {/* STEP 2: Ethnicity and Skin Tone           */}
            {/* ========================================= */}
            {step === 2 && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right duration-500">
                    <GenderBadge />
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Ethnicity</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Choose an ethnicity for your {gender.toLowerCase()} character</p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
                        {ethnicityList.map((item) => (
                            <div
                                key={item.name}
                                onClick={() => setEthnicity(item.name)}
                                className={`relative rounded-xl overflow-hidden cursor-pointer aspect-[3/4] transition-all duration-300 group ${ethnicity === item.name ? 'ring-2 ring-pink-500 scale-105 shadow-lg shadow-pink-500/20' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            >
                                <img src={getEthnicityImage(item.name)} alt={`${gender} ${item.name}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                                {ethnicity === item.name && (
                                    <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-md animate-in zoom-in duration-300">
                                        <CheckCircle2 size={16} className="text-white fill-current" />
                                    </div>
                                )}
                                {item.premium && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 py-1 text-center text-[10px] font-bold text-white tracking-wider">✦ PREMIUM</div>
                                )}
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className={`text-sm font-black drop-shadow-lg ${ethnicity === item.name ? 'text-pink-400' : 'text-white'}`}>{item.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">Skin Tone</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Select a skin tone shade</p>
                    <div className="flex flex-wrap justify-center gap-1.5 bg-black/40 p-3 rounded-2xl mb-8 border border-gray-800 max-w-lg mx-auto">
                        {skinTones.map((color) => (
                            <button
                                key={color}
                                onClick={() => setSkinTone(color)}
                                className={`w-14 h-12 md:w-16 md:h-14 rounded-xl transition-all duration-300 relative ${skinTone === color ? 'ring-4 ring-pink-500 scale-110 z-10 shadow-lg' : 'hover:scale-105 opacity-90'}`}
                                style={{ backgroundColor: color }}
                            >
                                {skinTone === color && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <CheckCircle2 size={20} className={`${['#ffe0bd', '#ffcd94', '#eac086', '#ffad60'].includes(color) ? 'text-gray-800' : 'text-white'} drop-shadow-md`} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    <NavButtons onBack={() => setStep(1)} onNext={() => setStep(3)} />
                </div>
            )}

            {/* ========================================= */}
            {/* STEP 3: Eye Color, Hair Color, Hair Style */}
            {/* ========================================= */}
            {step === 3 && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right duration-500">
                    <GenderBadge />

                    <h2 className="text-2xl font-bold text-center text-white mb-2">Eye Color</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Choose your character's eye color</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-12">
                        {colors.map((c) => (
                            <button
                                key={`eye-${c.id}`}
                                onClick={() => setEyeColor(c.id)}
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 relative ${eyeColor === c.id ? 'ring-4 ring-white scale-110 z-10 shadow-lg' : 'hover:scale-105 opacity-80'}`}
                                style={{ backgroundColor: c.hex, border: c.hex === '#1a1a1a' ? '2px solid #444' : c.hex === '#ffffff' ? '2px solid #888' : '2px solid transparent' }}
                            >
                                {eyeColor === c.id && <CheckCircle2 size={18} className={`${['#ffffff', '#ffd700', '#bdc3c7', '#2ecc71'].includes(c.hex) ? 'text-gray-800' : 'text-white'} drop-shadow-md`} />}
                            </button>
                        ))}
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">Hair Color</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Choose your character's hair color</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-12">
                        {colors.map((c) => (
                            <button
                                key={`hair-${c.id}`}
                                onClick={() => setHairColor(c.id)}
                                className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-all duration-300 relative ${hairColor === c.id ? 'ring-4 ring-white scale-110 z-10 shadow-lg' : 'hover:scale-105 opacity-80'}`}
                                style={{ backgroundColor: c.hex, border: c.hex === '#1a1a1a' ? '2px solid #444' : c.hex === '#ffffff' ? '2px solid #888' : '2px solid transparent' }}
                            >
                                {hairColor === c.id && <CheckCircle2 size={18} className={`${['#ffffff', '#ffd700', '#bdc3c7', '#2ecc71'].includes(c.hex) ? 'text-gray-800' : 'text-white'} drop-shadow-md`} />}
                            </button>
                        ))}
                    </div>

                    <h2 className="text-2xl font-bold text-center text-white mb-2">Hair Style</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">Select a hairstyle for your {gender.toLowerCase()} character</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        {hairStyleList.map((item) => (
                            <div
                                key={item.name}
                                onClick={() => setHairStyle(item.name)}
                                className={`relative rounded-xl overflow-hidden cursor-pointer aspect-[3/4] transition-all duration-300 group ${hairStyle === item.name ? 'ring-2 ring-pink-500 scale-105 shadow-lg shadow-pink-500/20' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            >
                                <img src={getHairStyleImage(item.name)} alt={`${gender} ${item.name}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                                {hairStyle === item.name && (
                                    <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-md animate-in zoom-in duration-300">
                                        <CheckCircle2 size={16} className="text-white fill-current" />
                                    </div>
                                )}
                                {item.premium && (
                                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-purple-500 py-1 text-center text-[10px] font-bold text-white tracking-wider">✦ PREMIUM</div>
                                )}
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className={`text-sm font-black drop-shadow-lg ${hairStyle === item.name ? 'text-pink-400' : 'text-white'}`}>{item.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <NavButtons onBack={() => setStep(2)} onNext={() => setStep(4)} />
                </div>
            )}

            {/* ========================================= */}
            {/* STEP 4: Body Type & Features              */}
            {/* ========================================= */}
            {step === 4 && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right duration-500">
                    <GenderBadge />

                    {/* Body Type */}
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Body Type</h2>
                    <p className="text-gray-500 text-sm text-center mb-8">Choose the body type for your {gender.toLowerCase()} character</p>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-14">
                        {bodyTypeList[gender].map((typeName) => (
                            <div
                                key={typeName}
                                onClick={() => setBodyType(typeName)}
                                className={`relative rounded-xl overflow-hidden cursor-pointer aspect-[3/4] transition-all duration-300 group ${bodyType === typeName ? 'ring-2 ring-pink-500 scale-105 shadow-lg shadow-pink-500/20' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            >
                                <img src={getBodyTypeImage(typeName)} alt={`${gender} ${typeName}`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                {bodyType === typeName && (
                                    <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-md animate-in zoom-in duration-300">
                                        <CheckCircle2 size={16} className="text-white fill-current" />
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className={`text-sm font-black drop-shadow-lg ${bodyType === typeName ? 'text-pink-400' : 'text-white'}`}>
                                        {typeName.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Breast Size — Female & Trans only */}
                    {(gender === 'Female' || gender === 'Trans') && (
                        <>
                            <h2 className="text-2xl font-bold text-center text-white mb-2">Breast Size</h2>
                            <p className="text-gray-500 text-sm text-center mb-8">Select breast size</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-14">
                                {breastSizeList.map((sizeName) => (
                                    <div
                                        key={`breast-${sizeName}`}
                                        onClick={() => setBreastSize(sizeName)}
                                        className={`relative rounded-xl overflow-hidden cursor-pointer aspect-[4/3] transition-all duration-300 group ${breastSize === sizeName ? 'ring-2 ring-pink-500 scale-105 shadow-lg shadow-pink-500/20' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                                    >
                                        {/* Replace breast size images in breastSizeImages object */}
                                        <img src={getBreastSizeImage(sizeName)} alt={`${sizeName} breast`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                        {breastSize === sizeName && (
                                            <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-md animate-in zoom-in duration-300">
                                                <CheckCircle2 size={16} className="text-white fill-current" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-3 left-0 right-0 text-center">
                                            <span className={`text-sm font-black drop-shadow-lg ${breastSize === sizeName ? 'text-pink-400' : 'text-white'}`}>
                                                {sizeName}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Butt Size — all genders */}
                    <h2 className="text-2xl font-bold text-center text-white mb-2">Butt Size</h2>
                    <p className="text-gray-500 text-sm text-center mb-8">Select butt size</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        {buttSizeList.map((sizeName) => (
                            <div
                                key={`butt-${sizeName}`}
                                onClick={() => setButtSize(sizeName)}
                                className={`relative rounded-xl overflow-hidden cursor-pointer aspect-[4/3] transition-all duration-300 group ${buttSize === sizeName ? 'ring-2 ring-pink-500 scale-105 shadow-lg shadow-pink-500/20' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                            >
                                {/* Replace butt size images in buttSizeImages object */}
                                <img src={getButtSizeImage(sizeName)} alt={`${sizeName} butt`} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                                {buttSize === sizeName && (
                                    <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1 shadow-md animate-in zoom-in duration-300">
                                        <CheckCircle2 size={16} className="text-white fill-current" />
                                    </div>
                                )}
                                <div className="absolute bottom-3 left-0 right-0 text-center">
                                    <span className={`text-sm font-black drop-shadow-lg ${buttSize === sizeName ? 'text-pink-400' : 'text-white'}`}>
                                        {sizeName}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <NavButtons onBack={() => setStep(3)} onNext={() => setStep(5)} />
                </div>
            )}

            {/* ========================================= */}
            {/* STEP 5: Character Name, Age & Persona     */}
            {/* ========================================= */}
            {step === 5 && (
                <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right duration-500">
                    <GenderBadge />

                    {/* Character Name */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 mb-10">
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2 text-center md:text-left">Character Name</h2>
                            <input
                                type="text"
                                value={charName}
                                onChange={(e) => setCharName(e.target.value)}
                                placeholder="Enter character name..."
                                maxLength={30}
                                className="w-full px-5 py-4 bg-gray-900 border-2 border-pink-500/40 rounded-xl text-white text-lg font-semibold placeholder-gray-600 focus:outline-none focus:border-pink-500 focus:shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all text-center"
                            />
                        </div>

                        {/* Age Selector */}
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2 text-center">Age</h2>
                            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl px-2 py-2">
                                <button
                                    onClick={() => setCharAge(Math.max(18, charAge - 1))}
                                    className="w-8 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {/* Show nearby ages */}
                                {[charAge - 2, charAge - 1].filter(a => a >= 18).map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setCharAge(a)}
                                        className="w-8 h-10 flex items-center justify-center text-gray-600 hover:text-gray-300 text-sm transition-colors"
                                    >
                                        {a}
                                    </button>
                                ))}

                                {/* Current age - highlighted */}
                                <div className="w-12 h-12 flex items-center justify-center bg-pink-500/20 border-2 border-pink-500 rounded-lg text-pink-300 font-black text-xl mx-1">
                                    {charAge}
                                </div>

                                {[charAge + 1, charAge + 2].filter(a => a <= 90).map(a => (
                                    <button
                                        key={a}
                                        onClick={() => setCharAge(a)}
                                        className="w-8 h-10 flex items-center justify-center text-gray-600 hover:text-gray-300 text-sm transition-colors"
                                    >
                                        {a}
                                    </button>
                                ))}

                                <button
                                    onClick={() => setCharAge(Math.min(90, charAge + 1))}
                                    className="w-8 h-10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Personality Details — Click to change */}
                    <h2 className="text-xl font-bold text-center text-white mb-1">Personality Details</h2>
                    <p className="text-gray-500 text-sm text-center mb-6">click to change</p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {/* Voice Card */}
                        <button
                            onClick={() => setActiveModal('voice')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${voiceName ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Voice</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{voiceName === 'Custom Voice' ? (customVoiceName || 'Custom Voice') : (voiceName || 'Select...')}</span>
                                <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                                    <Play size={16} className="text-white ml-0.5" />
                                </div>
                            </div>
                        </button>

                        {/* Personality Card */}
                        <button
                            onClick={() => setActiveModal('personality')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${personality ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Personality</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{personality || 'Select...'}</span>
                                <span className="text-3xl">
                                    {personalityOptions.find(p => p.name === personality)?.emoji || '❓'}
                                </span>
                            </div>
                        </button>

                        {/* Occupation Card */}
                        <button
                            onClick={() => setActiveModal('occupation')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${occupation ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Occupation</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{occupation || <span className="italic text-gray-600">No occupation set</span>}</span>
                                <span className="text-3xl">
                                    {occupationOptions.find(o => o.name === occupation)?.emoji || '💼'}
                                </span>
                            </div>
                        </button>

                        {/* Relationship Card */}
                        <button
                            onClick={() => setActiveModal('relationship')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${relationship ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Relationship</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{relationship || <span className="italic text-gray-600">No relationship set</span>}</span>
                                <span className="text-3xl">
                                    {relationshipOptions.find(r => r.name === relationship)?.emoji || '❤️'}
                                </span>
                            </div>
                        </button>

                        {/* Hobby Card */}
                        <button
                            onClick={() => setActiveModal('hobby')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${hobby ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Hobby</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{hobby || <span className="italic text-gray-600">No hobby set</span>}</span>
                                <span className="text-3xl">
                                    {hobbyOptions.find(h => h.name === hobby)?.emoji || '🎯'}
                                </span>
                            </div>
                        </button>

                        {/* Fetish Card */}
                        <button
                            onClick={() => setActiveModal('fetish')}
                            className={`group relative px-5 py-5 rounded-xl text-left transition-all duration-300 border-2 hover:scale-[1.02] ${fetish ? 'bg-gray-900/80 border-pink-500/50 hover:border-pink-500' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}
                        >
                            <div className="text-xs text-gray-500 mb-1 font-medium">Fetish</div>
                            <div className="text-white font-bold text-lg flex items-center justify-between">
                                <span>{fetish || <span className="italic text-gray-600">No fetish set</span>}</span>
                                <span className="text-3xl">
                                    {fetishOptions.find(f => f.name === fetish)?.emoji || '🔒'}
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Advanced Details Overlay/Accordion */}
                    <div className="mb-10 w-full text-left">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-gray-900/60 border border-gray-800 rounded-xl text-white hover:bg-gray-800 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-white">Advanced Details</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">Optional</span>
                            </div>
                            <ChevronDownIcon size={20} className={`transform transition-transform text-gray-400 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>

                        {showAdvanced && (
                            <div className="p-5 mt-2 bg-gray-900/40 border border-gray-800 rounded-xl space-y-6 animate-in slide-in-from-top-2">
                                {/* Scenario */}
                                <div>
                                    <label className="block text-sm font-bold text-white mb-1">Scenario (Context)</label>
                                    <p className="text-xs text-gray-500 mb-2">Describe the current setting or fantasy scenario (Max 250 chars). Writing this skips automatic AI generation and saves API usage.</p>
                                    <textarea
                                        value={customScenario}
                                        onChange={(e) => setCustomScenario(e.target.value.substring(0, 250))}
                                        placeholder="E.g., We are sitting in a dimly lit tavern after a long adventure..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-pink-500 transition-colors resize-none"
                                    />
                                    <div className="text-right text-xs text-gray-500 mt-1">{customScenario.length}/250</div>
                                </div>

                                {/* Personality Details */}
                                <div>
                                    <label className="block text-sm font-bold text-white mb-1">Detailed Personality</label>
                                    <p className="text-xs text-gray-500 mb-2">Elaborate on how they act, speak, their secrets, and their vibe.</p>
                                    <textarea
                                        value={customPersonality}
                                        onChange={(e) => setCustomPersonality(e.target.value)}
                                        placeholder="Overly confident but secretly insecure. Speaks with a distinct accent..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-pink-500 transition-colors resize-none"
                                    />
                                </div>

                                {/* Greeting Message */}
                                <div>
                                    <label className="block text-sm font-bold text-white mb-1">First Message (Greeting)</label>
                                    <p className="text-xs text-gray-500 mb-2">The exact first words they say to start the chat.</p>
                                    <textarea
                                        value={startingScene}
                                        onChange={(e) => setStartingScene(e.target.value)}
                                        placeholder="*smiles warmly* Hey there, I've been waiting for you..."
                                        rows={3}
                                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-pink-500 transition-colors resize-none"
                                    />
                                </div>

                                {/* Tags */}
                                <div>
                                    <label className="block text-sm font-bold text-white mb-1">Custom Tags</label>
                                    <p className="text-xs text-gray-500 mb-2">Comma separated (e.g., fantasy, dominant, magic)</p>
                                    <input
                                        type="text"
                                        value={customTags}
                                        onChange={(e) => setCustomTags(e.target.value)}
                                        placeholder="fantasy, dominant, magic"
                                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-pink-500 transition-colors"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Summary */}
                    {(charName || personality || occupation) && (
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 mb-6">
                            <h3 className="text-sm font-bold text-gray-400 mb-3 text-center">Character Preview</h3>
                            <div className="text-center">
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                                    {charName || 'Unnamed'}
                                </span>
                                <p className="text-gray-400 text-sm mt-2">
                                    {charAge} year old {ethnicity} {gender.toLowerCase()}
                                    {personality && <> • {personality}</>}
                                    {occupation && occupation !== 'None' && <> • {occupation}</>}
                                    {relationship && relationship !== 'None' && <> • {relationship}</>}
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 mt-3">
                                    {voiceName && (
                                        <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs">
                                            🗣️ {voiceName === 'Custom Voice' ? (customVoiceName || 'Custom') : voiceName}
                                        </span>
                                    )}
                                    {hobby && hobby !== 'None' && (
                                        <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
                                            {hobbyOptions.find(h => h.name === hobby)?.emoji} {hobby}
                                        </span>
                                    )}
                                    {fetish && fetish !== 'None' && (
                                        <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs">
                                            {fetishOptions.find(f => f.name === fetish)?.emoji} {fetish}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <NavButtons
                        onBack={() => setStep(4)}
                        onNext={async () => {
                            if (!charName.trim()) {
                                alert('Please enter a character name!');
                                return;
                            }

                            // GUARD: Check all user inputs for forbidden words
                            const badName = checkContentSafe(charName);
                            const badScenario = checkContentSafe(customScenario);
                            const badPersonality = checkContentSafe(customPersonality);
                            const badTags = checkContentSafe(customTags);
                            const badGreet = checkContentSafe(startingScene);

                            const violation = badName || badScenario || badPersonality || badTags || badGreet;
                            if (violation) {
                                onGuard(violation);
                                return;
                            }

                            if (!user) {
                                if (onRequireLogin) onRequireLogin();
                                return;
                            }

                            // Deduct 5 Bolt Coins
                            const ok = await onBurnCoin(5);
                            if (!ok) {
                                if (onRequireUpgrade) onRequireUpgrade();
                                return;
                            }

                            setIsGenerating(true);
                            setCharCreationStage('creating');
                            try {
                                const finalSelectedVoiceName = voiceName === 'Custom Voice' ? (customVoiceName || 'Custom') : voiceName;
                                const finalSelectedVoiceId = voiceName === 'Custom Voice' ? customVoiceId : voiceId;

                                const basePersonaStr = `${charAge} year old ${ethnicity} ${gender.toLowerCase()} (${style}). Body: ${bodyType}, Skin: ${skinTone}, Eyes: ${eyeColor}, Hair: ${hairColor} ${hairStyle}. Voice: ${finalSelectedVoiceName}, Personality: ${personality}, Occupation: ${occupation}, Relationship: ${relationship}, Hobby: ${hobby}, Fetish: ${fetish}.`;

                                let finalPersona = basePersonaStr;
                                let tagsArray = [gender, style, ethnicity, personality, occupation].filter(Boolean);

                                // Parse custom tags if provided
                                if (customTags.trim()) {
                                    const parsedCustomTags = customTags.split(',').map(t => t.trim()).filter(Boolean);
                                    tagsArray = [...new Set([...tagsArray, ...parsedCustomTags])];
                                }

                                // Skip Groq generation if the user manually provided advanced details (saves API calls!)
                                const hasCustomPersona = customScenario.trim() || customPersonality.trim();
                                if (hasCustomPersona) {
                                    // Create a smooth, natural-sounding description instead of technical brackets
                                    finalPersona = `A ${charAge}-year-old ${ethnicity} ${gender.toLowerCase()}. `;

                                    if (customPersonality.trim()) {
                                        finalPersona += `${customPersonality.trim()} `;
                                    } else if (personality && personality !== 'Custom') {
                                        finalPersona += `Has a ${personality.toLowerCase()} personality. `;
                                    }

                                    if (customScenario.trim()) {
                                        finalPersona += `${customScenario.trim()} `;
                                    }

                                    // Append crucial physical data in a clean, soft way so the AI still remembers what they look like
                                    finalPersona += `(Physical features: ${bodyType}, ${eyeColor} eyes, ${hairColor} ${hairStyle} hair, ${finalSelectedVoiceName} voice)`;
                                    finalPersona = finalPersona.trim();
                                }

                                // STEP 1: Groq persona (optional, never fatal, skips if advanced is used)
                                if (hasBackend && !hasCustomPersona) {
                                    try {
                                        console.log('[Create] Step 1: Groq persona...');
                                        const systemPrompt = `You are an expert character writer for an AI companion application. Turn the provided list of physical traits, background, and personality into a concise, engaging 20-30 word summary character persona. Describe their vibe, appearance, and how they interact. Keep it under 30 words. Do NOT chat. Do not include introductory text. Just return the short description text.`;
                                        const groqRes = {
                                            ok: true, json: async () => backendJson('/api/ai/chat', {
                                                method: 'POST',
                                                sessionInfo,
                                                body: {
                                                    provider: 'groq',
                                                    model: CHAT_MODEL,
                                                    messages: [
                                                        { role: 'system', content: systemPrompt },
                                                        { role: 'user', content: basePersonaStr }
                                                    ],
                                                    max_tokens: 400,
                                                    temperature: 0.8
                                                }
                                            })
                                        };
                                        if (groqRes.ok) {
                                            const groqData = await groqRes.json();
                                            if (groqData.choices?.[0]?.message?.content) {
                                                finalPersona = groqData.choices[0].message.content.trim();
                                                console.log('[Create] Step 1 OK');
                                            }
                                        } else {
                                            console.warn('[Create] Step 1: Groq returned', groqRes.status, '- using fallback.');
                                        }
                                    } catch (groqErr) {
                                        console.warn('[Create] Step 1: Groq blocked/failed:', groqErr.message, '- using fallback.');
                                    }
                                }

                                // STEP 2: Generate public description (100-200 words, second-person, saves to DB permanently)
                                let publicDescription = '';
                                if (hasBackend) {
                                    try {
                                        console.log('[Create] Step 2: Generating public description...');
                                        const descPrompt = `You are a creative writer for an AI companion app. Write an engaging 100-200 word public profile description for the character described below. 

IMPORTANT RULES:
- Write in second-person perspective using words like "your", "you'll", "you", "with you"
- Make it feel personal, warm and enticing — like describing someone the reader will fall in love with
- Mention their personality, vibe, relationship type and what chatting with them feels like
- Do NOT list raw stats or technical details. Write it as flowing, natural prose
- Example style: "She is your devoted, obsessed wife who lives for every moment with you. You'll find her to be sweet yet quietly intense, always knowing what you need before you say a word..."
- Keep it between 100-200 words. Return ONLY the description text, no quotes, no intro.`;

                                        const descRes = {
                                            ok: true, json: async () => backendJson('/api/ai/chat', {
                                                method: 'POST',
                                                sessionInfo,
                                                body: {
                                                    provider: 'groq',
                                                    model: CHAT_MODEL,
                                                    messages: [
                                                        { role: 'system', content: descPrompt },
                                                        { role: 'user', content: `Character: ${charName}, Age: ${charAge}, Gender: ${gender}, Appearance: ${ethnicity} ${bodyType} ${hairColor} ${hairStyle} hair, ${eyeColor} eyes. Personality: ${personality}, Occupation: ${occupation || 'none'}, Relationship: ${relationship || 'none'}, Hobby: ${hobby || 'none'}, Voice: ${finalSelectedVoiceName}. Persona summary: ${finalPersona}` }
                                                    ],
                                                    max_tokens: 350,
                                                    temperature: 0.85
                                                }
                                            })
                                        };
                                        if (descRes.ok) {
                                            const descData = await descRes.json();
                                            const descText = descData.choices?.[0]?.message?.content?.trim();
                                            if (descText && descText.length > 50) {
                                                publicDescription = descText;
                                                console.log('[Create] Step 2 OK: public description generated');
                                            }
                                        } else {
                                            console.warn('[Create] Step 2: public description API returned', descRes.status, '- skipping.');
                                        }
                                    } catch (descErr) {
                                        console.warn('[Create] Step 2: public description failed:', descErr.message, '- skipping.');
                                    }
                                }

                                // STEP 3: Image generation (optional, never fatal)
                                const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';
                                let bestImage = null;
                                try {
                                    if (hasBackend) {
                                        const isRealistic = style === 'Realistic';
                                        const imageModel = isRealistic ? 'flux-2-dev' : 'wavespeed-ai/chroma';

                                        const qualityPrefix = isRealistic
                                            ? 'Photorealistic portrait of a character, seductive theme, casual portrait, natural skin texture, soft flattering lighting, shallow depth of field, ultra-detailed, high resolution'
                                            : 'Masterpiece, best quality, high-quality anime illustration, vibrant colors, detailed shading, beautiful lighting, trending on Pixiv';

                                        const environmentHint = isRealistic
                                            ? 'background and facial expression matching the character personality, natural relaxed pose, intimate casual setting, warm ambient lighting'
                                            : 'beautifully detailed anime background, soft pastel tones, atmospheric lighting';

                                        const bodyDesc = `${bodyType} figure, ${skinTone} skin${['Female', 'Trans'].includes(gender) ? `, ${breastSize} breasts` : ''}, ${buttSize} butt`;
                                        const imagePrompt = `${qualityPrefix}, ${charAge} year old ${gender}, ${ethnicity} descent, ${eyeColor} eyes, ${hairColor} ${hairStyle} hair, ${bodyDesc}, ${personality} personality, ${occupation}, ${hobby} enthusiast, ${finalPersona}, ${environmentHint}`;

                                        console.log('[Create/Manual] Image prompt:', imagePrompt);
                                        console.log('[Create/Manual] Using model:', imageModel);

                                        const imgData = await backendJson('/api/images/generate', {
                                            method: 'POST',
                                            sessionInfo,
                                            body: {
                                                prompt: imagePrompt,
                                                width: 768,
                                                height: 1024,
                                                count: 1,
                                                model: imageModel
                                            }
                                        });
                                        if (imgData && imgData.urls && imgData.urls.length > 0) {
                                            bestImage = imgData.urls[0];
                                            console.log('[Create/Manual] ✅ Image generated:', bestImage);
                                        } else {
                                            console.error('[Create/Manual] ❌ No URLs in response. Full response:', JSON.stringify(imgData));
                                        }
                                    }
                                } catch (imgErr) {
                                    console.warn('[Create] Step 3: Image generation failed:', imgErr.message, '- using fallback.');
                                }

                                if (!bestImage) {
                                    try {
                                        const searchTags = buildCharacterTags({
                                            gender, style, ethnicity,
                                            skinTone, eyeColor, hairColor, hairStyle,
                                            bodyType, breastSize, buttSize,
                                            personality, occupation, relationship,
                                            fetish, hobby, voice: finalSelectedVoiceName
                                        });
                                        bestImage = await findBestMatchingImage(searchTags, FALLBACK_IMG);
                                        console.log('[Create] Step 3 OK (Cloudinary Fallback):', bestImage);
                                    } catch (fallbackErr) {
                                        console.warn('[Create] Step 3: Cloudinary search failed:', fallbackErr.message, '- using static fallback.');
                                        bestImage = FALLBACK_IMG;
                                    }
                                }

                                // STEP 4: Supabase insert (critical — if this fails we surface the exact error)
                                console.log('[Create] Step 4: Saving to Supabase... user:', user, 'uuid:', sessionInfo?.user?.id);
                                const { data: insertedRows, error } = await supabase.from('characters').insert([
                                    {
                                        name: charName,
                                        age: charAge,
                                        persona: finalPersona,
                                        public_description: publicDescription || null,
                                        tags: tagsArray,
                                        username: user,
                                        uuid: sessionInfo?.user?.id,
                                        is_public: true,
                                        images: bestImage,
                                        greeting: startingScene, // New column required for the initial scenario
                                        voice: finalSelectedVoiceName,
                                        voice_id: finalSelectedVoiceId || null
                                    }
                                ]).select();

                                if (error) {
                                    console.error('[Create] Step 4 FAILED:', error.code, error.message, error.hint);
                                    const errMsg = error.code === '42501'
                                        ? `Database permission denied (RLS).\n\nFix in Supabase SQL Editor:\nCREATE POLICY "Allow inserts" ON characters FOR INSERT WITH CHECK (true);`
                                        : `Database error (${error.code || 'unknown'}): ${error.message}`;
                                    alert(errMsg);
                                    setCharCreationStage('idle');
                                    return;
                                }

                                console.log('[Create] Step 4 OK! Character saved.');
                                if (insertedRows?.[0]) {
                                    window.dispatchEvent(new CustomEvent(CREATED_CHARACTER_EVENT, { detail: insertedRows[0] }));
                                }
                                setCreatedChar(insertedRows?.[0] || { name: charName, age: charAge, persona: finalPersona, tags: tagsArray, images: bestImage });
                                setCharCreationStage('done');
                            } catch (err) {
                                console.error('[Create] Unexpected error:', err);
                                if (err.message && err.message.includes('Failed to fetch')) {
                                    alert(`Network error connecting to the database.\n\nAre you using Brave or an Ad Blocker on your phone? Please disable "Shields" or "Prevent Cross-Site Tracking" for this site so it can save your character!`);
                                } else {
                                    alert(`Failed to create character:\n${err.message}`);
                                }
                                setCharCreationStage('idle');
                            } finally {
                                setIsGenerating(false);
                            }
                        }}
                        nextLabel={isGenerating ? "Processing..." : "Create Character ✨"}
                        nextDisabled={!charName.trim() || isGenerating}
                    />
                </div>
            )}
        </div>
    );
}
