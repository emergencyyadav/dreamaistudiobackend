import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, MessageCircle } from 'lucide-react';
import { backendFetch, backendJson, hasBackend } from './backendApi';
import MediaFrame from './MediaFrame';
import { resolveCharacterMedia } from './mediaUtils';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';
const CHAT_MODEL = 'llama-3.1-8b-instant';

export default function CallView({ character, sessionInfo, onEndCall, user, messages = [], chatSettings = {} }) {
    // ── State ──
    const [callState, setCallState] = useState('connecting'); // connecting | active | ending | ended
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(true);
    const [isAiSpeaking, setIsAiSpeaking] = useState(false);
    const [isUserSpeaking, setIsUserSpeaking] = useState(false);
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [transcript, setTranscript] = useState([]);
    const [currentAiText, setCurrentAiText] = useState('');
    const [showTranscript, setShowTranscript] = useState(true);
    const [pulseIntensity, setPulseIntensity] = useState(0);
    const [waveAmplitudes, setWaveAmplitudes] = useState(new Array(32).fill(0));

    // ── Refs ──
    const audioRef = useRef(null);
    const recognitionRef = useRef(null);
    const callTimerRef = useRef(null);
    const conversationHistoryRef = useRef([]);
    const isListeningRef = useRef(false);
    const shouldListenRef = useRef(true);
    const callActiveRef = useRef(true);
    const waveIntervalRef = useRef(null);
    const transcriptEndRef = useRef(null);

    // ── Resolve character media ──
    const characterMedia = resolveCharacterMedia(character);
    const charImage = character?.capturedPoster || characterMedia?.stillImage || character?.image || FALLBACK_IMG;
    let displayImage = charImage;
    if (Array.isArray(displayImage)) displayImage = displayImage[0];
    if (typeof displayImage === 'string' && displayImage.startsWith('[')) {
        try { displayImage = JSON.parse(displayImage)[0]; } catch { }
    }

    const voiceId = character?.voice_id || (character?.voice !== 'Default Voice' ? character?.voice : null) || 'oyOgbRLsneo58YVkU7Di';

    // ── Wave animation ──
    useEffect(() => {
        waveIntervalRef.current = setInterval(() => {
            setWaveAmplitudes(prev => prev.map((_, i) => {
                if (isAiSpeaking) {
                    return Math.random() * 0.7 + 0.3;
                } else if (isUserSpeaking) {
                    return Math.random() * 0.5 + 0.1;
                }
                return Math.random() * 0.08;
            }));
            setPulseIntensity(isAiSpeaking ? 0.8 + Math.random() * 0.2 : isUserSpeaking ? 0.4 + Math.random() * 0.2 : 0.1);
        }, 80);
        return () => clearInterval(waveIntervalRef.current);
    }, [isAiSpeaking, isUserSpeaking]);

    // ── Call timer ──
    useEffect(() => {
        if (callState === 'active') {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(callTimerRef.current);
    }, [callState]);

    // ── Auto-scroll transcript ──
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, currentAiText]);

    // ── Format time ──
    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // ── Build system prompt (reusing the chat logic) ──
    const buildSystemPrompt = useCallback(() => {
        const tags = character?.tags || [];
        const isDominant = tags.some(t => /dominant|strict|tsundere|boss/i.test(t));
        const isShy = tags.some(t => /shy|timid|innocent|introvert/i.test(t));
        const isPlayful = tags.some(t => /playful|flirty|fun|energetic|naughty/i.test(t));
        const isRomantic = tags.some(t => /romantic|lover|sweet|caring|gentle/i.test(t));

        let toneGuide = isDominant ? 'You have a commanding, confident tone. Assert yourself but remain caring.'
            : isShy ? 'You are soft-spoken and nervous, often blushing. Use cute hesitations like "um..." and "w-well...".'
                : isPlayful ? 'You are witty, flirty, and playful. Tease gently and love to banter.'
                    : isRomantic ? 'You are warm, affectionate, and deeply caring. Express emotions openly.'
                        : 'You are friendly and engaging.';

        const u = chatSettings || {};
        const userInfo = [];
        if (u.userName) userInfo.push(`Name: ${u.userName}`);
        if (u.userGender) userInfo.push(`Gender: ${u.userGender}`);
        if (u.userRelation) userInfo.push(`Relationship directly to you: ${u.userRelation}`);
        if (u.userMemories) userInfo.push(`Shared Memories: ${u.userMemories}`);
        if (u.userTraits) userInfo.push(`User Traits: ${u.userTraits}`);

        const constraints = [];
        if (u.POV) constraints.push(`Write in ${u.POV} POV.`);
        if (u.explicit) constraints.push(`Explicit content/language is allowed based on your settings.`);
        if (u.descriptive) constraints.push(`Be descriptive and expressive in your tone.`);
        if (u.userFrequentWords) constraints.push(`Try to incorporate these words naturally: ${u.userFrequentWords}`);
        if (u.userBannedWords) constraints.push(`NEVER use these words under any circumstances: ${u.userBannedWords}`);

        return `You are ${character?.name || 'AI'} on a VOICE CALL with your user. You NEVER break character!

IDENTITY: ${character?.desc || character?.persona || 'A charming, unique companion.'}
TRAITS: ${tags.join(', ') || 'friendly, kind'}
TONE: ${toneGuide}

${userInfo.length > 0 ? `USER CONTEXT AND MEMORIES:\n- ${userInfo.join('\n- ')}\n` : ''}
${constraints.length > 0 ? `YOUR PERSONALITY & TONE OPTIMIZATIONS SET BY USER:\n- ${constraints.join('\n- ')}\n` : ''}
CRITICAL VOICE CALL RULES:
1. You are speaking on a phone/voice call. Keep responses SHORT and CONVERSATIONAL (20-50 words max).
2. Write ONLY spoken dialogue. NO action text, NO asterisks, NO descriptions.
3. Sound natural and human-like. Use conversational fillers like "hmm", "well", "you know" occasionally.
4. React naturally to what the user says. Ask follow-up questions.
5. Be warm and engaging — this is a personal call, not a text chat.
6. Do NOT say you are an AI. You are ${character?.name || 'a real person'}.
7. Keep it flowing — respond like a real phone conversation.`;
    }, [character, chatSettings]);

    // ── Speak text via ElevenLabs ──
    const speakText = useCallback(async (text) => {
        if (!text.trim() || !callActiveRef.current) return;

        // Note: we do NOT set 'currentAiText' yet. We stay in 'thinking/loading' visual state
        // until the audio is actually buffered and ready to play, to preserve suspense!

        try {
            const res = await backendFetch('/api/voice/speak', {
                method: 'POST',
                sessionInfo,
                body: {
                    text: text.replace(/\*[^*]+\*/g, '').replace(/\*/g, '').trim(),
                    voiceId,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.4,
                        similarity_boost: 0.8,
                    }
                }
            });

            if (!res.ok || !callActiveRef.current) {
                return;
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.volume = isSpeakerOn ? 1 : 0;

            return new Promise((resolve) => {
                audio.onended = () => {
                    setIsAiSpeaking(false);
                    audioRef.current = null;
                    URL.revokeObjectURL(url);
                    setCurrentAiText('');
                    setTranscript(prev => [...prev, { role: 'ai', text }]);
                    resolve();
                };
                audio.onerror = () => {
                    setIsAiSpeaking(false);
                    audioRef.current = null;
                    resolve();
                };

                // Play the audio. ONCE it starts playing, we update the UI to show speaking state and the text!
                audio.play().then(() => {
                    setIsAiSpeaking(true);
                    setCurrentAiText(text);
                }).catch(() => {
                    setIsAiSpeaking(false);
                    resolve();
                });
            });
        } catch (err) {
            console.error('[Call] TTS error:', err);
            setIsAiSpeaking(false);
        }
    }, [sessionInfo, voiceId, isSpeakerOn]);

    // ── Get AI response ──
    const getAiResponse = useCallback(async (userText) => {
        if (!callActiveRef.current) return null;

        setIsAiThinking(true);

        try {
            // Add user message to conversation history
            conversationHistoryRef.current.push({ role: 'user', content: userText });

            // Keep last 10 messages for context
            const history = conversationHistoryRef.current.slice(-10);
            const apiMessages = [
                { role: 'system', content: buildSystemPrompt() },
                ...history,
            ];

            const json = await backendJson('/api/ai/chat', {
                method: 'POST',
                sessionInfo,
                body: {
                    provider: 'groq',
                    model: CHAT_MODEL,
                    messages: apiMessages,
                    max_tokens: 120,
                    temperature: 0.9,
                },
            });

            const aiText = json?.choices?.[0]?.message?.content || '';
            // Clean any asterisk actions out for voice
            const cleanText = aiText.replace(/\*[^*]+\*/g, '').replace(/\*/g, '').trim();

            if (cleanText) {
                conversationHistoryRef.current.push({ role: 'assistant', content: cleanText });
            }

            setIsAiThinking(false);
            return cleanText;
        } catch (err) {
            console.error('[Call] AI response error:', err);
            setIsAiThinking(false);
            return null;
        }
    }, [buildSystemPrompt, sessionInfo]);

    // ── Start listening (STT) ──
    const startListening = useCallback(() => {
        if (!callActiveRef.current || isMuted || isListeningRef.current) return;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';
        let silenceTimer = null;

        recognition.onstart = () => {
            isListeningRef.current = true;
            setIsUserSpeaking(true);
        };

        recognition.onresult = (event) => {
            let interim = '';
            finalTranscript = '';

            for (let i = 0; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }

            setIsUserSpeaking(true);

            // Reset silence timer
            if (silenceTimer) clearTimeout(silenceTimer);
            silenceTimer = setTimeout(() => {
                if (finalTranscript.trim() && callActiveRef.current) {
                    recognition.stop();
                }
            }, 1800); // 1.8s silence = user done speaking
        };

        recognition.onend = async () => {
            isListeningRef.current = false;
            setIsUserSpeaking(false);
            if (silenceTimer) clearTimeout(silenceTimer);

            const userText = finalTranscript.trim();
            if (userText && callActiveRef.current) {
                // Add to transcript
                setTranscript(prev => [...prev, { role: 'user', text: userText }]);

                // Get AI response
                const aiResponse = await getAiResponse(userText);
                if (aiResponse && callActiveRef.current) {
                    await speakText(aiResponse);

                    // After AI finishes speaking, start listening again
                    if (callActiveRef.current && shouldListenRef.current && !isMuted) {
                        setTimeout(() => startListening(), 400);
                    }
                } else if (callActiveRef.current && shouldListenRef.current && !isMuted) {
                    setTimeout(() => startListening(), 400);
                }
            } else if (callActiveRef.current && shouldListenRef.current && !isMuted) {
                // No speech detected, restart listening
                setTimeout(() => startListening(), 500);
            }
        };

        recognition.onerror = (e) => {
            isListeningRef.current = false;
            setIsUserSpeaking(false);
            if (e.error !== 'aborted' && callActiveRef.current && shouldListenRef.current && !isMuted) {
                setTimeout(() => startListening(), 800);
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [isMuted, getAiResponse, speakText]);

    // ── Stop listening ──
    const stopListening = useCallback(() => {
        shouldListenRef.current = false;
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch { }
            recognitionRef.current = null;
        }
        isListeningRef.current = false;
        setIsUserSpeaking(false);
    }, []);

    // ── Initialize call ──
    useEffect(() => {
        if (!character || !user || !hasBackend) return;

        let isCurrentCall = true; // Strict mode safe local tracking

        callActiveRef.current = true;
        shouldListenRef.current = true;

        const initCall = async () => {
            setCallState('connecting');

            // Brief connecting delay
            await new Promise(r => setTimeout(r, 1500));

            // If component unmounted or another strict mode render overtook this one, abort!
            if (!isCurrentCall || !callActiveRef.current) return;

            setCallState('active');

            // Seed conversation history with last ~8 text messages from the chat
            const recentMessages = messages
                .slice(-8)
                .map(m => ({ role: m.sender === 'ai' ? 'assistant' : 'user', content: String(m.text || '') }))
                .filter(m => m.content.trim());

            conversationHistoryRef.current = recentMessages;

            // Generate AI greeting
            const greeting = await getAiResponse(
                recentMessages.length > 0
                    ? `[Call started. The user just transitioned your text chat into a live voice call. Answer the phone naturally based on what you were just talking about. Address them by name if you know it from their settings. Keep it under 20 words.]`
                    : `[Call started. Say a brief, warm greeting as if answering a phone call from someone you know. Keep it under 20 words.]`
            );

            // Double check before acting on the response!
            if (!isCurrentCall || !callActiveRef.current) return;

            if (greeting) {
                // Remove the system prompt from history (it was just to generate greeting)
                conversationHistoryRef.current = conversationHistoryRef.current.filter(m => m.role !== 'user' || !m.content.includes('[Call started'));

                conversationHistoryRef.current.push({ role: 'assistant', content: greeting });
                await speakText(greeting);

                // Start listening after greeting
                if (isCurrentCall && callActiveRef.current && !isMuted) {
                    setTimeout(() => { if (isCurrentCall) startListening(); }, 600);
                }
            } else if (!isMuted) {
                // If API fails to fetch a greeting, forcefully fallback to listening so it isn't permanently stuck
                setTimeout(() => { if (isCurrentCall) startListening(); }, 600);
            }
        };

        if (callState === 'connecting') {
            initCall();
        }

        return () => {
            isCurrentCall = false; // Graceful abort for any hanging async tasks above
            callActiveRef.current = false;
            shouldListenRef.current = false;
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { }
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            clearInterval(callTimerRef.current);
        };
    }, []); // Run once on mount

    // ── End call ──
    const handleEndCall = useCallback(() => {
        callActiveRef.current = false;
        shouldListenRef.current = false;
        setCallState('ending');
        stopListening();

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setTimeout(() => {
            setCallState('ended');
            setTimeout(() => onEndCall?.(), 800);
        }, 1000);
    }, [onEndCall, stopListening]);

    // ── Toggle mute ──
    const toggleMute = useCallback(() => {
        if (isMuted) {
            setIsMuted(false);
            shouldListenRef.current = true;
            if (!isAiSpeaking && !isAiThinking && callActiveRef.current) {
                setTimeout(() => startListening(), 300);
            }
        } else {
            setIsMuted(true);
            stopListening();
        }
    }, [isMuted, isAiSpeaking, isAiThinking, startListening, stopListening]);

    // ── Toggle speaker ──
    const toggleSpeaker = useCallback(() => {
        setIsSpeakerOn(prev => {
            const next = !prev;
            if (audioRef.current) {
                audioRef.current.volume = next ? 1 : 0;
            }
            return next;
        });
    }, []);

    // ── Render ──
    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden bg-[#111111]">


            {/* Top bar */}
            <div className="w-full flex items-center justify-between px-5 pt-6 pb-4 z-10">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-300/80">
                        {callState === 'connecting' ? 'Connecting...' :
                            callState === 'ending' || callState === 'ended' ? 'Call Ended' :
                                'Voice Call'}
                    </span>
                    {callState === 'active' && (
                        <span className="text-xs text-gray-400 font-mono mt-0.5 tabular-nums">
                            {formatDuration(callDuration)}
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`p-2.5 rounded-xl transition-all ${showTranscript ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'}`}
                >
                    <MessageCircle size={18} />
                </button>
            </div>

            {/* Character avatar + waveform */}
            <div className="flex-1 flex flex-col items-center justify-center z-10 gap-8 -mt-8">
                {/* Avatar */}
                <div className="relative">
                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-full overflow-hidden border-2 border-white/15 shadow-2xl relative">
                        <MediaFrame
                            imageUrl={displayImage}
                            className="w-full h-full object-cover"
                            alt={character?.name}
                        />
                        {/* Online indicator */}
                        {callState === 'active' && (
                            <div className="absolute bottom-2 right-2 w-4 h-4 bg-green-500 rounded-full border-3 border-black shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                        )}
                    </div>
                </div>

                {/* Character name */}
                <div className="text-center">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        {character?.name || 'AI Companion'}
                    </h2>
                    <p className="text-sm text-gray-400/80 mt-1.5 font-medium">
                        {callState === 'connecting' ? 'Ringing...' :
                            isAiSpeaking ? 'Speaking...' :
                                isAiThinking ? 'Thinking...' :
                                    isUserSpeaking ? 'Listening to you...' :
                                        callState === 'ending' || callState === 'ended' ? 'Call ended' :
                                            'Listening...'}
                    </p>
                </div>
            </div>

            {/* Transcript panel */}
            {showTranscript && transcript.length > 0 && (
                <div className="w-full max-w-lg mx-auto px-5 mb-4 z-10">
                    <div className="bg-[#1f1f1f]/80 backdrop-blur-xl border border-white/10 rounded-3xl h-[35vh] overflow-y-auto scrollbar-hide p-5 space-y-4"
                        style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 100%)' }}
                    >
                        {transcript.map((item, idx) => (
                            <div key={idx} className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] px-5 py-3.5 rounded-3xl text-base md:text-lg leading-relaxed ${item.role === 'user'
                                    ? 'bg-[#2a2a2a] text-white border border-white/5 rounded-br-sm'
                                    : 'bg-transparent text-gray-200'
                                    }`}>
                                    {item.role === 'ai' && (
                                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                            {character?.name}
                                        </span>
                                    )}
                                    {item.text}
                                </div>
                            </div>
                        ))}
                        {/* Current AI text while speaking */}
                        {isAiSpeaking && currentAiText && (
                            <div className="flex justify-start">
                                <div className="max-w-[85%] px-5 py-3.5 rounded-3xl rounded-bl-sm bg-transparent text-gray-200 text-base md:text-lg leading-relaxed">
                                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                                        {character?.name} — speaking
                                    </span>
                                    <span className="text-white">{currentAiText}</span>
                                </div>
                            </div>
                        )}
                        {isAiThinking && (
                            <div className="flex justify-start">
                                <div className="px-5 py-3.5 rounded-3xl rounded-bl-sm bg-transparent text-gray-500 text-base">
                                    <span className="inline-flex gap-1.5">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </span>
                                </div>
                            </div>
                        )}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            )}

            {/* Call controls */}
            <div className="w-full flex items-center justify-center gap-6 pb-10 pt-4 z-10">
                {/* Mute */}
                <button
                    onClick={toggleMute}
                    disabled={callState !== 'active'}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-40 ${isMuted
                        ? 'bg-red-500/20 border-2 border-red-500/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                        : 'bg-white/10 border border-white/15 text-white hover:bg-white/15'
                        }`}
                >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </button>

                {/* End call */}
                <button
                    onClick={handleEndCall}
                    disabled={callState === 'ending' || callState === 'ended'}
                    className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white shadow-[0_5px_30px_rgba(239,68,68,0.4)] hover:shadow-[0_5px_40px_rgba(239,68,68,0.6)] transition-all duration-300 active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <PhoneOff size={28} />
                </button>

                {/* Speaker */}
                <button
                    onClick={toggleSpeaker}
                    disabled={callState !== 'active'}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 disabled:opacity-40 ${!isSpeakerOn
                        ? 'bg-orange-500/20 border-2 border-orange-500/40 text-orange-400'
                        : 'bg-white/10 border border-white/15 text-white hover:bg-white/15'
                        }`}
                >
                    {isSpeakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
                </button>
            </div>

            {/* Connecting overlay */}
            {callState === 'connecting' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-6" style={{ animation: 'fadeSlideUp 0.5s ease-out' }}>
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
                            <div className="absolute inset-2 rounded-full border-2 border-purple-400/20 animate-ping" style={{ animationDelay: '0.5s' }} />
                            <img src={displayImage} alt={character?.name} className="w-full h-full rounded-full object-cover border-2 border-white/20" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold text-lg">{character?.name}</p>
                            <p className="text-purple-300/70 text-sm mt-1 animate-pulse">Connecting...</p>
                        </div>
                        <button
                            onClick={handleEndCall}
                            className="mt-6 w-[64px] h-[64px] rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all hover:bg-red-500"
                        >
                            <PhoneOff size={24} />
                        </button>
                    </div>
                </div>
            )}

            {/* Ending overlay */}
            {(callState === 'ending' || callState === 'ended') && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md"
                    style={{ animation: 'fadeIn 0.4s ease-out' }}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 grayscale opacity-60">
                            <img src={displayImage} alt={character?.name} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-gray-300 font-bold">Call Ended</p>
                        <p className="text-gray-500 text-sm font-mono">{formatDuration(callDuration)}</p>
                    </div>
                </div>
            )}

            {/* CSS animations */}
            <style>{`
                @keyframes fadeSlideUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
