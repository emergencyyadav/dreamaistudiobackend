import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Edit2, Check, X, LogOut, Lock, Activity, AlertTriangle, Globe, MessageSquare, Users, Calendar, Shield, ChevronDown, Sparkles, Star } from 'lucide-react';
import { supabase } from './supabaseClient';
import { checkContentSafe } from './guard';

// ── Animated counter hook ───────────────────────────────────────────
function useAnimatedCount(target, duration = 1200) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target === 0) { setCount(0); return; }
        let start = 0;
        const startTime = performance.now();
        const step = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);
    return count;
}

// ── Floating particles background ───────────────────────────────────
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full opacity-20 animate-pulse"
                    style={{
                        width: `${Math.random() * 6 + 2}px`,
                        height: `${Math.random() * 6 + 2}px`,
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        background: `hsl(${260 + Math.random() * 60}, 80%, 70%)`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: `${2 + Math.random() * 3}s`,
                    }}
                />
            ))}
        </div>
    );
}

// ── Main ProfileView ────────────────────────────────────────────────
// refreshKey: increment from parent to force a fresh DB stats fetch (e.g. after following someone)
export default function ProfileView({ onLogout, refreshKey = 0, onReadTerms, onForceLogout, onGuard }) {
    const [user, setUser] = useState(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [languageSaving, setLanguageSaving] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Delete Account states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Real stats from database
    const [characterCount, setCharacterCount] = useState(0);
    const [chatCount, setChatCount] = useState(0);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [statsLoading, setStatsLoading] = useState(true);

    const fileInputRef = useRef(null);

    // Animated counters
    const animatedCharacters = useAnimatedCount(characterCount);
    const animatedChats = useAnimatedCount(chatCount);
    const animatedFollowers = useAnimatedCount(followersCount);
    const animatedFollowing = useAnimatedCount(followingCount);

    // Mount animation
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // ── Fetch character + chat + follow counts from Supabase ────────
    const fetchStats = useCallback(async (userId) => {
        if (!userId) return;
        setStatsLoading(true);
        try {
            // Count characters created by this user
            const { count: charCount, error: charError } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .eq('uuid', userId);

            if (!charError && charCount !== null) {
                setCharacterCount(charCount);
            }

            // Count chat conversations for this user
            const { count: msgCount, error: msgError } = await supabase
                .from('chats')
                .select('*', { count: 'exact', head: true })
                .eq('user_uuid', userId);

            if (!msgError && msgCount !== null) {
                setChatCount(msgCount);
            }

            // Count followers & following LIVE from follows table
            // (users.followers_count is unreliable — RLS blocks cross-user updates)
            const [{ count: fCount }, { count: ingCount }] = await Promise.all([
                supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_uuid', userId),
                supabase
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('follower_uuid', userId),
            ]);
            setFollowersCount(fCount || 0);
            setFollowingCount(ingCount || 0);
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // ── Fetch user profile on mount ─────────────────────────────────
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const metadata = session.user.user_metadata || {};
                // Also fetch is_premium from users table
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('is_premium')
                    .eq('uuid', session.user.id)
                    .single();
                setUser({
                    id: session.user.id,
                    email: session.user.email,
                    username: metadata.username || metadata.full_name || 'user_' + session.user.id.substring(0, 8),
                    avatarUrl: metadata.avatar_url || null,
                    createdAt: session.user.created_at,
                    usernameUpdates: metadata.username_updates || [],
                    language: metadata.language || 'English',
                    isPremium: dbUser?.is_premium ?? false
                });
                setNewUsername(metadata.username || metadata.full_name || 'user_' + session.user.id.substring(0, 8));
                fetchStats(session.user.id);
            }
            setLoading(false);
        };
        fetchUser();
    }, [fetchStats]);

    // ── Re-fetch stats when refreshKey changes (e.g. after following someone) ──
    useEffect(() => {
        if (user?.id && refreshKey > 0) {
            fetchStats(user.id);
        }
    }, [refreshKey, user?.id, fetchStats]);

    // ── Username validation ─────────────────────────────────────────
    const handlePreSaveValidation = () => {
        setUsernameError('');
        setSuccessMessage('');

        if (newUsername.trim() === user.username) {
            setIsEditingUsername(false);
            return;
        }
        if (newUsername.length < 3) {
            setUsernameError('Username must be at least 3 characters.');
            return;
        }

        // GUARD: Check username for forbidden words
        const violation = checkContentSafe(newUsername);
        if (violation) {
            onGuard(violation);
            return;
        }

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const validUpdates = (user.usernameUpdates || []).filter(ts => new Date(ts) > oneWeekAgo);

        if (validUpdates.length >= 2) {
            setUsernameError('You can only change your username twice a week.');
            return;
        }
        setShowConfirmModal(true);
    };

    const commitUsernameSave = async () => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let validUpdates = (user.usernameUpdates || []).filter(ts => new Date(ts) > oneWeekAgo);
        validUpdates.push(now.toISOString());

        const cleanUsername = newUsername.replace(/\s+/g, '');

        try {
            // 1. Check uniqueness — make sure no other user has this username
            const { data: existingUsers, error: checkErr } = await supabase
                .from('users')
                .select('uuid')
                .ilike('username', cleanUsername)
                .neq('uuid', user.id)
                .limit(1);

            if (checkErr) console.warn('Uniqueness check failed:', checkErr.message);
            if (existingUsers && existingUsers.length > 0) {
                setUsernameError('This username is already taken. Try a different one.');
                setShowConfirmModal(false);
                return;
            }

            // 2. Update auth metadata (Primary Source of truth for current session)
            const { error: authErr } = await supabase.auth.updateUser({
                data: { username: cleanUsername, username_updates: validUpdates }
            });
            if (authErr) throw authErr;

            // 3. Sync to `users` table (for search & public profiles)
            // Use upsert so it creates the record if it mysteriously doesn't exist
            const { error: usersErr } = await supabase
                .from('users')
                .upsert({
                    uuid: user.id,
                    username: cleanUsername,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'uuid' });

            if (usersErr) {
                console.error('CRITICAL: Failed to sync to users table:', usersErr.message);
                // We continue because auth metadata was updated, but the public profile might be stale
            }

            // 4. Sync to `characters` table (the @ handles under character cards)
            const { data: updatedChars, error: charsErr } = await supabase
                .from('characters')
                .update({ username: cleanUsername })
                .eq('uuid', user.id)
                .select('id'); // return updated ids to confirm it worked

            if (charsErr) {
                console.error('CRITICAL: Failed to sync to characters table:', charsErr.message);
            } else {
                console.log(`Successfully updated ${updatedChars?.length || 0} characters to new username.`);
            }

            setUser(prev => ({ ...prev, username: cleanUsername, usernameUpdates: validUpdates }));
            setSuccessMessage('Username updated everywhere!');
            setIsEditingUsername(false);
            setShowConfirmModal(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('commitUsernameSave process failed:', err);
            setUsernameError(err.message || 'Failed to update username.');
            setShowConfirmModal(false);
        }
    };

    // ── Avatar upload ───────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setUsernameError('Image too large. Please select under 2 MB.');
            return;
        }

        setAvatarUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Avatar = reader.result;
            try {
                const { error } = await supabase.auth.updateUser({ data: { avatar_url: base64Avatar } });
                if (error) throw error;
                setUser(prev => ({ ...prev, avatarUrl: base64Avatar }));
                setSuccessMessage('Profile picture updated!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (err) {
                setUsernameError('Failed to save picture: ' + err.message);
            } finally {
                setAvatarUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    // ── Language change (persists to user_metadata) ─────────────────
    const handleLanguageChange = async (e) => {
        const selectedLang = e.target.value;
        setLanguageSaving(true);
        setUsernameError('');
        try {
            const { error } = await supabase.auth.updateUser({ data: { language: selectedLang } });
            if (error) throw error;
            setUser(prev => ({ ...prev, language: selectedLang }));
            setSuccessMessage(`Language updated to ${selectedLang}`);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setUsernameError('Failed to save language: ' + err.message);
        } finally {
            setLanguageSaving(false);
        }
    };

    // ── Delete Account ──────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        // Show the UI immediately, add a small delay for UX so it feels like a process
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Optional: Insert feedback reason if provided
            if (deleteReason.trim()) {
                const { error: feedbackError } = await supabase.from('feedback').insert({
                    user_id: user.id,
                    message: `ACCOUNT DELETION. Reason: ${deleteReason}`
                });
                if (feedbackError) console.error("Error inserting feedback:", feedbackError);
            }

            // ✅ PERMANENT ACCOUNT BAN: This user is non-recoverable.
            // When they try to log back in, the system finds is_deleted=true and blocks them.
            const { error: userError } = await supabase
                .from('users')
                .update({
                    is_deleted: true, // Permanent block
                    coin_balance: 0,
                    username: `banned_user_${user.id.substring(0, 6)}`,
                    is_premium: false,
                    avatar_url: null
                })
                .eq('uuid', user.id);

            if (userError) console.error("Error banning account:", userError.message);

            // Catch-all if they also happen to use a 'profiles' table backing
            const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);
            if (profileError) console.error("Error deleting profile:", profileError);

            // Fallback: Clear user files in case Supabase Storage foreign-keys block the deletion
            const { error: storageError } = await supabase.from('storage.objects').delete().eq('owner', user.id);
            if (storageError) console.error("Could not drop storage objects (this is fine if you aren't using Supabase Storage):", storageError);

            // Trigger an RPC if you have set up a Postgres function to wipe `auth.users`
            const { error: rpcError } = await supabase.rpc('delete_user');
            if (rpcError) throw new Error(rpcError.message || "RPC delete_user failed. You may have active storage items blocking deletion, or the function has an error.");

            // Sign out safely
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) console.error("Sign out glitch (normal when account is forcibly wiped):", signOutError);

            // Short delay before snapping them out completely
            await new Promise(resolve => setTimeout(resolve, 800));
            if (onForceLogout) {
                onForceLogout();
            } else {
                onLogout();
            }
        } catch (err) {
            console.error("Error deleting account:", err);
            await new Promise(r => setTimeout(r, 800));
            console.error("Deletion Failed:", err.message);
            setUsernameError("Deletion Failed: " + (err.message || 'Unknown server error'));
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // ── Helpers ─────────────────────────────────────────────────────
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';

    const daysSinceJoin = user?.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const validUpdates = (user?.usernameUpdates || []).filter(ts => new Date(ts) > oneWeekAgo);
    const remainingUpdates = 2 - validUpdates.length;

    const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

    // ── Language options with flag emojis ────────────────────────────
    const languages = [
        { value: 'English', label: '🇬🇧  English' },
        { value: 'Español', label: '🇪🇸  Español (Spanish)' },
        { value: 'Russian', label: '🇷🇺  Русский (Russian)' },
        { value: 'Hindi', label: '🇮🇳  हिन्दी (Hindi)' },
        { value: 'Mandarin', label: '🇨🇳  中文 (Mandarin)' },
        { value: 'Japanese', label: '🇯🇵  日本語 (Japanese)' },
        { value: 'Korean', label: '🇰🇷  한국어 (Korean)' },
        { value: 'French', label: '🇫🇷  Français (French)' },
        { value: 'Dutch', label: '🇳🇱  Nederlands (Dutch)' },
        { value: 'Portuguese', label: '🇧🇷  Português (Portuguese)' },
        { value: 'German', label: '🇩🇪  Deutsch (German)' },
        { value: 'Arabic', label: '🇸🇦  العربية (Arabic)' },
    ];

    // ── Full-screen Delete Loading State ─────────────────────────────
    if (isDeleting) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <h1 className="text-3xl md:text-4xl font-black text-red-500 animate-pulse tracking-wide text-center uppercase">
                        Account Deletion<br />In Progress...
                    </h1>
                    <p className="text-red-400/80 text-sm font-bold uppercase tracking-[0.2em]">Erasing all data permanently</p>
                </div>
            </div>
        );
    }

    // ── Loading spinner ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm animate-pulse">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                    <Lock size={32} className="text-gray-500" />
                </div>
                <h2 className="text-xl font-bold text-white">Not Logged In</h2>
                <p className="text-gray-400 max-w-xs">Please log in to view your profile and manage your settings.</p>
            </div>
        );
    }

    return (
        <>
            <div className={`max-w-5xl mx-auto px-4 py-8 lg:py-12 w-full h-full overflow-y-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* ═══════════════════════ BANNER / HEADER ═══════════════════════ */}
                <div className="relative rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-purple-500/10 overflow-hidden mb-8 shadow-2xl shadow-purple-900/20 group">
                    {/* Animated gradient banner */}
                    <div className="h-52 w-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-700/50 via-pink-600/30 to-indigo-800/50 animate-gradient-shift" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
                        <FloatingParticles />
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
                    </div>

                    <div className="px-6 sm:px-10 pb-8 flex flex-col sm:flex-row items-center sm:items-end gap-6 relative -mt-20">
                        {/* ── Avatar ── */}
                        <div className="relative group/avatar cursor-pointer z-10" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-36 h-36 rounded-full p-1 bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/30 relative">
                                <div className="w-full h-full rounded-full bg-gray-950 p-0.5 overflow-hidden">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                                            <span className="text-3xl font-bold text-white">{initials}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Hover overlay */}
                                <div className="absolute inset-1 rounded-full bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all duration-300 flex-col gap-1 z-20 backdrop-blur-sm">
                                    {avatarUploading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Camera size={22} className="text-white" />
                                            <span className="text-[10px] text-white/90 font-bold uppercase tracking-widest">Change</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* Online indicator */}
                            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-4 border-gray-900 z-30 shadow-lg shadow-green-500/50" />
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
                        </div>

                        {/* ── User Info ── */}
                        <div className="flex-1 text-center sm:text-left pt-16 sm:pt-0 pb-2 min-w-0">
                            <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                                {isEditingUsername ? (
                                    <div className="flex items-center gap-2 animate-in">
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ''))}
                                            className="bg-gray-950 border-2 border-purple-500 rounded-xl px-4 py-2 text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 w-52 transition-all"
                                            autoFocus
                                            placeholder="No spaces"
                                            maxLength={24}
                                        />
                                        <button onClick={handlePreSaveValidation} className="p-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 hover:scale-105 transition-all active:scale-95">
                                            <Check size={18} />
                                        </button>
                                        <button onClick={() => { setIsEditingUsername(false); setNewUsername(user.username); setUsernameError(''); }} className="p-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 hover:scale-105 transition-all active:scale-95">
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center justify-center sm:justify-start gap-3 group/name flex-wrap">
                                        <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">@{user.username}</span>
                                        {user.isPremium && (
                                            <span
                                                title="Premium Member"
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse"
                                                style={{ animationDuration: '3s' }}
                                            >
                                                <Star size={13} className="text-amber-400 fill-amber-400" />
                                                <span className="text-xs font-bold text-amber-400 tracking-wide">PREMIUM</span>
                                            </span>
                                        )}
                                        <button
                                            onClick={() => setIsEditingUsername(true)}
                                            className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 transition-all hover:bg-purple-500/30 hover:scale-110 active:scale-95 shadow-sm shadow-purple-500/10"
                                            title="Edit username"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </h1>
                                )}
                            </div>

                            <p className="text-gray-400 text-sm font-medium mb-3">{user.email}</p>

                            <div className="flex items-center gap-4 justify-center sm:justify-start mb-4">
                                <div className="flex flex-col items-center sm:items-start group/stat cursor-pointer">
                                    <span className="text-lg font-bold text-white group-hover/stat:text-purple-400 transition-colors">{animatedFollowers}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Followers</span>
                                </div>
                                <div className="w-[1px] h-6 bg-gray-800"></div>
                                <div className="flex flex-col items-center sm:items-start group/stat cursor-pointer">
                                    <span className="text-lg font-bold text-white group-hover/stat:text-purple-400 transition-colors">{animatedFollowing}</span>
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Following</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 justify-center sm:justify-start text-xs text-gray-500">
                                <Calendar size={12} />
                                <span>Member since {memberSince}</span>
                                <span className="text-gray-700">•</span>
                                <span>{daysSinceJoin} days</span>
                            </div>

                            {/* Toasts */}
                            {usernameError && (
                                <div className="mt-3 flex items-center gap-2 text-red-400 text-xs font-medium bg-red-400/10 border border-red-500/20 px-4 py-2 rounded-xl animate-in w-fit">
                                    <AlertTriangle size={14} />
                                    {usernameError}
                                </div>
                            )}
                            {successMessage && (
                                <div className="mt-3 flex items-center gap-2 text-green-400 text-xs font-medium bg-green-400/10 border border-green-500/20 px-4 py-2 rounded-xl animate-in w-fit">
                                    <Sparkles size={14} />
                                    {successMessage}
                                </div>
                            )}
                        </div>

                        {/* ── Logout ── */}
                        <div className="sm:self-end pb-2">
                            <button
                                onClick={onLogout}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/10 hover:border-red-400/40 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 active:scale-95"
                            >
                                <LogOut size={16} />
                                Log Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════ STATS CARDS ═══════════════════════════ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    {/* Characters Created */}
                    <div className="group bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-lg hover:border-purple-500/30 hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-purple-900/30 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform duration-500">
                                <Users size={22} className="text-purple-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Characters</p>
                                <p className="text-gray-500 text-[10px]">Created by you</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            {statsLoading ? (
                                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="text-4xl font-black text-white tabular-nums bg-gradient-to-r from-purple-300 to-purple-100 bg-clip-text text-transparent">
                                    {animatedCharacters}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Total Chats */}
                    <div className="group bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-lg hover:border-blue-500/30 hover:shadow-blue-500/10 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-900/30 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                                <MessageSquare size={22} className="text-blue-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Chats</p>
                                <p className="text-gray-500 text-[10px]">Conversations started</p>
                            </div>
                        </div>
                        <div className="flex items-end gap-2">
                            {statsLoading ? (
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <span className="text-4xl font-black text-white tabular-nums bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent">
                                    {animatedChats}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Account Status */}
                    <div className="group bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-lg hover:border-emerald-500/30 hover:shadow-emerald-500/10 transition-all duration-500 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-emerald-900/30 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                                <Shield size={22} className="text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Status</p>
                                <p className="text-gray-500 text-[10px]">Account health</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                            </span>
                            <span className="text-lg font-bold text-emerald-400">Active</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-2">
                            Username changes left: <span className="text-white font-bold">{remainingUpdates}/2</span> this week
                        </p>
                    </div>
                </div>

                {/* ═══════════════════════ SETTINGS SECTION ══════════════════════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    {/* ── Language Settings ── */}
                    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-lg hover:border-blue-500/20 transition-all duration-300">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-900/30 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                                <Globe size={22} className="text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Language</h3>
                                <p className="text-gray-500 text-xs">AI responses &amp; interface language</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-800/50">
                            <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Preferred Language</label>
                            <div className="relative">
                                <select
                                    value={user?.language || 'English'}
                                    onChange={handleLanguageChange}
                                    disabled={languageSaving}
                                    className="w-full bg-gray-950/80 border border-gray-700/50 text-white text-sm rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 block px-4 py-3.5 appearance-none focus:outline-none transition-all duration-300 disabled:opacity-50 cursor-pointer hover:border-gray-600"
                                >
                                    {languages.map(lang => (
                                        <option key={lang.value} value={lang.value}>{lang.label}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                                    {languageSaving ? (
                                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <ChevronDown size={16} />
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-3 flex items-center gap-1.5">
                                <Sparkles size={10} className="text-purple-500" />
                                All chats will respond in your selected language.
                            </p>
                        </div>
                    </div>

                    {/* ── Account Details ── */}
                    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800/50 rounded-2xl p-6 shadow-lg hover:border-purple-500/20 transition-all duration-300">
                        <div className="flex items-start gap-4 mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-900/30 flex items-center justify-center border border-purple-500/20 flex-shrink-0">
                                <Activity size={22} className="text-purple-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Account Details</h3>
                                <p className="text-gray-500 text-xs">Your account information</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-800/50 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">User ID</span>
                                <span className="text-gray-500 text-xs font-mono bg-gray-800/50 px-3 py-1 rounded-lg truncate max-w-[180px]" title={user.id}>
                                    {user.id.substring(0, 12)}...
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Email</span>
                                <span className="text-white text-sm font-medium truncate max-w-[200px]">{user.email}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Joined</span>
                                <span className="text-white text-sm font-medium">{memberSince}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400 text-sm">Current Language</span>
                                <span className="text-white text-sm font-medium bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg">{user.language}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════ DANGER ZONE ══════════════════════ */}
                <div className="bg-red-950/10 border border-red-900/30 rounded-3xl p-6 mt-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 flex-shrink-0">
                                <AlertTriangle size={22} className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Danger Zone</h3>
                                <p className="text-gray-500 text-xs">Permanently delete your account and all associated data.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="px-5 py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white font-bold text-sm transition-all border border-red-500/30 w-full sm:w-auto"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════ LEGAL / POLICIES ══════════════════════ */}
                <div className="bg-gray-900/40 border border-gray-800/80 rounded-3xl p-6 relative overflow-hidden group hover:border-purple-500/20 transition-all duration-300 mt-6">
                    <div className="flex items-center gap-4 text-gray-500 mb-6">
                        <Shield size={20} className="text-purple-400/80" />
                        <div>
                            <h3 className="text-white font-bold text-sm">Terms and Policies of Usage</h3>
                            <p className="text-gray-500 text-xs mt-1">Please read our community guidelines, NSFW usage policies, and privacy policies.</p>
                        </div>
                    </div>

                    <div className="space-y-8 text-gray-300 text-sm leading-loose bg-gray-950/50 p-6 rounded-2xl border border-gray-800">
                        {/* Privacy Policy */}
                        <div>
                            <h2 className="text-2xl font-black text-white mb-2">Privacy Policy</h2>
                            <p className="text-gray-500 mb-4"><strong>Last Updated:</strong> March 21, 2026 | <strong>Website:</strong> DreamAI Studios</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">1. Our "No-Sale" Commitment</h3>
                            <p className="mb-4">At DreamAI Studios, we believe your private life should stay private. <strong>We do not sell, rent, or trade your personal information, chat histories, or generated images to third parties.</strong> Your data is used exclusively to provide and improve your experience within our ecosystem.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">2. Information We Collect</h3>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li><strong>Account Data:</strong> Email address and login credentials (stored securely via Supabase Auth).</li>
                                <li><strong>User-Generated Content:</strong> Chat logs, image prompts, and saved character settings.</li>
                                <li><strong>Technical Data:</strong> IP addresses and device identifiers to prevent fraud and ensure stability.</li>
                                <li><strong>Payment Data:</strong> We use third-party processors (like Stripe). We do not store your full credit card details on our servers.</li>
                            </ul>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">3. AI-Specific Disclosures</h3>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li><strong>Non-Human Interaction:</strong> All characters on DreamAI Studios are AI entities, not human beings.</li>
                                <li><strong>Third-Party Processing:</strong> We transmit anonymized data to specialized providers (e.g., OpenRouter, Fal.ai, Cartesia) to generate responses. They are contractually barred from using your data to train their models.</li>
                                <li><strong>No Model Training:</strong> We do not use your private conversations to train our base AI models.</li>
                            </ul>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">4. Data Security &amp; Storage</h3>
                            <p className="mb-4">We utilize <strong>Supabase</strong> with <strong>Row-Level Security (RLS)</strong> and <strong>AES-256 encryption</strong>. This technical architecture ensures that your private data is isolated and accessible only by your authenticated account.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">5. Your Right to be Forgotten (Instant Deletion)</h3>
                            <p className="mb-2">We provide you with absolute control over your digital footprint. Unlike many platforms that "archive" or "deactivate" data, DreamAI Studios offers a <strong>Permanent Delete</strong> feature:</p>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li><strong>One-Click Wipe:</strong> You may trigger an instant deletion via your Account Settings.</li>
                                <li><strong>Immediate Effect:</strong> Clicking the delete button initiates a "Cascade Delete" in our Supabase database, instantly removing your profile, chat history, image gallery, and voice data from our live systems.</li>
                                <li><strong>Irreversibility:</strong> Once triggered, this process is permanent and cannot be undone.</li>
                            </ul>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">6. Safety &amp; Age Restrictions</h3>
                            <ul className="list-disc pl-5 space-y-2 mb-4">
                                <li><strong>18+ Only:</strong> DreamAI Studios is strictly for users 18 years of age or older.</li>
                                <li><strong>Self-Harm Protocol:</strong> In compliance with the 2026 AI Companion Safety Act, our systems are programmed to provide crisis resource referrals if self-harm ideation is detected.</li>
                            </ul>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">7. Contact Us</h3>
                            <p className="mb-4">For privacy inquiries, please contact: <strong>dreamaistudio02@gmail.com</strong></p>
                        </div>

                        <div className="w-full h-px bg-gray-800 my-8"></div>

                        {/* Terms of Service */}
                        <div>
                            <h2 className="text-2xl font-black text-white mb-4">Terms of Service and Acceptable Use Policy</h2>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">1. Acceptance of Terms and Age Restriction</h3>
                            <p className="mb-4">By accessing or using this website, you explicitly agree to these Terms of Service. This platform contains Not Safe For Work (NSFW) content and adult themes. You must be at least 18 years of age, or the age of legal majority in your jurisdiction, to create an account and access this content. By clicking "I am 18 or older and Agree to the Terms," you legally verify your age. If you are under 18, you must exit this site immediately.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">2. Nature of the Service</h3>
                            <p className="mb-4">This platform provides an AI-driven text and image generation service designed for fictional roleplay, fantasy discussion, and digital companionship. All characters, scenarios, and entities generated or interacted with are entirely fictional. The developers do not endorse, support, or encourage any real-world actions based on conversations or scenarios explored within this platform.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">3. Zero-Tolerance Policy on Prohibited Content</h3>
                            <p className="mb-2">While this platform allows for mature, adult-themed roleplay, there are strict, non-negotiable limits to what may be generated or discussed. Any attempt to generate, prompt, or simulate the following will result in immediate, permanent account termination and, where applicable, reporting to relevant law enforcement authorities:</p>
                            <ul className="list-disc pl-5 space-y-2 mb-4 text-gray-400">
                                <li><strong className="text-red-400">Minors:</strong> Any depiction, mention, or implication of sexual or romantic acts involving minors, or characters portrayed as minors.</li>
                                <li><strong className="text-red-400">Non-Consensual Acts:</strong> Content depicting or promoting rape, non-consensual sexual abuse, or forced exploitation.</li>
                                <li><strong className="text-red-400">Heinous and Illegal Acts:</strong> Prompts involving bestiality, necrophilia, severe real-world violence, terrorism, or the promotion of harm against real individuals or groups.</li>
                                <li><strong className="text-red-400">Illegal Material:</strong> The sharing or generation of any material that violates federal or international laws.</li>
                            </ul>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">4. Limitation of Liability for User Content</h3>
                            <p className="mb-4">The AI models utilized on this platform are generative and respond directly to user inputs (prompts). The development team does not pre-screen every output and is not responsible or liable for the specific scenarios, texts, or images generated by users. You, the user, bear sole responsibility for the prompts you submit and the resulting content. The team disclaims any liability for distress, offense, or damages arising from user-generated interactions.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">5. AI Unpredictability</h3>
                            <p className="mb-4">Because artificial intelligence is inherently unpredictable, it may occasionally produce outputs that are inaccurate, unexpected, or unaligned with user intent. The platform is provided "as is," and the developers are not liable for the spontaneous generation of offensive or erroneous material.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">6. Account Suspension and Termination</h3>
                            <p className="mb-4">We reserve the right to monitor account activity through automated safety filters and human review if flagged. We reserve the right to suspend or terminate any account, at any time, without notice or refund, for violating these Terms of Service or attempting to bypass our safety protocols.</p>

                            <h3 className="text-white font-bold text-base mt-4 mb-2">7. Sole User Liability and Indemnification</h3>
                            <p className="mb-2">By clicking "Enter" or otherwise accessing this platform, you explicitly acknowledge and agree that your use of this service is at your own risk. You are solely and entirely responsible for your actions, the prompts you submit, and the content you generate.</p>
                            <p className="mb-2">In the event that a user attempts to generate, engages in, or utilizes this platform to facilitate any illegal, criminal, or prohibited act—in direct violation of our policies—the user bears 100% of the legal, civil, and criminal liability. The developers, creators, hosting providers, and the broader community behind this platform explicitly disclaim all responsibility and liability for any such illicit user behavior, whether successfully executed or merely attempted.</p>
                            <p className="mb-4">You agree to indemnify, defend, and hold harmless the development team and its affiliates from any claims, damages, liabilities, costs, or expenses (including legal fees) arising out of your violation of these Terms or your engagement in any unlawful conduct using this service.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════ CONFIRM MODAL (Moved Outside Transform) ═════════════════════════ */}
            {
                showConfirmModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" onClick={() => setShowConfirmModal(false)} />
                        <div className="relative w-full max-w-sm bg-gray-900/95 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-7 shadow-2xl shadow-purple-500/20 text-center animate-in">
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-yellow-500/10">
                                <AlertTriangle size={28} className="text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-extrabold text-white mb-2">Change Username?</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                Change your username to{' '}
                                <span className="text-white font-bold bg-gray-800 px-2.5 py-1 rounded-lg">@{newUsername}</span>?
                                <br />
                                <span className="text-yellow-400/80 text-xs mt-2 inline-block">
                                    {remainingUpdates - 1} change{remainingUpdates - 1 !== 1 ? 's' : ''} remaining this week
                                </span>
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={commitUsernameSave}
                                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-500/30 transition-all active:scale-95"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════ DELETE ACCOUNT MODAL (Moved Outside Transform) ═════════════════════════ */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isDeleting && setShowDeleteModal(false)} />
                        <div className="relative w-full max-w-md bg-gray-950 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-200">
                            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                                <AlertTriangle className="text-red-500" size={32} />
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">Delete Account</h2>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                                This action is permanent and cannot be undone. All your characters, chats, and data will be permanently erased from our servers in accordance with our Privacy Policy.
                            </p>

                            <div className="mb-8">
                                <label className="block text-gray-500 text-xs font-semibold mb-2 uppercase tracking-wide">Why are you leaving? (Optional)</label>
                                <textarea
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder="We're sad to see you go... Tell us how we can improve if you'd like."
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none h-24 placeholder:text-gray-700 custom-scrollbar"
                                    disabled={isDeleting}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleDeleteAccount}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        "Permanently Delete Account"
                                    )}
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="w-full py-3.5 rounded-xl bg-gray-900 text-gray-400 font-semibold hover:bg-gray-800 hover:text-white transition-all disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════ CSS ANIMATIONS ════════════════════════ */}
            <style>{`
            @keyframes gradient-shift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            .animate-gradient-shift {
                background-size: 200% 200%;
                animation: gradient-shift 8s ease infinite;
            }
            .animate-in {
                animation: slideIn 0.3s ease-out;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateY(8px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
        `}</style>
        </>
    );
}