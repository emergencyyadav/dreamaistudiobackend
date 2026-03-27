import React, { useEffect, useState } from 'react';
import {
    Search,
    Sparkles,
    MessageCircle,
    Plus,
    Image as ImageIcon,
    Video,
    Download,
    Maximize2,
} from 'lucide-react';
import { supabase } from './supabaseClient';

const GENERATED_IMAGES_STORAGE_KEY = 'dreamai_generated_images';
const GENERATED_VIDEOS_STORAGE_KEY = 'dreamai_generated_videos';
const GENERATED_IMAGES_UPDATED_EVENT = 'dreamai:generated-images-updated';
const CREATED_CHARACTER_EVENT = 'dreamai:character-created';

function loadStoredItems(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function formatDate(value) {
    if (!value) return 'Just now';
    try {
        return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
        return 'Recent';
    }
}

function MyCharacterCard({ char, onStartChat }) {
    const img = char.images || char.image || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';
    const persona = char.persona || char.desc || 'A mysterious AI companion...';

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-transform duration-300 hover:-translate-y-1"
            style={{ aspectRatio: '2/3' }}
        >
            <img src={img} alt={char.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 75%)' }} />

            <div className="absolute top-2 left-2 z-10 sm:top-2.5 sm:left-2.5">
                <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                    My AI
                </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10 px-2.5 pb-2.5 pt-8 sm:px-3 sm:pb-3">
                <div className="mb-1 flex items-baseline gap-1.5">
                    <h3 className="line-clamp-1 text-[13px] font-black leading-tight text-white sm:text-[15px]">{char.name}</h3>
                    {char.age && <span className="shrink-0 text-[11px] font-medium text-white/70 sm:text-xs">{char.age}</span>}
                </div>
                <p
                    className="mb-2.5 line-clamp-2 text-[11px] leading-snug text-white/70 sm:text-xs"
                    style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {persona}
                </p>
                <button
                    onClick={() => onStartChat && onStartChat({ ...char, image: img, desc: persona })}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-500 active:scale-95"
                >
                    <MessageCircle size={13} /> Chat
                </button>
            </div>
        </div>
    );
}

function MyImageCard({ item }) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-950 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
            <div className="relative aspect-[4/5] overflow-hidden">
                <img src={item.url} alt="Generated artwork" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/15 to-transparent" />
                <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-2 sm:left-3 sm:top-3">
                    <span className="rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white/90">
                        {item.sizeLabel || 'Generated'}
                    </span>
                    {item.model && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-1 text-[10px] font-semibold text-purple-200">
                            {item.model.split('/').pop()}
                        </span>
                    )}
                </div>
                <div className="absolute bottom-2.5 right-2.5 flex gap-2 sm:bottom-3 sm:right-3">
                    <button
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/60 text-white transition-colors hover:bg-black/75 sm:h-10 sm:w-10"
                    >
                        <Maximize2 size={15} />
                    </button>
                    <a
                        href={item.url}
                        download={`dreamai_${item.id || 'image'}.png`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black transition-colors hover:bg-gray-200 sm:h-10 sm:w-10"
                    >
                        <Download size={15} />
                    </a>
                </div>
            </div>
            <div className="p-3.5 sm:p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">Generated image</h3>
                    <span className="text-[11px] text-gray-500">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-xs leading-relaxed text-gray-400 line-clamp-3">
                    {item.prompt || 'Generated from the DreamAI image creator.'}
                </p>
            </div>
        </div>
    );
}

