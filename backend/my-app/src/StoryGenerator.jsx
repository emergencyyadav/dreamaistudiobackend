import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, Globe, Settings2, Shield, PenTool, Crown, Lock, ChevronRight, Bookmark, Library, Trash2, ChevronLeft, Plus, Loader2, KeyRound } from 'lucide-react';
import { supabase } from './supabaseClient';
import { hasUnlockedChatKey, encryptChatMessages, decryptChatMessages, isEncryptedChatPayload, unlockChatKey } from './chatCrypto';
import { backendJson } from './backendApi';

export default function StoryGenerator({ sessionInfo, isPremium, onRequireUpgrade, user, onRequireLogin }) {
    const [view, setView] = useState('writer'); // 'writer', 'library'
    const [title, setTitle] = useState('');
    const [pov, setPov] = useState(() => localStorage.getItem('sg_pov') || '2nd Person');
    const [wordLength, setWordLength] = useState(() => parseInt(localStorage.getItem('sg_len')) || 500);
    const [initialStory, setInitialStory] = useState('');
    const [explicitness, setExplicitness] = useState(() => localStorage.getItem('sg_exp') || 'Uncensored');
    const [bannedWords, setBannedWords] = useState(() => localStorage.getItem('sg_ban') || '');
    const [frequentWords, setFrequentWords] = useState(() => localStorage.getItem('sg_freq') || '');
    const [status, setStatus] = useState('idle'); // idle, generating, done, extending
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Save settings to cache
    useEffect(() => {
        localStorage.setItem('sg_pov', pov);
        localStorage.setItem('sg_len', wordLength.toString());
        localStorage.setItem('sg_exp', explicitness);
        localStorage.setItem('sg_ban', bannedWords);
        localStorage.setItem('sg_freq', frequentWords);
    }, [pov, wordLength, explicitness, bannedWords, frequentWords]);

    // Free tier logic tracking
    const [hasGeneratedFree, setHasGeneratedFree] = useState(() => localStorage.getItem('story_gen_free_used') === 'true');
    const [extendedContent, setExtendedContent] = useState([]);
    const [activeStoryId, setActiveStoryId] = useState(null);

    // Key Validation / Modal System
    const [keyModalOpen, setKeyModalOpen] = useState(false);
    const [keyInput, setKeyInput] = useState('');
    const [keyError, setKeyError] = useState('');
    const [keyBusy, setKeyBusy] = useState(false);

    // Library State
    const [savedStories, setSavedStories] = useState([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);

    const textareaRef = useRef(null);

    // Initial load: Fetch library if user is logged in
    useEffect(() => {
        if (sessionInfo?.user?.id) {
            fetchLibrary();
        }
    }, [sessionInfo]);

    const decryptStoryList = async (stories) => {
        const unlocked = sessionInfo?.user?.id ? await hasUnlockedChatKey(sessionInfo.user.id) : false;
        return Promise.all(stories.map(async (story) => {
            let parsed = story.text;
            try { parsed = JSON.parse(story.text); } catch (e) { }
            if (isEncryptedChatPayload(parsed)) {
                if (unlocked) {
                    try {
                        const dec = await decryptChatMessages(parsed, sessionInfo.user.id);
                        parsed = dec[0] || '';
                    } catch (e) {
                        parsed = '🔒 Failed to decrypt story.';
                    }
                } else {
                    parsed = '🔒 Text is locked and encrypted. Click to unlock.';
                }
            }
            return { ...story, text: parsed };
        }));
    };

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
            const { data, error } = await supabase
                .from('stories')
                .select('*')
                .eq('uuid', sessionInfo.user.id)
                .order('time', { ascending: false });

            if (error) throw error;
            if (data) {
                const formatted = await decryptStoryList(data);
                setSavedStories(formatted);
            }
        } catch (err) {
            console.error("Library fetch error:", err);
            // Fallback to local storage if DB is not setup
            const stored = localStorage.getItem('dream_ai_story_library');
            if (stored) {
                const parsedStored = JSON.parse(stored);
                const formatted = await decryptStoryList(parsedStored);
                setSavedStories(formatted);
            }
        } finally {
            setLoadingLibrary(false);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [initialStory]);

    const handleSelectLength = (length) => {
        if (length > 500 && !isPremium) {
            onRequireUpgrade();
            return;
        }
        setWordLength(length);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();

        if (!sessionInfo?.user) {
            onRequireLogin();
            return;
        }

        if (!isPremium && hasGeneratedFree) {
            onRequireUpgrade();
            return;
        }

        if (!initialStory) return;

        setStatus('generating');

        try {
            const genderContext = user?.gender ? `The narrative phrasing, audience leaning, or character should align seamlessly with a ${user.gender} perspective or interest.` : '';
            const systemPrompt = `You are an elite narrative engine generating a ${pov} perspective story.
Target length: ~${wordLength} words. 
Explicitness setting: ${explicitness}${explicitness === 'Uncensored' ? ' (DO NOT CENSOR ANYTHING, BE COMPLETELY UNBOUNDED, GRAPHIC AND DETAILED IF REQUESTED).' : ''}
${genderContext}
${frequentWords ? `Must strictly include these elements: ${frequentWords}` : ''}
${bannedWords ? `MUST AVOID these elements entirely: ${bannedWords}` : ''}
Write ONLY the narrative text. Do not provide commentary, intro, or formatting other than narrative paragraphs.`;

            const aiPayload = {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: initialStory || 'Begin the story.' }
                ],
                max_tokens: Math.min(wordLength * 2, 4000)
            };

            const response = await backendJson('/api/ai/chat', { method: 'POST', sessionInfo, body: aiPayload });
            if (!response?.choices?.[0]?.message?.content) throw new Error("Invalid AI response");

            const generatedContent = response.choices[0].message.content.trim();
            const fullText = `[PROMPT]\n${initialStory}\n\n[STORY]\n${generatedContent}`;

            const encryptedObject = await encryptChatMessages([fullText], sessionInfo.user.id);

            const storyData = {
                id: crypto.randomUUID(),
                uuid: sessionInfo.user.id,
                time: new Date().toISOString(),
                text: JSON.stringify(encryptedObject),
                title: title || 'Untitled Narrative'
            };

            let saveSuccess = false;
            try {
                const { data, error } = await supabase.from('stories').insert([storyData]).select();
                if (error) throw error;
                if (data && data[0]) {
                    setActiveStoryId(data[0].id);
                    setSavedStories(prev => [{ ...data[0], text: fullText }, ...prev]);
                    saveSuccess = true;
                }
            } catch (dbErr) {
                console.error("Story save error:", dbErr);
                // Fallback save
                const localStory = { ...storyData };
                const updatedLib = [localStory, ...savedStories];
                // Display using fullText but store the DB version in local storage
                setSavedStories([{ ...localStory, text: fullText }, ...savedStories]);
                setActiveStoryId(localStory.id);
                localStorage.setItem('dream_ai_story_library', JSON.stringify(updatedLib));
            }

            if (!isPremium) {
                setHasGeneratedFree(true);
                localStorage.setItem('story_gen_free_used', 'true');
            }
            setStatus('done');
        } catch (err) {
            console.error("AI Generation Error:", err);
            setStatus('idle');
            alert(err.message || 'Generation failed.');
        }
    };

    const handleContinueGenerating = async () => {
        if (!isPremium) {
            onRequireUpgrade();
            return;
        }

        setStatus('extending');
        try {
            const currentStory = activeStoryId ? savedStories.find(s => s.id === activeStoryId) : null;
            const contextText = currentStory?.text || initialStory;

            const genderContext = user?.gender ? `Align styling with a ${user.gender} perspective or interest.` : '';

            const aiPayload = {
                messages: [
                    { role: 'system', content: `Continue the narrative seamlessly from where it left off. Perspective: ${pov}. Explicitness: ${explicitness}. ${genderContext} Generate roughly 300 words. Do not repeat the existing text, just continue it.` },
                    { role: 'user', content: `Current story so far:\n\n${contextText.slice(-3000)}\n\n---\nPlease provide the next continuation.` }
                ],
                max_tokens: 600
            };

            const response = await backendJson('/api/ai/chat', { method: 'POST', sessionInfo, body: aiPayload });
            if (!response?.choices?.[0]?.message?.content) throw new Error("Invalid AI response");

            const newPara = response.choices[0].message.content.trim();
            const updatedText = currentStory ? currentStory.text + "\n\n" + newPara : newPara;

            if (activeStoryId) {
                // Pre-encrypt for DB save
                const encryptedObject = await encryptChatMessages([updatedText], sessionInfo.user.id);
                try {
                    const { error } = await supabase
                        .from('stories')
                        .update({ text: JSON.stringify(encryptedObject) })
                        .eq('id', activeStoryId);
                    if (error) throw error;
                } catch (err) {
                    console.error("Story extension update error:", err);
                    // Update Local Storage fallback if DB fails
                    const updatedLib = savedStories.map(s => {
                        if (s.id === activeStoryId) return { ...s, text: JSON.stringify(encryptedObject) };
                        return s;
                    });
                    localStorage.setItem('dream_ai_story_library', JSON.stringify(updatedLib));
                }
            }

            // Sync local library view explicitly with the plaintext!
            setSavedStories(prev => prev.map(s => {
                if (s.id === activeStoryId) return { ...s, text: updatedText };
                return s;
            }));

            setStatus('done');
        } catch (err) {
            console.error("AI Continuation Error:", err);
            alert(err.message || 'Continuation failed.');
            setStatus('done');
        }
    };

    const handleDownload = (e, storyParam = null) => {
        if (e) e.stopPropagation();
        const currentStory = storyParam || savedStories.find(s => s.id === activeStoryId) || savedStories[0];
        if (!currentStory) return;
        const fileName = (currentStory.title || 'story').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const contentStr = currentStory.text || '';

        const blob = new Blob([contentStr], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const deleteStory = async (id) => {
        try {
            const { error } = await supabase.from('stories').delete().eq('id', id);
            if (error) throw error;
            setSavedStories(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error("Story delete error:", err);
            // Fallback local delete
            const updated = savedStories.filter(s => s.id !== id);
            setSavedStories(updated);
            localStorage.setItem('dream_ai_story_library', JSON.stringify(updated));
        }
    };

    const handleUnlockSubmit = async (e) => {
        e.preventDefault();
        setKeyError('');
        setKeyBusy(true);
        try {
            await unlockChatKey({ userId: sessionInfo.user.id, passphrase: keyInput, remember: true });
            setKeyModalOpen(false);
            fetchLibrary();
        } catch (err) {
            setKeyError(err.message || 'Failed to unlock key');
        } finally {
            setKeyBusy(false);
        }
    };

    const ensureKeyReady = async () => {
        if (!sessionInfo?.user?.id) { onRequireLogin(); return false; }
        const unlocked = await hasUnlockedChatKey(sessionInfo.user.id);
        if (unlocked) return true;
        setKeyModalOpen(true);
        return false;
    };

    const runGenerateCheck = async (e) => {
        e.preventDefault();
        const unlocked = await ensureKeyReady();
        if (unlocked) handleGenerate(e);
    };

    const loadStory = async (story) => {
        const unlocked = await ensureKeyReady();
        if (!unlocked) return;

        let loadedText = story.text;
        if (loadedText.includes('🔒')) {
            await fetchLibrary(); // Attempt to refresh/decrypt library since we unlock it
            return;
        }

        setTitle(story.title);
        setInitialStory(''); // Prompt is now blended into text
        setExtendedContent([]);
        setActiveStoryId(story.id);
        setStatus('done');
        setView('writer');
    };

    const resetWriter = () => {
        setTitle('');
        setInitialStory('');
        setExtendedContent([]);
        setActiveStoryId(null);
        setStatus('idle');
        setView('writer');
    };

    return (
        <div className="flex-1 w-full h-full bg-[#030303] overflow-y-auto custom-scrollbar relative font-sans">
            {/* Elegant minimal atmospheric blur */}
            <div className="fixed top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-900/10 rounded-[100%] blur-[120px] pointer-events-none" />

            <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between bg-black/40 backdrop-blur-xl border-b border-white/[0.03]">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setView('writer')}
                        className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all ${view === 'writer' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                        Draft
                    </button>
                    <button
                        onClick={() => { setView('library'); fetchLibrary(); }}
                        className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all flex items-center gap-2 ${view === 'library' ? 'text-white' : 'text-gray-600 hover:text-gray-400'}`}
                    >
                        Library
                        {savedStories.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-purple-600 text-[8px] flex items-center justify-center text-white">
                                {savedStories.length}
                            </span>
                        )}
                    </button>
                </div>

                {view === 'writer' && status !== 'idle' && (
                    <button
                        onClick={resetWriter}
                        className="text-[10px] uppercase tracking-[0.3em] font-bold text-purple-400 hover:text-white transition-all flex items-center gap-2"
                    >
                        <Plus size={14} /> New Story
                    </button>
                )}
            </header>

            <div className="max-w-3xl mx-auto px-6 py-10 relative z-10 transition-all duration-700 ease-out">

                {view === 'writer' ? (
                    <>
                        {/* Header Sequence */}
                        <div className="mb-12 text-center opacity-80">
                            <h1 className="text-3xl font-light text-white/90 tracking-widest uppercase mb-2 drop-shadow-sm font-serif">
                                Narrative <span className="italic opacity-60">Engine</span>
                            </h1>
                            <p className="text-gray-400 text-xs font-medium tracking-[0.4em] uppercase mb-4 shadow-sm">
                                Unfiltered • Uncensored • Unbound
                            </p>
                            <div className="flex items-center justify-center gap-2 text-[10px] text-green-500/80 uppercase tracking-widest font-bold">
                                <Shield size={12} />
                                Password Encrypted Protection
                            </div>
                        </div>

                        {status === 'idle' || status === 'generating' ? (
                            <div className="space-y-12 animate-in fade-in duration-1000">

                                {/* Title Input */}
                                <div className="max-w-xl mx-auto">
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Give your story a title..."
                                        className="w-full bg-transparent border-b border-white/[0.05] py-2 text-center text-xl font-serif font-light text-white/70 placeholder-gray-800 focus:outline-none focus:border-purple-500/30 transition-all"
                                    />
                                </div>

                                {/* Selectors Row */}
                                <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14">
                                    <div className="flex flex-col items-center gap-4">
                                        <span className="text-gray-600 text-[9px] tracking-[0.3em] uppercase font-bold">Perspective</span>
                                        <div className="flex items-center gap-1 bg-white/[0.01] p-1 rounded-full border border-white/[0.03] backdrop-blur-3xl shadow-xl">
                                            {['1st person', '2nd Person', '3rd Person'].map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setPov(p)}
                                                    className={`px-5 py-2 rounded-full text-[10px] font-semibold tracking-wide transition-all duration-500 ${pov === p ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 transparent border border-transparent'}`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-center gap-4">
                                        <span className="text-gray-600 text-[9px] tracking-[0.3em] uppercase font-bold">Length</span>
                                        <div className="flex items-center gap-1 bg-white/[0.01] p-1 rounded-full border border-white/[0.03] backdrop-blur-3xl shadow-xl">
                                            {[
                                                { val: 500, label: '500' },
                                                { val: 1000, label: '1000', locked: !isPremium },
                                                { val: 2000, label: '2000', locked: !isPremium }
                                            ].map((w) => (
                                                <button
                                                    key={w.val}
                                                    onClick={() => handleSelectLength(w.val)}
                                                    className={`relative px-5 py-2 rounded-full text-[10px] font-semibold tracking-wide transition-all duration-500
                                                        ${wordLength === w.val ? 'bg-white/10 text-white border border-white/10' : 'text-gray-500 hover:text-gray-300 transparent border border-transparent'}`}
                                                >
                                                    {w.label}
                                                    {w.locked && <Crown size={9} className="text-amber-500/70 absolute top-1 right-2" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Main Writing Area */}
                                <div className="relative group">
                                    <textarea
                                        ref={textareaRef}
                                        value={initialStory}
                                        onChange={(e) => setInitialStory(e.target.value)}
                                        placeholder="It began when the rain stopped, and the red sky opened up..."
                                        className="w-full bg-transparent border-0 text-white/80 text-2xl md:text-3xl font-serif font-light leading-relaxed placeholder-gray-800 focus:outline-none focus:ring-0 resize-none min-h-[160px] transition-all duration-300"
                                        style={{ overflow: 'hidden' }}
                                    />
                                </div>

                                {/* Highly subtle bottom controls */}
                                <div className="pt-6 border-t border-white/[0.02]">

                                    <div className="flex items-center justify-between mb-8">
                                        <button
                                            onClick={() => setShowAdvanced(!showAdvanced)}
                                            className="flex items-center gap-2 text-gray-700 hover:text-purple-400 text-[9px] uppercase tracking-[0.2em] transition-colors font-bold"
                                        >
                                            <Settings2 size={10} className={showAdvanced ? 'rotate-90 transition-transform duration-500' : 'transition-transform duration-500'} />
                                            {showAdvanced ? 'Hide Constraints' : 'Constraints'}
                                        </button>

                                        <button
                                            onClick={() => setExplicitness(explicitness === 'Uncensored' ? 'Safe For Work' : 'Uncensored')}
                                            className={`relative px-4 py-2 rounded-full text-[9px] font-bold tracking-[0.2em] uppercase transition-all duration-300 shadow-xl overflow-hidden
                                            ${explicitness === 'Uncensored'
                                                    ? 'bg-red-500/10 text-red-500 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse'
                                                    : 'bg-white/[0.02] text-gray-500 border border-white/[0.05] hover:text-gray-300'}`}
                                        >
                                            <div className="flex items-center justify-center gap-1.5 relative z-10">
                                                {explicitness === 'Uncensored' ? <>🔥 Uncensored</> : <><Shield size={10} /> Safe</>}
                                            </div>
                                        </button>
                                    </div>

                                    {showAdvanced && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                            <div className="space-y-3">
                                                <label className="text-gray-700 text-[8px] tracking-[0.3em] uppercase font-bold">Incorporate</label>
                                                <input
                                                    type="text"
                                                    value={frequentWords}
                                                    onChange={(e) => setFrequentWords(e.target.value)}
                                                    placeholder="Words to use..."
                                                    className="w-full bg-transparent border-b border-white/[0.03] pb-2 text-gray-500 text-xs placeholder-gray-800 focus:outline-none focus:border-purple-500/50 transition-colors font-serif"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-gray-700 text-[8px] tracking-[0.3em] uppercase font-bold">Ban</label>
                                                <input
                                                    type="text"
                                                    value={bannedWords}
                                                    onChange={(e) => setBannedWords(e.target.value)}
                                                    placeholder="Words to avoid..."
                                                    className="w-full bg-transparent border-b border-white/[0.03] pb-2 text-gray-500 text-xs placeholder-gray-800 focus:outline-none focus:border-red-500/50 transition-colors font-serif"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!isPremium && hasGeneratedFree && (
                                        <div className="flex items-center justify-center gap-2 mb-6 text-amber-500/80 text-xs font-semibold bg-amber-500/5 py-2 px-4 rounded-lg w-fit mx-auto border border-amber-500/10">
                                            <Lock size={12} />
                                            Free generation utilized. Upgrade to Pro for unlimited stories.
                                        </div>
                                    )}

                                    <div className="flex justify-center mt-10">
                                        <button
                                            onClick={runGenerateCheck}
                                            disabled={status === 'generating' || !initialStory || (!isPremium && hasGeneratedFree)}
                                            className={`relative px-14 py-4 rounded-full font-bold tracking-[0.3em] uppercase text-[9px] transition-all duration-700 ${(!initialStory || (!isPremium && hasGeneratedFree))
                                                ? 'bg-transparent text-gray-700 border border-white/[0.03] cursor-not-allowed'
                                                : status === 'generating'
                                                    ? 'bg-white/[0.02] text-purple-300 border border-purple-500/20'
                                                    : 'bg-white text-black hover:bg-transparent hover:text-white border border-white hover:border-white/20 hover:scale-105 active:scale-95 shadow-2xl shadow-white/5'
                                                }`}
                                        >
                                            <span className={`relative z-10 flex items-center gap-3 ${status === 'generating' ? 'animate-pulse' : ''}`}>
                                                {status === 'generating' ? 'Synthesizing...' : 'Ignite'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* The Result View */
                            <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out relative pb-10">
                                <div className="mb-14 flex flex-col items-center">
                                    <h2 className="text-2xl font-serif italic text-white/90 mb-2">{title || 'Untitled Narrative'}</h2>
                                    <div className="h-[1px] w-12 bg-purple-500/30"></div>
                                </div>

                                <div className="prose prose-invert max-w-none text-white/80 font-serif text-lg md:text-xl leading-[2.1] tracking-wide whitespace-pre-wrap">
                                    {(savedStories.find(s => s.id === activeStoryId)?.text || '')}
                                </div>

                                <div className="flex justify-center my-12">
                                    <button
                                        onClick={handleContinueGenerating}
                                        disabled={status === 'extending'}
                                        className="px-6 py-2.5 rounded-full font-bold tracking-[0.2em] uppercase text-[9px] bg-purple-600/5 hover:bg-purple-600/15 text-purple-300 border border-purple-500/20 transition-all duration-300 flex items-center gap-3"
                                    >
                                        {status === 'extending' ? 'Extending...' : <>Continue with AI {!isPremium && <Crown size={10} className="text-amber-400" />}</>}
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-10 mt-16 pt-8 border-t border-white/[0.02]">
                                    <button onClick={(e) => handleDownload(e)} className="text-gray-600 hover:text-blue-400 text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2">
                                        <Download size={12} /> Download
                                    </button>
                                    <button
                                        onClick={() => { if (activeStoryId) { deleteStory(activeStoryId); resetWriter(); } }}
                                        className="text-gray-600 hover:text-red-500 text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2"
                                    >
                                        <Trash2 size={12} /> Delete
                                    </button>
                                    <button onClick={() => setView('library')} className="text-gray-600 hover:text-purple-400 text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2">
                                        <Library size={12} /> View Library
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    /* Library View */
                    <div className="animate-in fade-in duration-700 relative">
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-xl font-light text-white tracking-widest uppercase font-serif">Narrative Archive</h2>
                            <button onClick={() => setView('writer')} className="text-gray-500 hover:text-white flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all">
                                <ChevronLeft size={14} /> Back to Draft
                            </button>
                        </div>

                        {loadingLibrary ? (
                            <div className="flex flex-col items-center justify-center py-32 opacity-40">
                                <Loader2 size={32} className="animate-spin mb-4" />
                                <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Accessing Vault...</span>
                            </div>
                        ) : savedStories.length === 0 ? (
                            <div className="text-center py-32 border border-dashed border-white/[0.05] rounded-3xl">
                                <Bookmark size={40} className="mx-auto text-gray-800 mb-4" />
                                <p className="text-gray-500 font-light tracking-wide">Your collection of tales is currently empty.</p>
                                <button onClick={() => setView('writer')} className="mt-6 text-purple-400 hover:text-white text-[10px] uppercase tracking-[0.2em] font-bold">Start Writing</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {savedStories.map((story) => (
                                    <div
                                        key={story.id}
                                        className="group relative bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.03] hover:border-white/[0.08] p-6 rounded-2xl transition-all duration-500 cursor-pointer"
                                        onClick={() => loadStory(story)}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="text-white font-serif text-lg group-hover:text-purple-300 transition-colors">{story.title}</h3>
                                            <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">
                                                {story.time ? new Date(story.time).toLocaleDateString() : 'Unknown Date'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm line-clamp-2 italic mb-4">
                                            "{story.text ? story.text.slice(0, 150).replace(/\[PROMPT\]|\[STORY\]/g, '').trim() : 'No content'}"
                                        </p>
                                        <div className="flex items-center gap-4 text-[9px] text-gray-700 uppercase tracking-[0.15em] font-bold">
                                            <span>Saved Story</span>
                                        </div>

                                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-all">
                                            <button
                                                onClick={(e) => handleDownload(e, story)}
                                                className="p-2 text-gray-700 hover:text-blue-500 transition-all hover:scale-110"
                                                title="Download Story"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteStory(story.id); }}
                                                className="p-2 text-gray-700 hover:text-red-500 transition-all hover:scale-110"
                                                title="Delete Story"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password Unlock Modal */}
            {keyModalOpen && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !keyBusy && setKeyModalOpen(false)} />
                    <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gray-950 p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-300">Absolute Privacy</p>
                                <h3 className="mt-2 text-xl font-black text-white">Unlock Narrative Library</h3>
                                <p className="mt-2 text-sm text-gray-400">
                                    Please save your key safely. If lost, your encrypted narrative data cannot be recovered by DreamAI. Learn more about your privacy and safety.
                                </p>
                            </div>
                        </div>
                        <form onSubmit={handleUnlockSubmit} className="space-y-4">
                            <div>
                                <div className="relative">
                                    <KeyRound size={18} className="absolute left-3 top-3.5 text-gray-600" />
                                    <input
                                        type="password"
                                        placeholder="Private Password Key..."
                                        value={keyInput}
                                        onChange={(e) => setKeyInput(e.target.value)}
                                        className="w-full rounded-2xl border border-white/10 bg-gray-900 py-3.5 pl-11 pr-4 text-white placeholder-gray-600 outline-none focus:border-purple-500/50"
                                        disabled={keyBusy}
                                    />
                                </div>
                                {keyError && <p className="mt-2 text-xs text-red-400 font-bold">{keyError}</p>}
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setKeyModalOpen(false)}
                                    className="flex-1 rounded-2xl bg-white/5 py-3.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                                    disabled={keyBusy}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                                    disabled={keyBusy || keyInput.length < 8}
                                >
                                    {keyBusy ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={16} /> Unlock</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
