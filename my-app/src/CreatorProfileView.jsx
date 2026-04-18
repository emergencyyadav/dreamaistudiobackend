import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { ArrowLeft, UserPlus, Crown, Activity, Check, Heart, Star, Zap, X, AlertTriangle } from 'lucide-react';
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

export default function CreatorProfileView({ creatorUsername, onBack, onCharacterClick, currentUser, onLike, onFollowChange, likedIds = new Set(), coinBalance = 0, onBurnCoin, onRequireUpgrade }) {
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

    const [showDonateModal, setShowDonateModal] = useState(false);
    const [donateAmount, setDonateAmount] = useState(10);
    const [donateStatus, setDonateStatus] = useState('idle'); // idle, loading, success, error
    const [donateError, setDonateError] = useState('');

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

                    {/* Follow and Donate Buttons */}
                    <div className="z-10 pb-2 flex items-center gap-3">
                        {currentUser && creator.uuid && currentUser.id === creator.uuid ? (
                            // Viewing your own profile
                            <div className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl font-semibold border border-gray-700">
                                This is you
                            </div>
                        ) : (
                            // Viewing someone else's profile (or not logged in)
                            <>
                                <button
                                    onClick={handleFollow}
                                    disabled={followLoading || !currentUser || !creator.uuid}
                                    title={!currentUser ? 'Sign in to follow' : !creator.uuid ? 'Cannot follow this user' : ''}
                                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg
                                        ${isFollowing
                                            ? 'bg-gray-800 text-white border border-gray-700 hover:bg-gray-700'
                                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-95'
                                        }
                                        ${(followLoading || !currentUser || !creator.uuid) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {followLoading ? (
                                        <div className="w-5 h-5 border-2 border-inherit border-t-transparent rounded-full animate-spin" />
                                    ) : isFollowing ? (
                                        <><Check size={18} /> Following</>
                                    ) : (
                                        <><UserPlus size={18} /> Follow</>
                                    )}
                                </button>

                                <button
                                    onClick={() => setShowDonateModal(true)}
                                    disabled={!currentUser || !creator.uuid}
                                    title={!currentUser ? 'Sign in to donate' : 'Donate Bolt Tokens'}
                                    className="flex items-center gap-1.5 px-3 sm:px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 hover:scale-[1.02] active:scale-95"
                                >
                                    <Zap size={18} className="fill-purple-500/50" />
                                    <span>Donate</span>
                                </button>
                            </>
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

            {/* Donate Modal */}
            {showDonateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { if (donateStatus !== 'loading') { setShowDonateModal(false); setDonateStatus('idle'); } }} />
                    <div className="relative w-full max-w-sm bg-gray-950 border border-purple-500/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => { setShowDonateModal(false); setDonateStatus('idle'); }}
                            disabled={donateStatus === 'loading'}
                            className="absolute top-4 right-4 p-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                        >
                            <X size={16} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 mx-auto mb-4 bg-purple-500/10 rounded-full border border-purple-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                                <Zap size={28} className="text-purple-400 fill-purple-400/50" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-1">Donate to {creator.username}</h3>
                            <p className="text-xs text-gray-400 mb-6">Support this creator by sending them Bolt Tokens.</p>

                            {donateStatus === 'success' ? (
                                <div className="py-6 px-4 bg-green-500/10 border border-green-500/20 rounded-2xl flex flex-col items-center">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mb-3">
                                        <Check size={20} className="text-white" />
                                    </div>
                                    <p className="text-green-400 font-bold mb-1">Donation Successful!</p>
                                    <p className="text-xs text-green-400/70">Thank you for supporting {creator.username}.</p>
                                    <button
                                        onClick={() => { setShowDonateModal(false); setDonateStatus('idle'); }}
                                        className="mt-5 w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            ) : donateStatus === 'error' ? (
                                <div className="py-5 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center">
                                    <AlertTriangle size={24} className="text-red-400 mb-2" />
                                    <p className="text-red-400 font-bold mb-1 text-sm">Insufficient Tokens</p>
                                    <p className="text-xs text-red-400/70 mb-5">{donateError || "You don't have enough Bolt Tokens."}</p>
                                    <button
                                        onClick={() => {
                                            setShowDonateModal(false);
                                            setDonateStatus('idle');
                                            if (onRequireUpgrade) onRequireUpgrade();
                                        }}
                                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold tracking-wide shadow-lg hover:shadow-orange-500/30 active:scale-95 transition-all text-sm flex items-center justify-center gap-2"
                                    >
                                        <Crown size={16} className="fill-white/20" /> Get More Tokens
                                    </button>
                                </div>
                            ) : donateStatus === 'confirm' ? (
                                <div className="py-5 px-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex flex-col items-center">
                                    <p className="text-white font-bold mb-2">Confirm Donation</p>
                                    <p className="text-sm text-gray-300 mb-6 text-center leading-relaxed">
                                        Are you sure you want to send <strong className="text-purple-400">{donateAmount} Bolt{donateAmount !== 1 ? 's' : ''}</strong> to <strong className="text-white">@{creator.username}</strong>?
                                    </p>
                                    <div className="flex w-full gap-3">
                                        <button
                                            onClick={() => setDonateStatus('idle')}
                                            className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors text-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                setDonateStatus('loading');
                                                try {
                                                    // 1. Perform secure transfer via RPC
                                                    if (creator.uuid) {
                                                        const { error: rpcError } = await supabase.rpc('transfer_bolt_tokens', {
                                                            receiver_uuid: creator.uuid,
                                                            amount: donateAmount
                                                        });
                                                        if (rpcError) throw new Error(rpcError.message || 'Transfer failed on server.');
                                                    }

                                                    // 2. Local UI Deduction (Updates your balance instantly in UI view)
                                                    if (onBurnCoin) {
                                                        await onBurnCoin(donateAmount);
                                                    }

                                                    setDonateStatus('success');
                                                } catch (e) {
                                                    setDonateError(e.message || 'An error occurred during transaction.');
                                                    setDonateStatus('error');
                                                }
                                            }}
                                            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-lg hover:shadow-purple-500/30 active:scale-95 transition-all text-sm"
                                        >
                                            Confirm Send
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex gap-2 mb-4">
                                        {[10, 50, 100].map(amount => (
                                            <button
                                                key={amount}
                                                onClick={() => setDonateAmount(amount)}
                                                className={`flex-1 py-3 rounded-2xl font-bold flex flex-col items-center justify-center gap-1 transition-all
                                                    ${donateAmount === amount
                                                        ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                                                        : 'bg-gray-900 border-2 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                                            >
                                                <Zap size={14} className={donateAmount === amount ? 'fill-purple-500/50 text-purple-400' : 'text-gray-600'} />
                                                <span>{amount}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mb-6 relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Zap size={16} className="text-gray-500 fill-gray-500/20" />
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            value={donateAmount || ''}
                                            onChange={(e) => setDonateAmount(parseInt(e.target.value) || 0)}
                                            className="w-full bg-gray-900 border border-gray-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl py-3 pl-10 pr-4 text-white font-bold placeholder-gray-600 outline-none transition-all"
                                            placeholder="Custom amount..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (coinBalance < donateAmount) {
                                                setDonateError(`You need ${donateAmount} tokens, but you only have ${coinBalance}.`);
                                                setDonateStatus('error');
                                            } else {
                                                setDonateStatus('confirm'); // Move to confirmation step instead of sending right away
                                            }
                                        }}
                                        disabled={donateStatus === 'loading' || !donateAmount || donateAmount < 1}
                                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {donateStatus === 'loading' ? (
                                            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>Proceed with {donateAmount} Bolts <Zap size={16} className="fill-white/30" /></>
                                        )}
                                    </button>
                                    <p className="mt-4 text-[10px] text-gray-500 text-center font-medium">Your current balance: {coinBalance} Bolt{coinBalance !== 1 ? 's' : ''}</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