export default function MyAIView({ onNavigateToCreate, onNavigateToGenerate, sessionInfo, user, onStartChat }) {
    const [characters, setCharacters] = useState([]);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [generatedVideos, setGeneratedVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const [activeTab, setActiveTab] = useState('characters');

    useEffect(() => {
        const loadGeneratedMedia = async () => {
            const localImages = loadStoredItems(GENERATED_IMAGES_STORAGE_KEY);
            const localVideos = loadStoredItems(GENERATED_VIDEOS_STORAGE_KEY);

            setGeneratedVideos(localVideos);

            if (!sessionInfo?.user?.id) {
                setGeneratedImages(localImages);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('cont_img')
                    .eq('uuid', sessionInfo.user.id)
                    .single();

                if (error) throw error;

                const remoteImages = Array.isArray(data?.cont_img) ? data.cont_img : [];
                setGeneratedImages(remoteImages.length > 0 ? remoteImages : localImages);
            } catch (err) {
                console.warn('[MyAI] Could not load users.cont_img, using local image cache instead:', err);
                setGeneratedImages(localImages);
            }
        };

        loadGeneratedMedia();
        window.addEventListener('storage', loadGeneratedMedia);
        window.addEventListener(GENERATED_IMAGES_UPDATED_EVENT, loadGeneratedMedia);
        return () => {
            window.removeEventListener('storage', loadGeneratedMedia);
            window.removeEventListener(GENERATED_IMAGES_UPDATED_EVENT, loadGeneratedMedia);
        };
    }, [sessionInfo]);

    useEffect(() => {
        const normalizeUsername = (value) => (value || '').trim().toLowerCase();

        const handleCharacterCreated = (event) => {
            const incoming = event.detail;
            if (!incoming) return;

            const incomingOwnerId = incoming.uuid || incoming.user_id || null;
            const incomingUsername = normalizeUsername(incoming.username);
            const currentUserId = sessionInfo?.user?.id || null;
            const currentUsername = normalizeUsername(user);

            const belongsToCurrentUser =
                (currentUserId && incomingOwnerId === currentUserId) ||
                (currentUsername && incomingUsername === currentUsername);

            if (!belongsToCurrentUser) return;

            setCharacters(prev => {
                const exists = prev.some(char => char.id === incoming.id);
                if (exists) return prev;
                return [incoming, ...prev];
            });
        };

        const fetchMyCharacters = async () => {
            setLoading(true);
            const userId = sessionInfo?.user?.id;
            const normalizedUser = normalizeUsername(user);

            if (!userId && !normalizedUser) {
                setLoading(false);
                return;
            }

            try {
                let data = [];
                let error = null;

                if (userId) {
                    const response = await supabase
                        .from('characters')
                        .select('*')
                        .eq('uuid', userId)
                        .order('created_at', { ascending: false });
                    data = response.data || [];
                    error = response.error;
                }

                if ((!data || data.length === 0) && normalizedUser) {
                    const fallbackResponse = await supabase
                        .from('characters')
                        .select('*')
                        .ilike('username', normalizedUser)
                        .order('created_at', { ascending: false });

                    if (!fallbackResponse.error && fallbackResponse.data) {
                        data = fallbackResponse.data;
                        error = null;
                    } else if (!error) {
                        error = fallbackResponse.error;
                    }
                }

                if (error) {
                    console.error('[MyAI] fetch error:', error);
                    setCharacters([]);
                } else {
                    setCharacters(data || []);
                }
            } catch (err) {
                console.error('[MyAI] fetch error:', err);
                setCharacters([]);
            } finally {
                setLoading(false);
            }
        };

        fetchMyCharacters();
        window.addEventListener(CREATED_CHARACTER_EVENT, handleCharacterCreated);

        return () => {
            window.removeEventListener(CREATED_CHARACTER_EVENT, handleCharacterCreated);
        };
    }, [sessionInfo, user]);

    const q = searchQuery.toLowerCase().trim();
    const filteredCharacters = characters.filter(char => {
        if (!q) return true;
        const tags = Array.isArray(char.tags) ? char.tags : [];
        return (char.name || '').toLowerCase().includes(q) || tags.some(tag => tag.toLowerCase().includes(q));
    });

    const filteredImages = generatedImages.filter(item => {
        if (!q) return true;
        return (
            (item.prompt || '').toLowerCase().includes(q) ||
            (item.model || '').toLowerCase().includes(q) ||
            (item.sizeLabel || '').toLowerCase().includes(q)
        );
    });

    const filteredVideos = generatedVideos.filter(item => {
        if (!q) return true;
        return (
            (item.prompt || '').toLowerCase().includes(q) ||
            (item.model || '').toLowerCase().includes(q)
        );
    });

    const tabs = [
        { id: 'characters', label: 'Characters', icon: Sparkles, count: characters.length },
        { id: 'images', label: 'Images', icon: ImageIcon, count: generatedImages.length },
        { id: 'videos', label: 'Videos', icon: Video, count: generatedVideos.length },
    ];

    const placeholders = {
        characters: 'Search your characters by name or traits...',
        images: 'Search your generated images...',
        videos: 'Search your generated videos...',
    };

    const isCharactersEmpty = !loading && characters.length === 0;
    const isImagesEmpty = !loading && generatedImages.length === 0;
    const isVideosEmpty = !loading && generatedVideos.length === 0;

    const noResults = !loading && (
        (activeTab === 'characters' && characters.length > 0 && filteredCharacters.length === 0) ||
        (activeTab === 'images' && generatedImages.length > 0 && filteredImages.length === 0) ||
        (activeTab === 'videos' && generatedVideos.length > 0 && filteredVideos.length === 0)
    );

    return (
        <div className="mx-auto flex h-full w-full max-w-7xl flex-col px-3 pb-28 pt-3 sm:px-4 sm:pb-8 lg:px-6 lg:py-5">
            <div className="mb-3 mt-1 w-full">
                <div className="flex w-full gap-1 rounded-2xl border border-white/10 bg-gray-950 p-1">
                    {tabs.map(({ id, label, icon, count }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex min-w-0 flex-1 items-center justify-center rounded-xl px-2 py-2.5 text-xs font-semibold transition-all sm:text-sm ${activeTab === id
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-gray-200'
                                }`}
                        >
                            <span className="flex min-w-0 items-center justify-center gap-1.5">
                                {React.createElement(icon, { size: 15 })}
                                <span className="truncate">{label}</span>
                            </span>
                            <span className={`ml-1.5 inline-flex shrink-0 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === id ? 'bg-white/15 text-white' : 'bg-white/5 text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <div className={`relative mb-5 w-full transition-all duration-300 ${searchFocused ? 'scale-[1.01]' : ''}`}>
                <Search size={17} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${searchFocused ? 'text-purple-400' : 'text-gray-500'}`} />
                <input
                    type="text"
                    placeholder={placeholders[activeTab]}
                    className="w-full rounded-2xl border border-white/10 bg-gray-950 py-3 pl-11 pr-4 text-sm font-medium text-white placeholder-gray-500 transition-all duration-300 focus:border-purple-500 focus:outline-none"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                />
            </div>

            {loading && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                </div>
            )}

            {!loading && activeTab === 'characters' && isCharactersEmpty && (
                <div className="mt-2 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-gray-950 px-5 py-10 text-center sm:mt-4 sm:min-h-0 sm:flex-1 sm:px-6 sm:py-12">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/15 text-purple-300 sm:mb-5 sm:h-16 sm:w-16">
                        <Sparkles size={28} />
                    </div>
                    <h2 className="mb-3 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-3xl">
                        Create your first AI companion
                    </h2>
                    <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400 sm:mb-7 sm:max-w-md">
                        Bring your imagination to life. Design unique looks, craft rich personalities, and interact with AI characters.
                    </p>
                    <button
                        onClick={onNavigateToCreate}
                        className="flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
                    >
                        <Plus size={16} /> Create Character
                    </button>
                </div>
            )}

            {!loading && activeTab === 'images' && isImagesEmpty && (
                <div className="mt-2 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-gray-950 px-5 py-10 text-center sm:mt-0 sm:min-h-0 sm:flex-1 sm:px-6 sm:py-12">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/15 text-purple-300 sm:mb-5 sm:h-16 sm:w-16">
                        <ImageIcon size={28} />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white sm:text-2xl">No generated images yet</h3>
                    <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400 sm:mb-7 sm:max-w-md">
                        Your generated art will appear here after you create it in the image generator.
                    </p>
                    <button
                        onClick={onNavigateToGenerate}
                        className="flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500"
                    >
                        <ImageIcon size={16} /> Open Generator
                    </button>
                </div>
            )}

            {!loading && activeTab === 'videos' && isVideosEmpty && (
                <div className="mt-2 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-gray-950 px-5 py-10 text-center sm:mt-0 sm:min-h-0 sm:flex-1 sm:px-6 sm:py-12">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/15 text-purple-300 sm:mb-5 sm:h-16 sm:w-16">
                        <Video size={28} />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-white sm:text-2xl">No generated videos yet</h3>
                    <p className="max-w-sm text-sm leading-relaxed text-gray-400 sm:max-w-md">
                        Video generation is still empty here for now, but the tab is ready once you start saving videos too.
                    </p>
                </div>
            )}

            {noResults && (
                <div className="mt-2 flex min-h-[280px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-gray-950 px-5 py-10 text-center opacity-80 sm:min-h-0 sm:flex-1 sm:px-6 sm:py-12">
                    <Search size={34} className="mb-4 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-300">No results found</h3>
                    <p className="mt-2 text-sm text-gray-500">Try adjusting your search terms</p>
                </div>
            )}

            {!loading && activeTab === 'characters' && filteredCharacters.length > 0 && (
                <>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                            <Sparkles size={18} className="text-purple-400" />
                            My AI Characters
                            <span className="text-gray-500 text-sm font-normal">({filteredCharacters.length})</span>
                        </h2>
                        <button
                            onClick={onNavigateToCreate}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/30 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-900/20 sm:px-4 sm:text-sm"
                        >
                            <Plus size={15} /> Create New
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pb-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                        {filteredCharacters.map(char => (
                            <MyCharacterCard key={char.id} char={char} onStartChat={onStartChat} />
                        ))}
                    </div>
                </>
            )}

            {!loading && activeTab === 'images' && filteredImages.length > 0 && (
                <>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                            <ImageIcon size={18} className="text-purple-400" />
                            My Generated Images
                            <span className="text-gray-500 text-sm font-normal">({filteredImages.length})</span>
                        </h2>
                        <button
                            onClick={onNavigateToGenerate}
                            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-purple-500/30 px-3 py-2 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-900/20 sm:px-4 sm:text-sm"
                        >
                            <Plus size={15} /> Generate More
                        </button>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredImages.map(item => (
                            <MyImageCard key={item.id} item={item} />
                        ))}
                    </div>
                </>
            )}

            {!loading && activeTab === 'videos' && filteredVideos.length > 0 && (
                <>
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-semibold text-white sm:text-lg">
                            <Video size={18} className="text-purple-400" />
                            My Generated Videos
                            <span className="text-gray-500 text-sm font-normal">({filteredVideos.length})</span>
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 pb-8 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredVideos.map(item => (
                            <div key={item.id} className="rounded-2xl border border-white/10 bg-gray-950 p-4 sm:p-5">
                                <div className="mb-2 flex items-center gap-2">
                                    <Video size={16} className="text-purple-300" />
                                    <p className="text-sm font-semibold text-white">Generated video</p>
                                </div>
                                <p className="text-xs text-gray-400">{item.prompt || 'Saved DreamAI video'}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
