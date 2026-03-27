import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, UserPlus, Crown, Activity, Check, Heart, Star } from 'lucide-react';
import CharacterCard from './CharacterCard';

// Defined at module level so it is always available before any async calls use it
function formatCount(num) {
    if (!num && num !== 0) return '0';
    const n = typeof num === 'string' ? parseFloat(num.replace(/[^0-9.]/g, '')) : num;
    if (isNaN(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return Math.floor(n).toString();
}

export default function CreatorProfileView({ creatorUsername, onBack, onCharacterClick, currentUser, onLike, onFollowChange, likedIds = new Set() }) {
    const [creator, setCreator] = useState(null);
    const [characters, setCharacters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [stats, setStats] = useState({
        followersCount: 0,
        followingCount: 0,
        totalLikes: 0,
        totalChars: 0,
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        if (creatorUsername) {
            fetchCreatorData();
        }
    }, [creatorUsername]);

    const fetchCreatorData = async () => {
        setLoading(true);
        setError(null);
        try {
            const queryName = creatorUsername.startsWith('@')
                ? creatorUsername.substring(1)
                : creatorUsername;

            // -- Step 1: Fetch creator profile first so we can query characters by stable uuid --
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .ilike('username', queryName)
                .maybeSingle();

            let charsData = [];

            // -- Step 2: Fetch creator characters, preferring uuid over username --
            if (userData?.uuid) {
                const { data: charsByUuid, error: charsByUuidError } = await supabase
                    .from('characters')
                    .select('*')
                    .eq('uuid', userData.uuid)
                    .order('created_at', { ascending: false });

                if (charsByUuidError) {
                    console.error('Error fetching creator characters by uuid:', charsByUuidError.message);
                } else {
                    charsData = charsByUuid || [];
                }
            }

            if (charsData.length === 0) {
                const { data: charsByUsername, error: charsByUsernameError } = await supabase
                    .from('characters')
                    .select('*')
                    .ilike('username', queryName)
                    .order('created_at', { ascending: false });

                if (charsByUsernameError) {
                    console.error('Error fetching creator characters by username:', charsByUsernameError.message);
                } else {
                    charsData = charsByUsername || [];
                }
            }

            // Build synthetic creator object if users table has no record
            let creatorObj;
            if (userData && !userError) {
                creatorObj = userData;
            } else if (charsData && charsData.length > 0) {
                creatorObj = {
                    uuid: charsData[0].uuid || null,
                    username: charsData[0].username || queryName,
                    is_premium: false,
                    followers_count: 0,
                    following_count: 0,
                };
            } else {
                setError('Creator not found.');
                setLoading(false);
                return;
            }

            setCreator(creatorObj);

            const isOwnProfile = !!currentUser?.id && !!creatorObj.uuid && currentUser.id === creatorObj.uuid;
            const visibleChars = (charsData || []).filter(c => c.is_public !== false || isOwnProfile);

            // -- Step 3: Format characters using data we already have --
            const formatted = visibleChars.map(c => {
                let parsedTags = [];
                if (typeof c.tags === 'string') {
                    try { parsedTags = JSON.parse(c.tags); }
                    catch { parsedTags = c.tags.split(',').map(t => t.trim()); }
                } else if (Array.isArray(c.tags)) {
                    parsedTags = c.tags;
                }
                return {
                    ...c,
                    image: c.images || c.image || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800',
                    desc: c.persona || c.desc || c.description || 'A mysterious character...',
                    tags: parsedTags,
                    likes: c.likes !== undefined && c.likes !== null ? c.likes : 0,
                    msgs: c.msgs !== undefined && c.msgs !== null ? c.msgs : 0,
                    creator: `@${queryName}`,
                };
            });
            setCharacters(formatted);

            // -- Step 4: Compute total likes directly from characters.likes column --
            const totalLikes = visibleChars.reduce((sum, c) => {
                const val = typeof c.likes === 'number' ? c.likes
                    : typeof c.likes === 'string' ? parseFloat(c.likes.replace(/[^0-9.]/g, '')) || 0
                        : 0;
                return sum + val;
            }, 0);

            // -- Step 5: Count followers/following LIVE from follows table --
            // (Never rely on users.followers_count — RLS blocks other users from updating it)
            let followersCount = 0;
            let followingCount = 0;

            if (creatorObj.uuid) {
                const [{ count: fCount }, { count: ingCount }] = await Promise.all([
                    supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('following_uuid', creatorObj.uuid),
                    supabase
                        .from('follows')
                        .select('*', { count: 'exact', head: true })
                        .eq('follower_uuid', creatorObj.uuid),
                ]);
                followersCount = fCount || 0;
                followingCount = ingCount || 0;
            }

            setStats({
                followersCount,
                followingCount,
                totalLikes,
                totalChars: visibleChars.length,
            });

            // -- Step 6: Check if current user follows this creator --
            if (currentUser && currentUser.id && creatorObj.uuid && creatorObj.uuid !== currentUser.id) {
                const { data: followData } = await supabase
                    .from('follows')
                    .select('id')
                    .eq('follower_uuid', currentUser.id)
                    .eq('following_uuid', creatorObj.uuid)
                    .maybeSingle();
                setIsFollowing(!!followData);
            }

        } catch (err) {
            console.error('fetchCreatorData error:', err);
            setError('Something went wrong loading this profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        if (!currentUser || !creator || !creator.uuid) return;
        setFollowLoading(true);

        // ✅ FIX 1: Capture the ORIGINAL count BEFORE the optimistic update
        // so the DB write uses the correct pre-click value (no double-counting)
        const originalFollowersCount = stats.followersCount;
        const wasFollowing = isFollowing;
        const delta = wasFollowing ? -1 : 1;

        // Optimistic UI — update both count and button state immediately
        setStats(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount + delta) }));
        setIsFollowing(!wasFollowing);

        try {
            let opError = null;

            if (wasFollowing) {
                const { error } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_uuid', currentUser.id)
                    .eq('following_uuid', creator.uuid);
                opError = error;
            } else {
                const { error } = await supabase
                    .from('follows')
                    .insert({ follower_uuid: currentUser.id, following_uuid: creator.uuid });
                opError = error;
            }

            if (opError) {
                // Roll back optimistic update atomically
                setStats(prev => ({ ...prev, followersCount: originalFollowersCount }));
                setIsFollowing(wasFollowing);
                console.error('Follow/Unfollow error:', opError.message);
                alert((wasFollowing ? 'Could not unfollow: ' : 'Could not follow: ') + opError.message);
                return;
            }

            // ✅ THE REAL FIX: Count actual followers live from the follows table.
            // We do NOT update users.followers_count because RLS blocks writing to
            // another user's row. The follows table is the single source of truth.
            const { count: realFollowerCount } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('following_uuid', creator.uuid);

            setStats(prev => ({
                ...prev,
                followersCount: realFollowerCount ?? prev.followersCount,
            }));

            // Notify parent so ProfileView re-fetches its own following count
            if (onFollowChange) onFollowChange();
        } catch (err) {
            // Roll back on any unexpected error
            setStats(prev => ({ ...prev, followersCount: originalFollowersCount }));
            setIsFollowing(wasFollowing);
            console.error('handleFollow error:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center bg-gray-950">
                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !creator) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-gray-950 text-white gap-4">
                <p className="text-gray-400">{error || 'Creator not found.'}</p>
                <button onClick={onBack} className="px-5 py-2 bg-purple-600 rounded-xl hover:bg-purple-500 transition-colors">Go Back</button>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-gray-950 text-white w-full overflow-y-auto">
            {/* Header Banner */}
            <div className="relative h-64 w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-gray-900 overflow-hidden">
                <button onClick={onBack} className="absolute top-4 left-4 z-20 p-2 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-colors">
                    <ArrowLeft size={24} className="text-white" />
                </button>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_1px_1px,_white_1px,_transparent_0)] bg-[size:40px_40px]"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6 -mt-20 mb-10">
                    {/* Avatar */}
                    <div className="w-40 h-40 rounded-3xl bg-gray-900 border-4 border-gray-950 shadow-2xl overflow-hidden shrink-0 z-10 flex items-center justify-center">
                        <span className="text-5xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent uppercase">
                            {(creator.username || 'U').substring(0, 2)}
                        </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left z-10 pb-2">
                        <h1 className="text-3xl md:text-4xl font-extrabold flex items-center justify-center md:justify-start gap-3 flex-wrap">
                            @{creator.username}
                            {creator.is_premium && (
                                <span
                                    title="Premium Member"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse"
                                    style={{ animationDuration: '3s' }}
                                >
                                    <Star size={13} className="text-amber-400 fill-amber-400" />
                                    <span className="text-xs font-bold text-amber-400 tracking-wide uppercase">PREMIUM</span>
                                </span>
                            )}
                        </h1>

                        {/* Stats Row */}
                        <div className="flex items-center justify-center md:justify-start gap-4 sm:gap-6 mt-4 flex-wrap">
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    {formatCount(stats.followersCount)}
                                </span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Followers</span>
                            </div>
                            <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                                    {formatCount(stats.followingCount)}
                                </span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Following</span>
                            </div>
                            <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                                    {formatCount(stats.totalChars)}
                                </span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Characters</span>
                            </div>
                            <div className="h-8 w-px bg-gray-700 hidden sm:block"></div>
                            <div className="flex flex-col items-center md:items-start">
                                <span className="text-2xl font-bold bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
                                    {formatCount(stats.totalLikes)}
                                </span>
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Likes</span>
                            </div>
                        </div>
                    </div>

                    {/* Follow Button */}
                    {/* ✅ FIX 2: Correct "This is you" vs Follow logic */}
                    <div className="z-10 pb-2">
                        {currentUser && creator.uuid && currentUser.id === creator.uuid ? (
                            // Viewing your own profile
                            <div className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl font-semibold border border-gray-700">
                                This is you
                            </div>
                        ) : (
                            // Viewing someone else's profile (or not logged in)
                            <button
                                onClick={handleFollow}
                                disabled={followLoading || !currentUser || !creator.uuid}
                                title={!currentUser ? 'Sign in to follow' : !creator.uuid ? 'Cannot follow this user' : ''}
                                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg
                                    ${isFollowing
                                        ? 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/30 hover:scale-105 active:scale-95'
                                    }
                                    ${(followLoading || !currentUser || !creator.uuid) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {followLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : isFollowing ? (
                                    <><Check size={18} /> Following</>
                                ) : (
                                    <><UserPlus size={18} /> Follow</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Characters Grid */}
                <div className="mt-12">
                    <div className="flex items-center gap-2 mb-6 border-b border-gray-800 pb-4">
                        <Activity size={24} className="text-purple-400" />
                        <h2 className="text-2xl font-bold text-white tracking-tight">Characters Collection</h2>
                        <span className="text-gray-500 text-sm">({characters.length})</span>
                    </div>

                    {characters.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Heart size={40} className="mx-auto mb-4 opacity-30" />
                            <p>This creator hasn't published any characters yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {characters.map((char, index) => (
                                <CharacterCard
                                    key={char.id}
                                    character={char}
                                    index={index}
                                    onClick={() => onCharacterClick(char)}
                                    onLike={onLike}
                                    isLiked={likedIds.has(char.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
