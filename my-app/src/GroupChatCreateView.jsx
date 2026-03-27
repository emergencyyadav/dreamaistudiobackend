import React, { useState, useEffect, useRef } from 'react';
import {
    X, Users, ChevronRight, Check, Search, Camera,
    MessageSquare, Settings, Image as ImageIcon, Sparkles, Play, ChevronLeft, Plus, Loader2,
    Globe, Lock, TrendingUp, User, Filter
} from 'lucide-react';
import CharacterCard from './CharacterCard';
import { supabase } from './supabaseClient';
import { backendJson, hasBackend } from './backendApi';

function extractFirstImage(imgField) {
    if (!imgField) return null;
    if (Array.isArray(imgField)) return imgField[0];
    if (typeof imgField === 'string') {
        if (imgField.startsWith('[') || imgField.startsWith('{')) {
            try {
                const arr = JSON.parse(imgField);
                if (Array.isArray(arr) && arr[0]) return arr[0];
            } catch (e) {
                return imgField.split(',')[0].replace(/^"|"$/g, '').trim();
            }
        }
        return imgField.split(',')[0].trim();
    }
    return null;
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';

export default function GroupChatCreateView({ onBack, onStartChat, initialCharacters, user, sessionInfo, onNavigateToCreate }) {
    const [step, setStep] = useState(1); // 1: Select Characters, 2: Customize

    // Step 1 State
    const [searchQuery, setSearchQuery] = useState('');
    const [characters, setCharacters] = useState(initialCharacters || []);
    const [selectedIds, setSelectedIds] = useState([]);
    const [isLoading, setIsLoading] = useState(!initialCharacters?.length);
    const [activeFilter, setActiveFilter] = useState('All'); // All | Popular | My Characters
    const [activeGender, setActiveGender] = useState('All'); // All | Male | Female 

    // Step 2 State
    const [groupName, setGroupName] = useState('');
    const [scenario, setScenario] = useState('');
    const [privateDesc, setPrivateDesc] = useState('');
    const [openingMessage, setOpeningMessage] = useState('');
    const [openingSenderId, setOpeningSenderId] = useState('');
    const [tags, setTags] = useState('');
    const [bgImage, setBgImage] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setBgImage(event.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleAutoGenerate = async () => {
        if (selectedCharacters.length === 0) return;
        setIsGenerating(true);
        try {
            if (!hasBackend) {
                setScenario(`The characters (${selectedCharacters.map(c => c.name).join(', ')}) suddenly find themselves completely trapped in a mysterious, glowing underground facility. They must work together to understand why they were brought here.`);
                setIsGenerating(false);
                return;
            }

            const charactersList = selectedCharacters.map(c => `${c.name} (${c.public_description || c.tags || 'Unknown'})`).join(' | ');
            const prompt = `Write a highly creative, engaging, and rich 3-5 sentence scenario/setting for a roleplay group chat.
Group Title: ${groupName || 'Untitled Group'}
Tags: ${tags || 'None'}
Characters: ${charactersList}

Return ONLY the scenario text. Make it instantly set an immersive scene and mood for these characters to interact. No quotes.`;

            const res = await backendJson('/api/ai/chat', {
                method: 'POST',
                sessionInfo,
                body: {
                    provider: 'groq',
                    model: 'llama-3.1-8b-instant',
                    messages: [{ role: 'system', content: prompt }],
                    temperature: 0.9,
                    max_tokens: 300,
                }
            });

            if (res) {
                const text = res.choices?.[0]?.message?.content?.replace(/^"|"$/g, '').trim();
                if (text) setScenario(text);
            }
        } catch (e) {
            console.error(e);
            setScenario(`The characters (${selectedCharacters.map(c => c.name).join(', ')}) suddenly find themselves completely trapped in a mysterious, glowing underground facility. They must work together to understand why they were brought here.`);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (!initialCharacters || initialCharacters.length === 0) {
            fetchCharacters();
        }
    }, []);

    const fetchCharacters = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('characters')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(80);

            if (data) setCharacters(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCharacter = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(v => v !== id));
        } else {
            if (selectedIds.length >= 10) return; // limit to 10
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleNext = () => {
        if (selectedIds.length === 0) return;
        setOpeningSenderId(selectedIds[0]); // Default to first selected
        setStep(2);
    };

    const handleStart = () => {
        if (!groupName.trim() || selectedIds.length === 0) return;

        const selectedChars = characters.filter(c => selectedIds.includes(c.id));

        onStartChat({
            isGroup: true,
            title: groupName,
            scenario,
            privateDesc,
            openingMessage,
            openingSenderId,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            bgImage,
            isPublic,
            characters: selectedChars
        });
    };

    const selectedCharacters = characters.filter(c => selectedIds.includes(c.id));

    // Filtered characters based on active filter + search
    const currentUserId = sessionInfo?.user?.id;
    const filteredCharacters = characters.filter(c => {
        // Search filter
        const matchesSearch = !searchQuery ||
            (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.public_description || c.desc || '').toLowerCase().includes(searchQuery.toLowerCase());

        // Tab filter
        if (activeFilter === 'My Characters') {
            if (!(matchesSearch && currentUserId && c.uuid === currentUserId)) return false;
        }

        // Gender filter
        if (activeGender !== 'All') {
            let tags = [];
            if (Array.isArray(c.tags)) {
                tags = c.tags.map(t => typeof t === 'string' ? t.toLowerCase() : '');
            } else if (typeof c.tags === 'string') {
                try {
                    const parsed = JSON.parse(c.tags);
                    if (Array.isArray(parsed)) tags = parsed.map(t => typeof t === 'string' ? t.toLowerCase() : '');
                    else tags = c.tags.split(',').map(t => t.trim().toLowerCase());
                } catch (e) {
                    tags = c.tags.split(',').map(t => t.trim().toLowerCase());
                }
            }
            if (activeGender === 'Male' && !tags.includes('male')) return false;
            if (activeGender === 'Female' && !tags.includes('female')) return false;
            if (activeGender === 'Trans' && !tags.includes('trans')) return false;
        }

        return matchesSearch;
    });

    // Sort for Popular tab
    const sortedCharacters = activeFilter === 'Popular'
        ? [...filteredCharacters].sort((a, b) => {
            const parseK = str => parseFloat((str || '0').toString().replace('k', '')) * (str?.toString().includes('k') ? 1000 : (str?.toString().includes('M') ? 1000000 : 1));
            return (parseK(b.likes) || 0) - (parseK(a.likes) || 0);
        })
        : filteredCharacters;

    const filterTabs = [
        { key: 'All', icon: Filter, label: 'All' },
        { key: 'Popular', icon: TrendingUp, label: 'Popular' },
        { key: 'My Characters', icon: User, label: 'My Characters' },
    ];

    return (
        <div className="flex flex-col h-full bg-[#09090b] text-white overflow-hidden absolute inset-0 z-50 animate-in slide-in-from-right-8 duration-300" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 pt-3 pb-3 border-b border-white/[0.05] bg-[#09090b] relative z-20" style={{ minHeight: 64 }}>
                <div className="flex items-center gap-3">
                    <button onClick={step === 1 ? onBack : () => setStep(1)} className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                        {step === 1 ? <X size={20} /> : <ChevronLeft size={20} />}
                    </button>
                    <div>
                        <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                            <Users size={18} className="text-purple-400" />
                            {step === 1 ? 'Select Characters' : 'Customize Group'}
                        </h2>
                        <p className="text-xs text-gray-500 font-medium">
                            {step === 1 ? 'Mix and match up to 10 characters' : 'Set the scene and rules'}
                        </p>
                    </div>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">

                {step === 1 && (
                    <div className="p-4 sm:p-6 pb-32 max-w-7xl mx-auto h-full flex flex-col">

                        {/* Filter Tabs & Quick Actions — Two rows for clarity */}
                        <div className="flex flex-col gap-3 mb-5">
                            {/* Row 1: Create AI + Category Filters */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 scroll-smooth">
                                {/* Create New Pill - Prominent */}
                                {onNavigateToCreate && (
                                    <button
                                        onClick={onNavigateToCreate}
                                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-white border border-purple-500 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all active:scale-95"
                                    >
                                        <Plus size={14} /> Create AI
                                    </button>
                                )}

                                {/* Separator */}
                                <div className="shrink-0 w-px h-6 bg-white/10 mx-1" />

                                {/* Category Filters */}
                                {filterTabs.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveFilter(tab.key)}
                                        className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${activeFilter === tab.key
                                            ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                            : 'bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                    >
                                        <tab.icon size={13} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Row 2: Gender Filters */}
                            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                                <span className="shrink-0 text-[10px] font-bold text-gray-600 uppercase tracking-widest mr-1">Gender:</span>
                                {['All', 'Female', 'Male', 'Trans'].map(gender => (
                                    <button
                                        key={`gender-${gender}`}
                                        onClick={() => setActiveGender(gender)}
                                        className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${activeGender === gender
                                            ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                            : 'bg-transparent text-gray-500 border-gray-800 hover:text-gray-300'
                                            }`}
                                    >
                                        {gender}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative mb-5">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={activeFilter === 'My Characters' ? 'Search your characters...' : 'Search characters to add...'}
                                className="w-full h-12 bg-white/[0.03] border border-white/10 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex-1 flex items-center justify-center h-48">
                                <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                            </div>
                        ) : sortedCharacters.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                                <div className="w-14 h-14 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center mb-4">
                                    {activeFilter === 'My Characters' ? <User size={22} className="text-gray-600" /> : <Search size={22} className="text-gray-600" />}
                                </div>
                                <p className="text-gray-500 text-sm font-medium mb-1">
                                    {activeFilter === 'My Characters' ? 'You haven\'t created any characters yet' : 'No characters found'}
                                </p>
                                {activeFilter === 'My Characters' && onNavigateToCreate && (
                                    <button onClick={onNavigateToCreate} className="mt-3 px-5 py-2 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-colors flex items-center gap-2">
                                        <Plus size={14} /> Create Your First Character
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4 pb-20">
                                {sortedCharacters.map(char => {
                                    const isSelected = selectedIds.includes(char.id);
                                    const activeImg = extractFirstImage(char.image) || extractFirstImage(char.images) || FALLBACK_IMG;

                                    return (
                                        <div
                                            key={char.id}
                                            onClick={() => toggleCharacter(char.id)}
                                            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group ${isSelected ? 'ring-2 ring-purple-500 scale-[0.98]' : 'hover:scale-[1.02] ring-1 ring-white/10'}`}
                                            style={{ aspectRatio: '3/4' }}
                                        >
                                            <div className={`absolute inset-0 bg-black/40 z-10 transition-opacity ${isSelected ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />

                                            {/* Selection Checkbox */}
                                            <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 z-20 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-white/50 bg-black/30'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>

                                            {/* Selection number badge */}
                                            {isSelected && (
                                                <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center z-20 text-[10px] font-black text-white shadow-lg">
                                                    {selectedIds.indexOf(char.id) + 1}
                                                </div>
                                            )}

                                            <img src={activeImg} alt={char.name} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'brightness-110' : ''}`} />

                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12 z-10">
                                                <h3 className="text-white font-black text-sm drop-shadow-md truncate">{char.name}</h3>
                                                <p className="text-xs text-gray-300 truncate">{char.public_description || char.desc || 'No description'}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 pb-32">

                        {/* Selected Characters Bar */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Group Members ({selectedCharacters.length})</h3>
                                <button onClick={() => setStep(1)} className="text-xs text-purple-400 font-bold hover:text-purple-300">Edit Roster</button>
                            </div>
                            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 pt-2 px-2 -mx-2">
                                {selectedCharacters.map(c => {
                                    const img = extractFirstImage(c.image) || extractFirstImage(c.images) || FALLBACK_IMG;

                                    return (
                                        <div key={c.id} className="relative flex-shrink-0 group flex flex-col items-center w-20">
                                            <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-gray-900 shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] group-hover:scale-105 transition-all relative">
                                                <img src={img} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <X size={20} className="text-white drop-shadow-lg" />
                                                </div>
                                            </div>
                                            {/* We intercept onClick specifically for the top of the card or the X to remove them seamlessly */}
                                            <button onClick={() => toggleCharacter(c.id)} className="absolute inset-0 z-10 cursor-pointer" aria-label={`Remove ${c.name}`} />
                                            <p className="text-[11px] text-center mt-2 text-gray-300 font-bold truncate w-full px-1">{c.name}</p>
                                        </div>
                                    );
                                })}
                                <button onClick={() => setStep(1)} className="w-16 h-16 mt-0.5 flex-shrink-0 rounded-full border-2 border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-purple-500 hover:bg-purple-500/10 flex items-center justify-center transition-all">
                                    <Plus size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Title & Tags */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-bold text-gray-400 uppercase block">Group Title</label>
                                    <span className="text-[10px] text-gray-500 font-medium">{groupName.length}/50</span>
                                </div>
                                <input
                                    type="text"
                                    value={groupName}
                                    maxLength={50}
                                    onChange={e => setGroupName(e.target.value)}
                                    placeholder="e.g. The Council of Magic, College Dorm..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5 ml-1">Give your new group conversation a memorable name.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Tags (comma separated)</label>
                                <input
                                    type="text"
                                    value={tags}
                                    onChange={e => setTags(e.target.value)}
                                    placeholder="e.g. funny, adventure, fantasy..."
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Public / Private Toggle */}
                        <div className="bg-gray-900/50 border border-gray-800/60 rounded-2xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isPublic ? 'bg-green-500/20' : 'bg-gray-800'}`}>
                                        {isPublic ? <Globe size={18} className="text-green-400" /> : <Lock size={18} className="text-gray-500" />}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">{isPublic ? 'Public Group' : 'Private Group'}</h4>
                                        <p className="text-[11px] text-gray-500">
                                            {isPublic ? 'Anyone can discover and join this group' : 'Only you can access this group chat'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsPublic(!isPublic)}
                                    className={`relative w-12 h-7 rounded-full transition-all duration-300 ${isPublic ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-gray-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 ${isPublic ? 'left-[22px]' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Scenario */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5"><Sparkles size={12} /> Scenario</label>
                                <button
                                    onClick={handleAutoGenerate}
                                    disabled={isGenerating}
                                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-2 py-1 rounded border border-purple-500/20 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                                    {isGenerating ? 'Generating...' : 'Auto-Generate'}
                                </button>
                            </div>
                            <textarea
                                value={scenario}
                                maxLength={500}
                                onChange={e => setScenario(e.target.value)}
                                placeholder="Describe the setting or situation the characters are in..."
                                className="w-full h-24 bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none mb-1"
                            />
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] text-gray-500">How did everyone meet? What are they doing?</p>
                                <span className="text-[10px] text-gray-500 font-medium">{scenario.length}/500</span>
                            </div>
                        </div>

                        {/* Private Description */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-gray-400 uppercase flex items-center gap-1.5"><Search size={12} /> Private Context (Hidden)</label>
                            </div>
                            <textarea
                                value={privateDesc}
                                maxLength={300}
                                onChange={e => setPrivateDesc(e.target.value)}
                                placeholder="Any secret rules or extra context for the AI (e.g. 'I am secretly a vampire lord hiding my identity')..."
                                className="w-full h-20 bg-gray-900/50 border border-white/10 rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:border-purple-500 transition-colors resize-none mb-1"
                            />
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] text-gray-500">This stays completely private to your specific chat session.</p>
                                <span className="text-[10px] text-gray-500 font-medium">{privateDesc.length}/300</span>
                            </div>
                        </div>

                        {/* Background Media */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1.5"><ImageIcon size={12} /> Chat Background Theme</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-lg shrink-0 bg-gray-900 flex">
                                    {bgImage ? (
                                        <>
                                            <img src={bgImage} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button onClick={() => setBgImage('')} className="p-2 bg-red-500 rounded-full text-white hover:scale-110 transition-transform"><X size={14} /></button>
                                            </div>
                                        </>
                                    ) : (
                                        // Auto-generated Tiled Collage
                                        <div className="w-full h-full flex flex-wrap bg-gray-950">
                                            {(() => {
                                                const imgs = selectedCharacters.map(c => extractFirstImage(c.image) || extractFirstImage(c.images)).filter(Boolean);
                                                if (imgs.length === 0) return <div className="w-full h-full flex items-center justify-center text-gray-600"><ImageIcon size={20} /></div>;
                                                if (imgs.length === 1) return <img src={imgs[0]} className="w-full h-full object-cover" />;
                                                if (imgs.length === 2) return <><img src={imgs[0]} className="w-1/2 h-full object-cover border-r border-black" /><img src={imgs[1]} className="w-1/2 h-full object-cover" /></>;
                                                if (imgs.length === 3) return <><img src={imgs[0]} className="w-1/2 h-full object-cover border-r border-black" /><div className="w-1/2 h-full flex flex-col"><img src={imgs[1]} className="w-full h-1/2 object-cover border-b border-black" /><img src={imgs[2]} className="w-full h-1/2 object-cover" /></div></>;
                                                return <><img src={imgs[0]} className="w-1/2 h-1/2 object-cover border-r border-b border-black" /><img src={imgs[1]} className="w-1/2 h-1/2 object-cover border-b border-black" /><img src={imgs[2]} className="w-1/2 h-1/2 object-cover border-r border-black" /><img src={imgs[3]} className="w-1/2 h-1/2 object-cover" /></>;
                                            })()}
                                            <div className="absolute inset-x-0 bottom-0 py-1 bg-black/60 text-center text-[9px] font-bold tracking-wider text-gray-300">AUTO-GRID</div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-gray-400 mb-2 leading-relaxed">By default, we dynamically stitch together your selected characters to create a unique chat background. Or, you can upload your own scene.</p>
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-[11px] font-bold uppercase tracking-wider bg-white/[0.05] hover:bg-white/10 border border-white/10 px-4 py-2 rounded-xl text-white transition-colors flex items-center gap-2"
                                    >
                                        <Camera size={14} /> Upload Custom Design
                                    </button>
                                    <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
                                </div>
                            </div>
                        </div>

                        {/* Initial Message */}
                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-2xl p-5">
                            <h3 className="text-sm font-bold text-purple-300 mb-4 flex items-center gap-2"><MessageSquare size={16} /> Opening Message</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Who speaks first?</label>
                                    <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar">
                                        {[
                                            { id: 'user', name: 'Me (User)', img: null },
                                            { id: 'system', name: 'Narrator', img: null },
                                            ...selectedCharacters.map(c => ({ id: c.id, name: c.name, img: extractFirstImage(c.image) || extractFirstImage(c.images) }))
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => setOpeningSenderId(opt.id)}
                                                className={`flex flex-col items-center flex-shrink-0 w-[72px] gap-1.5 transition-all ${openingSenderId === opt.id ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100'}`}
                                            >
                                                <div className={`w-14 h-14 rounded-full overflow-hidden border-[3px] transition-all bg-gray-900 flex items-center justify-center ${openingSenderId === opt.id ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'border-transparent'}`}>
                                                    {opt.img ? (
                                                        <img src={opt.img} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={20} className="text-gray-600" />
                                                    )}
                                                </div>
                                                <span className={`text-[10px] text-center font-bold tracking-wider uppercase truncate w-full px-1 ${openingSenderId === opt.id ? 'text-purple-300' : 'text-gray-500'}`}>{opt.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    value={openingMessage}
                                    onChange={e => setOpeningMessage(e.target.value)}
                                    placeholder="Type the first message to kick off the group chat..."
                                    className="w-full h-24 bg-black/40 border border-purple-500/30 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
                                />
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black via-[#09090b]/95 to-transparent flex justify-center z-50 pointer-events-none">
                <div className="w-full max-w-7xl mx-auto flex justify-end pointer-events-auto">
                    {step === 1 ? (
                        <div className="flex items-center gap-4 bg-[#09090b] border border-white/10 p-2 sm:p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
                            <div className="flex -space-x-3 px-2">
                                {selectedCharacters.slice(0, 5).map(c => {
                                    const img = extractFirstImage(c.image) || extractFirstImage(c.images) || FALLBACK_IMG;
                                    return <img key={c.id} src={img} className="w-8 h-8 rounded-full border-2 border-[#09090b] object-cover" />;
                                })}
                                {selectedCharacters.length > 5 && (
                                    <div className="w-8 h-8 rounded-full border-2 border-[#09090b] bg-white/10 flex items-center justify-center text-[10px] font-bold">
                                        +{selectedCharacters.length - 5}
                                    </div>
                                )}
                                {selectedCharacters.length === 0 && (
                                    <span className="text-xs text-gray-500 font-medium px-2">No characters selected</span>
                                )}
                            </div>
                            <button
                                onClick={handleNext}
                                disabled={selectedIds.length === 0}
                                className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm flex items-center gap-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                Continue <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStart}
                            disabled={!groupName.trim() || selectedIds.length === 0}
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all"
                        >
                            <Play size={18} fill="currentColor" /> Let's Go!
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
