import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Edit2, Check, X, LogOut, Lock, AlertTriangle, Globe, MessageSquare, Users, Calendar, Shield, ChevronDown, ChevronRight, Sparkles, Star, Zap, User } from 'lucide-react';
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
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration]);
    return count;
}

// ── Language options matching the header's LANGUAGES array ─────────
const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', label: '日本語', flag: '🇯🇵' },
    { code: 'ko', label: '한국어', flag: '🇰🇷' },
    { code: 'pt', label: 'Português', flag: '🇧🇷' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'zh', label: '中文', flag: '🇨🇳' },
    { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const GENDER_OPTIONS = [
    { value: 'male', label: 'Male', icon: '♂' },
    { value: 'female', label: 'Female', icon: '♀' },
    { value: 'custom', label: 'Custom', icon: '⚧' },
];

// ── Main ProfileView ────────────────────────────────────────────────
export default function ProfileView({ onLogout, refreshKey = 0, onReadTerms, onForceLogout, onGuard, coinBalance, selectedLang, setSelectedLang }) {
    const [user, setUser] = useState(null);
    const [isEditingUsername, setIsEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Delete Account states
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteReason, setDeleteReason] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Gender
    const [gender, setGender] = useState(() => localStorage.getItem('dreamai_gender') || '');
    const [showGenderPicker, setShowGenderPicker] = useState(false);

    // Language dropdown
    const [showLangPicker, setShowLangPicker] = useState(false);

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

    // ── Fetch stats from Supabase ────────────────────────────────────
    const fetchStats = useCallback(async (userId) => {
        if (!userId) return;
        setStatsLoading(true);
        try {
            const { count: charCount } = await supabase
                .from('characters')
                .select('*', { count: 'exact', head: true })
                .eq('uuid', userId);
            if (charCount !== null) setCharacterCount(charCount);

            // Count chat SESSIONS (not messages)
            const { count: sessCount } = await supabase
                .from('chats')
                .select('*', { count: 'exact', head: true })
                .eq('user_uuid', userId);
            if (sessCount !== null) setChatCount(sessCount);

            const [{ count: fCount }, { count: ingCount }] = await Promise.all([
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_uuid', userId),
                supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_uuid', userId),
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
                const { data: dbUser } = await supabase
                    .from('users')
                    .select('is_premium')
                    .eq('uuid', session.user.id)
                    .single();
                setUser({
                    id: session.user.id,
                    email: session.user.email,
                    username: dbUser?.username || 'Anonymous',
                    avatarUrl: metadata.avatar_url || null,
                    createdAt: session.user.created_at,
                    usernameUpdates: metadata.username_updates || [],
                    language: metadata.language || 'English',
                    isPremium: dbUser?.is_premium ?? false
                });
                setNewUsername(dbUser?.username || '');
                fetchStats(session.user.id);
            }
            setLoading(false);
        };
        fetchUser();
    }, [fetchStats]);

    useEffect(() => {
        if (user?.id && refreshKey > 0) fetchStats(user.id);
    }, [refreshKey, user?.id, fetchStats]);

    // ── Username validation ─────────────────────────────────────────
    const handlePreSaveValidation = () => {
        setUsernameError('');
        setSuccessMessage('');
        if (newUsername.trim() === user.username) { setIsEditingUsername(false); return; }
        if (newUsername.length < 3) { setUsernameError('Username must be at least 3 characters.'); return; }
        const violation = checkContentSafe(newUsername);
        if (violation) { onGuard(violation); return; }
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const validUpdates = (user.usernameUpdates || []).filter(ts => new Date(ts) > oneWeekAgo);
        if (validUpdates.length >= 2) { setUsernameError('You can only change your username twice a week.'); return; }
        setShowConfirmModal(true);
    };

    const commitUsernameSave = async () => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        let validUpdates = (user.usernameUpdates || []).filter(ts => new Date(ts) > oneWeekAgo);
        validUpdates.push(now.toISOString());
        const cleanUsername = newUsername.replace(/\s+/g, '');
        try {
            const { data: existingUsers } = await supabase.from('users').select('uuid').ilike('username', cleanUsername).neq('uuid', user.id).limit(1);
            if (existingUsers && existingUsers.length > 0) { setUsernameError('This username is already taken.'); setShowConfirmModal(false); return; }
            const { error: authErr } = await supabase.auth.updateUser({ data: { username: cleanUsername, username_updates: validUpdates } });
            if (authErr) throw authErr;
            const { data: updatedUser, error: usersErr } = await supabase.from('users').update({ username: cleanUsername }).eq('uuid', user.id).select('uuid');
            if (usersErr) throw new Error('Failed to update username: ' + usersErr.message);
            if (!updatedUser || updatedUser.length === 0) throw new Error('Username update did not match any row.');
            await supabase.from('characters').update({ username: cleanUsername }).eq('uuid', user.id).select('id');
            setUser(prev => ({ ...prev, username: cleanUsername, usernameUpdates: validUpdates }));
            setSuccessMessage('Username updated!');
            setIsEditingUsername(false);
            setShowConfirmModal(false);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            setUsernameError(err.message || 'Failed to update username.');
            setShowConfirmModal(false);
        }
    };

    // ── Avatar upload ───────────────────────────────────────────────
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { setUsernameError('Image too large. Max 2 MB.'); return; }
        setAvatarUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const { error } = await supabase.auth.updateUser({ data: { avatar_url: reader.result } });
                if (error) throw error;
                setUser(prev => ({ ...prev, avatarUrl: reader.result }));
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

    // ── Gender ──────────────────────────────────────────────────────
    const handleGenderSelect = async (val) => {
        setGender(val);
        localStorage.setItem('dreamai_gender', val);
        setShowGenderPicker(false);
        try {
            await supabase.auth.updateUser({ data: { gender: val } });
            setSuccessMessage('Gender updated!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Gender save error:', err);
        }
    };

    // ── Language (syncs with header) ────────────────────────────────
    const handleLanguageSelect = (langCode) => {
        if (setSelectedLang) setSelectedLang(langCode);
        setShowLangPicker(false);
    };

    // ── Delete Account ──────────────────────────────────────────────
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
            if (deleteReason.trim()) {
                await supabase.from('feedback').insert({ user_id: user.id, message: `ACCOUNT DELETION. Reason: ${deleteReason}` });
            }
            await supabase.from('users').update({ is_deleted: true, coin_balance: 0, username: `banned_user_${user.id.substring(0, 6)}`, is_premium: false, avatar_url: null }).eq('uuid', user.id);
            await supabase.from('profiles').delete().eq('id', user.id);
            const { error: rpcError } = await supabase.rpc('delete_user');
            if (rpcError) throw new Error(rpcError.message);
            await supabase.auth.signOut();
            await new Promise(r => setTimeout(r, 800));
            if (onForceLogout) onForceLogout(); else onLogout();
        } catch (err) {
            console.error("Deletion Failed:", err);
            setUsernameError("Deletion Failed: " + (err.message || 'Unknown error'));
            setIsDeleting(false);
            setShowDeleteModal(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────
    const memberSince = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : '';
    const daysSinceJoin = user?.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    const validUpdates = (user?.usernameUpdates || []).filter(ts => new Date(ts) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const remainingUpdates = 2 - validUpdates.length;
    const initials = (user?.username || 'U').slice(0, 2).toUpperCase();
    const currentLang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];
    const selectedGender = GENDER_OPTIONS.find(g => g.value === gender);

    // ── Full-screen Delete Loading ──────────────────────────────────
    if (isDeleting) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-6 animate-in zoom-in-95 duration-500">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <h1 className="text-3xl font-black text-red-500 animate-pulse tracking-wide text-center uppercase">
                        Account Deletion<br />In Progress...
                    </h1>
                    <p className="text-red-400/80 text-sm font-bold uppercase tracking-[0.2em]">Erasing all data permanently</p>
                </div>
            </div>
        );
    }

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
                <p className="text-gray-400 max-w-xs">Please log in to view your profile.</p>
            </div>
        );
    }

    // ── Reusable row component ──────────────────────────────────────
    const SettingRow = ({ icon: Icon, iconColor = 'text-gray-400', label, value, onClick, rightContent, last = false }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-white/[0.02] active:bg-white/[0.04] ${!last ? 'border-b border-gray-800/50' : ''}`}
        >
            <Icon size={18} className={`${iconColor} flex-shrink-0`} />
            <span className="flex-1 text-sm text-gray-300 font-medium">{label}</span>
            {rightContent || (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{value}</span>
                    <ChevronRight size={16} className="text-gray-700" />
                </div>
            )}
        </button>
    );

    return (
        <>
            <div className={`max-w-lg lg:max-w-5xl mx-auto px-4 py-8 lg:py-12 w-full h-full overflow-y-auto transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                {/* ═══ DESKTOP TWO-COLUMN GRID ═══ */}
                <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-10">

                    {/* ━━━ LEFT COLUMN: Profile Card (desktop) ━━━ */}
                    <div className="lg:sticky lg:top-8 lg:self-start lg:bg-gray-900/40 lg:border lg:border-gray-800/60 lg:rounded-3xl lg:p-8 lg:backdrop-blur-sm">

                        {/* ═══ PROFILE HEADER ═══ */}
                        <div className="flex flex-col items-center mb-10 lg:mb-6">
                            {/* Avatar */}
                            <div className="relative group/avatar cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-br from-purple-500 to-pink-500 shadow-xl shadow-purple-500/20">
                                    <div className="w-full h-full rounded-full bg-gray-950 p-0.5 overflow-hidden">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                                                <span className="text-2xl font-bold text-white">{initials}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-[3px] rounded-full bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity duration-200 flex-col gap-0.5">
                                        {avatarUploading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Camera size={18} className="text-white" />
                                                <span className="text-[9px] text-white/80 font-bold uppercase tracking-widest">Edit</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-[3px] border-gray-950 z-10" />
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" />
                            </div>

                            {/* Username */}
                            {isEditingUsername ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ''))}
                                        className="bg-gray-900 border border-purple-500/50 rounded-xl px-4 py-2 text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 w-48 text-center"
                                        autoFocus
                                        maxLength={24}
                                    />
                                    <button onClick={handlePreSaveValidation} className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors active:scale-95"><Check size={16} /></button>
                                    <button onClick={() => { setIsEditingUsername(false); setNewUsername(user.username); setUsernameError(''); }} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors active:scale-95"><X size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-xl font-bold text-white">@{user.username}</h1>
                                    {user.isPremium && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-400">
                                            <Star size={10} className="fill-amber-400" /> PRO
                                        </span>
                                    )}
                                    <button onClick={() => setIsEditingUsername(true)} className="p-1.5 text-gray-600 hover:text-purple-400 transition-colors active:scale-95">
                                        <Edit2 size={14} />
                                    </button>
                                </div>
                            )}

                            <p className="text-gray-500 text-sm mb-4">{user.email}</p>

                            {/* Stats row */}
                            <div className="flex items-center gap-6 text-center">
                                {[
                                    { label: 'Followers', val: animatedFollowers },
                                    { label: 'Following', val: animatedFollowing },
                                    { label: 'Characters', val: animatedCharacters },
                                    { label: 'Chats', val: animatedChats },
                                ].map((s, i) => (
                                    <div key={s.label} className="flex flex-col items-center">
                                        {statsLoading ? (
                                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-0.5" />
                                        ) : (
                                            <span className="text-lg font-bold text-white tabular-nums">{s.val}</span>
                                        )}
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{s.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Member since */}
                            <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-600">
                                <Calendar size={11} />
                                <span>Joined {memberSince} · {daysSinceJoin}d</span>
                            </div>

                            {/* Toast messages */}
                            {usernameError && (
                                <div className="mt-3 flex items-center gap-2 text-red-400 text-xs font-medium bg-red-400/10 border border-red-500/20 px-4 py-2 rounded-xl">
                                    <AlertTriangle size={14} /> {usernameError}
                                </div>
                            )}
                            {successMessage && (
                                <div className="mt-3 flex items-center gap-2 text-green-400 text-xs font-medium bg-green-400/10 border border-green-500/20 px-4 py-2 rounded-xl">
                                    <Sparkles size={14} /> {successMessage}
                                </div>
                            )}
                        </div>

                        {/* ═══ LEGAL (desktop: inside left column) ═══ */}
                        <div className="hidden lg:block mb-4">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-1">Legal</p>
                            <div className="space-y-4 text-gray-400 text-sm leading-relaxed px-1">
                                <div>
                                    <h2 className="text-base font-bold text-white mb-1.5">Privacy Policy</h2>
                                    <p className="text-gray-600 text-xs mb-2"><strong>Last Updated:</strong> March 21, 2026</p>
                                    <div className="space-y-2 text-xs leading-relaxed text-gray-500">
                                        <p><strong className="text-gray-400">No-Sale Commitment:</strong> We do not sell your personal information.</p>
                                        <p><strong className="text-gray-400">Security:</strong> Supabase with RLS and AES-256 encryption.</p>
                                        <p><strong className="text-gray-400">Contact:</strong> dreamaistudio02@gmail.com</p>
                                    </div>
                                </div>
                                <div className="h-px bg-gray-800/50" />
                                <div>
                                    <h2 className="text-base font-bold text-white mb-1.5">Terms of Service</h2>
                                    <div className="space-y-2 text-xs leading-relaxed text-gray-500">
                                        <p><strong className="text-gray-400">Service:</strong> AI-driven text/image generation for fictional roleplay.</p>
                                        <p><strong className="text-gray-400">Age Restriction:</strong> 18+ only.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>{/* end left column */}

                    {/* ━━━ RIGHT COLUMN: Settings & Account (desktop) ━━━ */}
                    <div>

                        {/* ═══ SETTINGS LIST ═══ */}
                        <div className="mb-8">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-1">Settings</p>

                            {/* Language */}
                            <div className="relative">
                                <SettingRow
                                    icon={Globe}
                                    iconColor="text-blue-400"
                                    label="Language"
                                    onClick={() => { setShowLangPicker(v => !v); setShowGenderPicker(false); }}
                                    rightContent={
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{currentLang.flag}</span>
                                            <span className="text-sm text-gray-400">{currentLang.label}</span>
                                            <ChevronDown size={14} className={`text-gray-600 transition-transform ${showLangPicker ? 'rotate-180' : ''}`} />
                                        </div>
                                    }
                                />
                                {showLangPicker && (
                                    <div className="bg-gray-900/95 border border-gray-800 rounded-xl mt-1 mb-2 overflow-hidden" style={{ animation: 'slideIn 0.15s ease-out' }}>
                                        {LANGUAGES.map(lang => (
                                            <button
                                                key={lang.code}
                                                onClick={() => handleLanguageSelect(lang.code)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${selectedLang === lang.code ? 'bg-purple-500/10 text-purple-300' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                                            >
                                                <span className="text-base">{lang.flag}</span>
                                                <span className="flex-1 text-left font-medium">{lang.label}</span>
                                                {selectedLang === lang.code && <Check size={14} className="text-purple-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Gender */}
                            <div className="relative">
                                <SettingRow
                                    icon={User}
                                    iconColor="text-pink-400"
                                    label="Gender"
                                    onClick={() => { setShowGenderPicker(v => !v); setShowLangPicker(false); }}
                                    rightContent={
                                        <div className="flex items-center gap-2">
                                            {selectedGender ? (
                                                <>
                                                    <span className="text-sm">{selectedGender.icon}</span>
                                                    <span className="text-sm text-gray-400">{selectedGender.label}</span>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-600">Not set</span>
                                            )}
                                            <ChevronDown size={14} className={`text-gray-600 transition-transform ${showGenderPicker ? 'rotate-180' : ''}`} />
                                        </div>
                                    }
                                />
                                {showGenderPicker && (
                                    <div className="bg-gray-900/95 border border-gray-800 rounded-xl mt-1 mb-2 overflow-hidden" style={{ animation: 'slideIn 0.15s ease-out' }}>
                                        {GENDER_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleGenderSelect(opt.value)}
                                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${gender === opt.value ? 'bg-pink-500/10 text-pink-300' : 'text-gray-300 hover:bg-white/[0.03]'}`}
                                            >
                                                <span className="text-base">{opt.icon}</span>
                                                <span className="flex-1 text-left font-medium">{opt.label}</span>
                                                {gender === opt.value && <Check size={14} className="text-pink-400" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Bolt Tokens */}
                            <SettingRow
                                icon={Zap}
                                iconColor="text-purple-400"
                                label="Bolt Tokens"
                                onClick={() => { }}
                                rightContent={
                                    <span className="flex items-center gap-1.5 text-sm font-bold text-purple-400">
                                        <Zap size={13} className="fill-purple-400/50" />
                                        {coinBalance === Infinity ? '∞ Premium' : coinBalance}
                                    </span>
                                }
                            />

                            {/* Username changes */}
                            <SettingRow
                                icon={Edit2}
                                iconColor="text-gray-500"
                                label="Username changes left"
                                onClick={() => { }}
                                rightContent={
                                    <span className="text-sm text-gray-500">{remainingUpdates}/2 this week</span>
                                }
                                last
                            />
                        </div>

                        {/* ═══ ACCOUNT INFO ═══ */}
                        <div className="mb-8">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-1">Account</p>

                            <div className="flex items-center gap-4 px-1 py-4 border-b border-gray-800/50">
                                <span className="text-sm text-gray-500 flex-shrink-0">Email</span>
                                <span className="text-sm text-white font-medium truncate ml-auto">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-4 px-1 py-4 border-b border-gray-800/50">
                                <span className="text-sm text-gray-500 flex-shrink-0">User ID</span>
                                <span className="text-xs text-gray-600 font-mono ml-auto truncate max-w-[180px]">{user.id.substring(0, 16)}...</span>
                            </div>
                            <div className="flex items-center gap-4 px-1 py-4">
                                <span className="text-sm text-gray-500 flex-shrink-0">Joined</span>
                                <span className="text-sm text-gray-400 ml-auto">{memberSince}</span>
                            </div>
                        </div>

                        {/* ═══ LOGOUT ═══ */}
                        <button
                            onClick={onLogout}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-red-400 font-semibold text-sm hover:bg-red-500/5 transition-colors active:scale-[0.98] mb-3"
                        >
                            <LogOut size={16} />
                            Log Out
                        </button>

                        {/* ═══ DANGER ZONE ═══ */}
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-gray-600 font-medium text-xs hover:text-red-400 hover:bg-red-500/5 transition-colors active:scale-[0.98] mb-8"
                        >
                            <AlertTriangle size={13} />
                            Delete Account
                        </button>

                        {/* ═══ LEGAL (mobile only — desktop version is in left column) ═══ */}
                        <div className="mb-8 lg:hidden">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-2 px-1">Legal</p>
                            <div className="space-y-6 text-gray-400 text-sm leading-relaxed px-1">
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-2">Privacy Policy</h2>
                                    <p className="text-gray-600 text-xs mb-3"><strong>Last Updated:</strong> March 21, 2026</p>
                                    <div className="space-y-3 text-xs leading-relaxed text-gray-500">
                                        <p><strong className="text-gray-400">No-Sale Commitment:</strong> We do not sell, rent, or trade your personal information, chat histories, or generated images to third parties.</p>
                                        <p><strong className="text-gray-400">Data Collected:</strong> Email, chat logs, IP addresses, and device identifiers. Payment is processed via third parties (Stripe).</p>
                                        <p><strong className="text-gray-400">AI Disclosures:</strong> All characters are AI entities. Anonymous data is transmitted to providers (OpenRouter, Fal.ai) who cannot use it for training.</p>
                                        <p><strong className="text-gray-400">Security:</strong> Supabase with Row-Level Security and AES-256 encryption.</p>
                                        <p><strong className="text-gray-400">Right to be Forgotten:</strong> One-click permanent deletion via Account Settings. Irreversible.</p>
                                        <p><strong className="text-gray-400">Age Restriction:</strong> 18+ only. Crisis resource referrals for self-harm detection per 2026 AI Companion Safety Act.</p>
                                        <p><strong className="text-gray-400">Contact:</strong> dreamaistudio02@gmail.com</p>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-800/50" />

                                <div>
                                    <h2 className="text-lg font-bold text-white mb-2">Terms of Service</h2>
                                    <div className="space-y-3 text-xs leading-relaxed text-gray-500">
                                        <p><strong className="text-gray-400">Acceptance:</strong> By using this site you agree to these terms. 18+ only. NSFW content present.</p>
                                        <p><strong className="text-gray-400">Service:</strong> AI-driven text/image generation for fictional roleplay. All entities are fictional.</p>
                                        <p><strong className="text-gray-400">Prohibited Content:</strong> Any depiction of minors, non-consensual acts, bestiality, necrophilia, terrorism, or illegal material results in immediate permanent ban and potential law enforcement reporting.</p>
                                        <p><strong className="text-gray-400">Liability:</strong> You bear sole responsibility for your prompts and generated content. AI is unpredictable and may produce unexpected outputs.</p>
                                        <p><strong className="text-gray-400">Suspension:</strong> We may suspend or terminate any account without notice for violations.</p>
                                        <p><strong className="text-gray-400">Indemnification:</strong> You agree to indemnify and hold harmless the development team from any claims arising out of your use of this service.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>{/* end right column */}
                </div>{/* end two-column grid */}
            </div>

            {/* ═══ CONFIRM USERNAME MODAL ═══ */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" onClick={() => setShowConfirmModal(false)} />
                    <div className="relative w-full max-w-sm bg-gray-900/95 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-7 shadow-2xl text-center" style={{ animation: 'slideIn 0.2s ease-out' }}>
                        <div className="w-14 h-14 mx-auto bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mb-5">
                            <AlertTriangle size={24} className="text-yellow-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Change Username?</h3>
                        <p className="text-gray-400 text-sm mb-5 leading-relaxed">
                            Change to <span className="text-white font-semibold bg-gray-800 px-2 py-0.5 rounded-lg">@{newUsername}</span>?
                            <br />
                            <span className="text-yellow-400/80 text-xs mt-1 inline-block">{remainingUpdates - 1} change{remainingUpdates - 1 !== 1 ? 's' : ''} left this week</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition-colors active:scale-95">Cancel</button>
                            <button onClick={commitUsernameSave} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ DELETE ACCOUNT MODAL ═══ */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isDeleting && setShowDeleteModal(false)} />
                    <div className="relative w-full max-w-md bg-gray-950 border border-red-500/30 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)]" style={{ animation: 'slideIn 0.2s ease-out' }}>
                        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20">
                            <AlertTriangle className="text-red-500" size={28} />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Delete Account</h2>
                        <p className="text-gray-400 text-sm mb-5 leading-relaxed">This is permanent. All data will be erased.</p>
                        <div className="mb-6">
                            <label className="block text-gray-600 text-xs font-medium mb-2">Why are you leaving? (Optional)</label>
                            <textarea
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Tell us how we can improve..."
                                className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-red-500/50 resize-none h-20 placeholder:text-gray-700"
                                disabled={isDeleting}
                            />
                        </div>
                        <div className="flex flex-col gap-2.5">
                            <button onClick={handleDeleteAccount} disabled={isDeleting} className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-colors active:scale-95 flex justify-center items-center gap-2 disabled:opacity-50">
                                {isDeleting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Permanently Delete"}
                            </button>
                            <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="w-full py-3 rounded-xl bg-gray-900 text-gray-400 font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CSS ═══ */}
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-in {
                    animation: slideIn 0.3s ease-out;
                }
            `}</style>
        </>
    );
}