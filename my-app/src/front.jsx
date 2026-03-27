import React, { useState, useRef, useEffect } from "react";
import AuthModal from "./AuthModal";
import NavButton from "./NavButton";
import CharacterCard from "./CharacterCard";
import CreateView from "./CreateView";
import ChatView from "./ChatView";
import MyAIView from "./MyAIView";
import ProfileView from "./ProfileView";
import CreatorProfileView from "./CreatorProfileView";
import GenerateView from "./GenerateView";
import UpgradeModal from "./UpgradeModal";
import GroupChatCreateView from "./GroupChatCreateView";
import AgeGateModal from "./AgeGateModal";
import GuardModal from "./GuardModal";
import CookieBanner from "./CookieBanner";
import { checkContentSafe } from "./guard";
import { supabase } from "./supabaseClient";
import {
  Plus,
  Compass,
  MessageCircle,
  Camera,
  Sparkles,
  Play,
  Users,
  Crown,
  User,
  HelpCircle,
  MoreHorizontal,
  Search,
  Heart,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Zap,
  Star,
  TrendingUp,
  Filter,
  LogOut,
  BadgeCheck,
  UserPlus,
  Phone,
  Shield,
  Sun,
  Moon
} from "lucide-react";

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

// ── Normalize any character object (raw Supabase row or formatted card)
// into the shape ChatView expects: .image .desc .tags[] .name .age .creator
function normalizeCharacter(char) {
  if (!char) return null;

  // Parse tags from any format Supabase/Postgres might return
  let tags = [];
  if (Array.isArray(char.tags)) {
    tags = char.tags;
  } else if (typeof char.tags === 'string') {
    try {
      const t = char.tags.trim();
      if (t.startsWith('{')) {
        // PostgreSQL array literal: {female,realistic,slim}
        tags = t.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      } else if (t.startsWith('[')) {
        tags = JSON.parse(t);
      } else if (t.length > 0) {
        tags = t.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch { tags = []; }
  }

  const FALLBACK_IMG = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=800';
  const finalImage = extractFirstImage(char.image) || extractFirstImage(char.images) || FALLBACK_IMG;
  return {
    ...char,
    image: finalImage,
    desc: char.public_description || char.desc || char.persona || '',
    public_description: char.public_description || null,
    tags,
    name: char.name || 'Unknown',
    age: char.age || '?',
    creator: char.creator || (char.username ? `@${char.username}` : '@unknown'),
    likes: char.likes ?? 0,
    msgs: char.msgs ?? 0,
  };
}

// 1. Added High-Quality Image URLs to the data
const fallbackCharacters = [
  { id: 1, name: "Elena Noir", age: 23, desc: "A mysterious artist who speaks in riddles and paints your deepest emotions...", likes: "2.1k", msgs: "891.3k", creator: "@shadowcraft", tags: ["Creative", "Mystery"], image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 2, name: "Kai Tanaka", age: 25, desc: "Your witty lab partner who always has a sarcastic comeback and a hidden soft side...", likes: "1.8k", msgs: "756.2k", creator: "@neonminds", tags: ["Witty", "Smart"], image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 3, name: "Nova Sterling", age: 21, desc: "A rising pop star navigating fame while trying to stay grounded and real...", likes: "3.2k", msgs: "1.2M", creator: "@stardust_ai", tags: ["Famous", "Music"], image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 4, name: "Dante Rossi", age: 28, desc: "A charming Italian chef who believes the way to the heart is through the stomach...", likes: "1.5k", msgs: "623.8k", creator: "@pixeldreams", tags: ["Romantic", "Chef"], image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 5, name: "Aria Chen", age: 22, desc: "A brilliant hacker with a rebellious streak and a heart of gold beneath the code...", likes: "2.7k", msgs: "945.1k", creator: "@cyberweave", tags: ["Tech", "Rebel"], image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 6, name: "Zephyr Moon", age: 20, desc: "An ethereal dream guide who walks between worlds and whispers cosmic secrets...", likes: "1.9k", msgs: "812.4k", creator: "@dreamforge", tags: ["Fantasy", "Mystic"], image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 7, name: "Rex Valor", age: 30, desc: "A battle-hardened warrior with a poetic soul, seeking peace after years of conflict...", likes: "2.4k", msgs: "1.1M", creator: "@ironquill", tags: ["Action", "Deep"], image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 8, name: "Luna Frost", age: 24, desc: "A cold exterior hides a warm heart — she's the ice queen who secretly writes love letters...", likes: "3.8k", msgs: "1.5M", creator: "@frostbyte", tags: ["Tsundere", "Romance"], image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 9, name: "Mika Sato", age: 19, desc: "An energetic anime enthusiast who turns everyday life into an epic adventure arc...", likes: "2.0k", msgs: "700.5k", creator: "@animepulse", tags: ["Anime", "Fun"], image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 10, name: "Orion Blake", age: 27, desc: "A mysterious detective who always seems to know more than he lets on...", likes: "1.6k", msgs: "580.9k", creator: "@noirfiles", tags: ["Detective", "Mystery"], image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 11, name: "Sage Winters", age: 26, desc: "A gentle therapist AI who listens without judgment and helps you find clarity...", likes: "4.1k", msgs: "2.3M", creator: "@mindglow", tags: ["Support", "Calm"], image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=600&h=800" },
  { id: 12, name: "Vex Crimson", age: 22, desc: "A chaotic gamer who trash-talks with love and always has your back in co-op...", likes: "2.9k", msgs: "1.0M", creator: "@glitchwave", tags: ["Gaming", "Chaos"], image: "https://images.unsplash.com/photo-1526413232644-8a407dd5d268?auto=format&fit=crop&q=80&w=600&h=800" },
];

const categories = [
  "All", "Trending", "New", "Roleplay", "Anime", "Fantasy", "Romance",
  "Action", "Comedy", "Mystery", "Sci-Fi", "Wholesome", "Creative", "Gaming"
];

// ── Icons ──
const DiscordIcon = ({ size = 23, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M19.54 5.24a16.6 16.6 0 0 0-4.13-1.28.06.06 0 0 0-.06.03c-.18.33-.38.77-.52 1.12a15.34 15.34 0 0 0-4.66 0 11.1 11.1 0 0 0-.53-1.12.06.06 0 0 0-.06-.03 16.48 16.48 0 0 0-4.13 1.28.05.05 0 0 0-.02.02C2.8 9.09 2.1 12.82 2.45 16.5a.07.07 0 0 0 .03.05 16.7 16.7 0 0 0 5.06 2.56.06.06 0 0 0 .07-.02c.39-.53.74-1.09 1.03-1.68a.06.06 0 0 0-.03-.08 10.9 10.9 0 0 1-1.57-.75.06.06 0 0 1-.01-.1c.1-.07.19-.14.28-.22a.06.06 0 0 1 .06-.01c3.29 1.5 6.86 1.5 10.11 0a.06.06 0 0 1 .06.01l.28.22a.06.06 0 0 1-.01.1c-.5.3-1.03.55-1.57.75a.06.06 0 0 0-.03.08c.3.59.64 1.15 1.03 1.68a.06.06 0 0 0 .07.02 16.65 16.65 0 0 0 5.06-2.56.06.06 0 0 0 .03-.05c.42-4.25-.7-7.95-2.98-11.24a.05.05 0 0 0-.02-.02ZM9.56 14.23c-.99 0-1.8-.92-1.8-2.04 0-1.13.8-2.05 1.8-2.05 1 0 1.81.92 1.8 2.05 0 1.12-.8 2.04-1.8 2.04Zm4.88 0c-.99 0-1.8-.92-1.8-2.04 0-1.13.8-2.05 1.8-2.05 1 0 1.81.92 1.8 2.05 0 1.12-.8 2.04-1.8 2.04Z" />
  </svg>
);

const RedditIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M20.18 13.22c0-.73-.58-1.32-1.3-1.36a2.6 2.6 0 0 0-1.43-3.35 2.59 2.59 0 0 0-3.15.89 6.47 6.47 0 0 0-2.2-.4l.7-3.28 2.28.48a1.74 1.74 0 1 0 .3-1.06l-2.74-.59a.55.55 0 0 0-.65.43L11.2 9a6.5 6.5 0 0 0-2.16.4 2.59 2.59 0 0 0-4.58 1.65c0 .28.05.56.14.81A1.37 1.37 0 0 0 4 14.57c0 .75.61 1.36 1.36 1.36.13 0 .26-.02.38-.05 1 1.49 3.03 2.49 5.36 2.49s4.36-1 5.36-2.49c.12.03.25.05.38.05.75 0 1.36-.61 1.36-1.36 0-.19-.04-.38-.12-.55a1.36 1.36 0 0 0 1.1-1.33Zm-5.76-.68c.54 0 .98.44.98.99a.98.98 0 0 1-.98.98.98.98 0 0 1-.98-.98c0-.55.43-.99.98-.99Zm-4.67 0c.54 0 .98.44.98.99a.98.98 0 0 1-.98.98.98.98 0 0 1-.98-.98c0-.55.43-.99.98-.99Zm4.52 3.07a.33.33 0 0 1 .46.08.34.34 0 0 1-.08.47c-.78.57-1.91.9-3.1.9-1.19 0-2.31-.33-3.1-.9a.34.34 0 0 1 .39-.55c.67.48 1.66.76 2.71.76 1.05 0 2.05-.28 2.72-.76Z" />
  </svg>
);

// ── Promo Slider Component ──
const promoSlides = [
  {
    id: 1,
    title: "Premium Unlimited",
    subtitle: "Unlock completely unrestricted chat, voice messages, and exclusive image generation.",
    badge: "50% OFF",
    gradient: "from-purple-600 to-pink-600",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&h=300&fit=crop",
    action: "Upgrade Now"
  },
  {
    id: 2,
    title: "Dream Canvas is Live",
    subtitle: "Bring your anime or realistic companions to life with our brand new text-to-image engine powered by Wavespeed AI.",
    badge: "NEW FEATURE",
    gradient: "from-blue-600 to-indigo-600",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&h=300&fit=crop",
    action: "Try It Free"
  },
  {
    id: 3,
    title: "Creator Payouts Live",
    subtitle: "Earn money by creating the most popular characters on the platform. Get paid for every interaction your AI gets.",
    badge: "EARN NOW",
    gradient: "from-emerald-600 to-teal-600",
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?q=80&w=800&h=300&fit=crop",
    action: "Learn More"
  }
];

function PromoSlider({ onSlideClick }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % promoSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;

    if (distance > 50) {
      // Swiped Left
      setCurrentSlide(prev => (prev + 1) % promoSlides.length);
    } else if (distance < -50) {
      // Swiped Right
      setCurrentSlide(prev => (prev === 0 ? promoSlides.length - 1 : prev - 1));
    }
  };

  return (
    <div
      className="relative w-full max-w-5xl mx-auto mb-6 md:mb-8 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        // Prevent registering a click if the user was actually trying to swipe
        if (touchStartX.current && touchEndX.current && Math.abs(touchStartX.current - touchEndX.current) > 20) {
          e.preventDefault();
          return;
        }
        onSlideClick(promoSlides[currentSlide]);
      }}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] aspect-[4/3] sm:aspect-[21/9] lg:h-72"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {promoSlides.map((slide) => (
          <div key={slide.id} className="min-w-full relative shrink-0">
            <img src={slide.image} alt={slide.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] ease-linear origin-center" style={{ transform: 'scale(1.1)' }} />
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} opacity-70 mix-blend-multiply`} />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-8 flex flex-col justify-end">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] md:text-xs font-black uppercase tracking-wider text-white border border-white/30">{slide.badge}</span>
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight mb-1 sm:mb-2 drop-shadow-md">{slide.title}</h2>
              <p className="text-gray-200 text-xs sm:text-sm font-medium line-clamp-2 md:line-clamp-3 max-w-2xl mb-3 sm:mb-4 drop-shadow-sm leading-relaxed">{slide.subtitle}</p>
              <div className="flex items-center gap-1.5 sm:gap-2 text-white font-bold text-xs sm:text-sm md:text-base group-hover:gap-3 transition-all">
                {slide.action} <ChevronRight size={16} className="md:w-[18px] md:h-[18px]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Position Pagination Dots */}
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 flex gap-1.5 z-10">
        {promoSlides.map((_, i) => (
          <div key={i} className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${currentSlide === i ? 'w-5 sm:w-6 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'w-1 sm:w-1.5 bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}

// Replaced by CharacterCard.jsx

function FilterModal({ isOpen, onClose, filters, setFilters }) {
  if (!isOpen) return null;

  const { sortBy, filterGender, filterStyle, filterNsfw, selectedTags } = filters;
  const { setSortBy, setFilterGender, setFilterStyle, setFilterNsfw, setSelectedTags } = setFilters;

  const tagsList = ["Fantasy", "Roleplay", "Romance", "Action", "Comedy", "Mystery", "Sci-Fi", "Wholesome", "Creative", "Gaming", "Tsundere", "Support", "NSFW", "18+"];

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-lg bg-gray-900 border border-purple-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(147,51,234,0.3)] animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-5 border-b border-purple-500/20 bg-gray-900/80">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-purple-400" />
            <h3 className="text-white font-bold text-xl">Filters & Sorting</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">

          {/* Sort By section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Popular</h4>
            <div className="flex gap-3 bg-gray-950 p-2 rounded-2xl border border-gray-800">
              {["Trending", "Most Liked", "Newest"].map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${sortBy === sort ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
                >
                  {sort}
                </button>
              ))}
            </div>
          </div>

          {/* Gender & Style Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Gender</h4>
              <div className="flex flex-col gap-2">
                {["All", "Male", "Female", "Trans"].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setFilterGender(gender)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all text-left flex justify-between items-center ${filterGender === gender ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'}`}
                  >
                    {gender}
                    {filterGender === gender && <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Style</h4>
              <div className="flex flex-col gap-2">
                {["All", "Realistic", "Anime"].map((style) => (
                  <button
                    key={style}
                    onClick={() => setFilterStyle(style)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all text-left flex justify-between items-center ${filterStyle === style ? 'bg-blue-900/30 border-blue-500 text-blue-300 shadow-[inset_0_0_15px_rgba(59,130,246,0.2)]' : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'}`}
                  >
                    {style}
                    {filterStyle === style && <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* NSFW Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-950 border border-red-900/30">
            <div>
              <h4 className="text-red-400 font-bold mb-1">NSFW Content</h4>
              <p className="text-gray-500 text-xs">Show explicit content & features</p>
            </div>
            <button
              onClick={() => setFilterNsfw(!filterNsfw)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${filterNsfw ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gray-800'}`}
            >
              <div className={`absolute top-1 bottom-1 w-5 bg-white rounded-full transition-transform duration-300 ${filterNsfw ? 'left-8' : 'left-1'}`} />
            </button>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {tagsList.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${selectedTags.includes(tag) ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="p-5 border-t border-purple-500/20 bg-gray-900/80 flex gap-3">
          <button
            onClick={() => {
              setSortBy("Trending");
              setFilterGender("All");
              setFilterStyle("All");
              setFilterNsfw(false);
              setSelectedTags([]);
            }}
            className="px-6 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold hover:shadow-lg hover:shadow-purple-500/40 hover:scale-[1.02] transition-all"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}

// UpgradeModal is now imported from ./UpgradeModal

export default function App() {
  const [characters, setCharacters] = useState(fallbackCharacters);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState("Explore");
  const [activeChatCharacter, setActiveChatCharacter] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("Trending");
  const [filterGender, setFilterGender] = useState("All");
  const [filterStyle, setFilterStyle] = useState("All");
  const [filterNsfw, setFilterNsfw] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [isLightTheme, setIsLightTheme] = useState(() => localStorage.getItem('theme') === 'light');

  useEffect(() => {
    localStorage.setItem('theme', isLightTheme ? 'light' : 'dark');
  }, [isLightTheme]);

  // --- Creator Search States ---
  const [activeCreatorProfile, setActiveCreatorProfile] = useState(null);
  const [searchedCreators, setSearchedCreators] = useState([]);
  const [isSearchingCreators, setIsSearchingCreators] = useState(false);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [previewCharacter, setPreviewCharacter] = useState(null);
  // Single source of truth for liked characters — shared by cards AND preview modal
  const [likedIds, setLikedIds] = useState(new Set());
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isMoreExpanded, setIsMoreExpanded] = useState(false);

  // --- Upgrade & Coins States ---
  const [coinBalance, setCoinBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // --- Header scroll-hide state ---
  const [headerVisible, setHeaderVisible] = useState(true);
  const mainScrollRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  const handleMainScroll = () => {
    const el = mainScrollRef.current;
    if (!el) return;
    const delta = el.scrollTop - lastScrollTopRef.current;
    if (delta > 8) setHeaderVisible(false);
    else if (delta < -5) setHeaderVisible(true);
    lastScrollTopRef.current = el.scrollTop;
  };

  // --- Age Gate State ---
  const [isAgeGateOpen, setIsAgeGateOpen] = useState(false);
  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem('age_verified') === 'true');
  const [bannedError, setBannedError] = useState(null);
  const [guardModal, setGuardModal] = useState({ isOpen: false, reason: '' });

  // Fetch user profile data including coins and premium status
  useEffect(() => {
    if (sessionInfo?.user?.id) {
      supabase
        .from('users')
        .select('coin_balance, is_premium, is_deleted')
        .eq('uuid', sessionInfo.user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            if (data.is_deleted) {
              // Account was deleted/banned permanently
              supabase.auth.signOut();
              setBannedError(true);
              setIsAuthOpen(true);
              // Trigger a browser alert as requested
              console.warn("⚠️ This account has been permanently deleted.");
              return;
            }
            setCoinBalance(data.coin_balance ?? 10); // default 10 coins
            setIsPremium(data.is_premium ?? false);
          }
        });
    }
  }, [sessionInfo, profileRefreshKey]);

  const handleBurnCoin = async (amount) => {
    if (isPremium) return true; // Premium gets unlimited (or bypassed for now)
    if (coinBalance < amount) {
      setShowUpgradeModal(true);
      return false;
    }
    const newBal = coinBalance - amount;
    setCoinBalance(newBal); // optimistic update
    if (sessionInfo?.user?.id) {
      await supabase.from('users').update({ coin_balance: newBal }).eq('uuid', sessionInfo.user.id);
    }
    return true;
  };

  const handleGuardTrigger = (reason) => {
    setGuardModal({ isOpen: true, reason });
  };


  const categoryRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (categoryRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  const [forceRefresh, setForceRefresh] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch if we are in a view that needs characters, or if forced
    if (["Explore", "My AI", "CreateGroupChat"].includes(activeView) || forceRefresh > 0) {
      fetchCharacters();
    }
  }, [activeView, forceRefresh]);

  const fetchCharacters = async () => {
    if (loading && characters.length > 0) return; // already loading or has data
    setLoading(true);

    try {
      console.log('[Characters] Fetching from Supabase...');
      const { data, error } = await supabase.from('characters').select('*');

      if (error) {
        console.error('[Characters] ❌ Supabase error:', error.message, '| Code:', error.code);
        console.error('[Characters] This is usually an RLS policy blocking SELECT. See instructions in console.');
        console.info('%c[Characters] FIX: Run this SQL in Supabase → SQL Editor:\nCREATE POLICY "Public read characters" ON characters FOR SELECT USING (true);', 'color: orange');
        // Silently fall back — don't disrupt mobile users with an alert
      } else if (data) {
        console.log(`[Characters] ✅ Supabase returned ${data.length} row(s)`);

        if (data.length === 0) {
          console.warn('[Characters] ⚠️  0 rows returned — likely RLS is blocking anonymous reads.');
          console.info('%c[Characters] FIX: Run this SQL in Supabase → SQL Editor:\nCREATE POLICY "Public read characters" ON characters FOR SELECT USING (true);', 'color: orange');
          setCharacters([]);
        } else {
          const formatted = data.map(c => {
            let parsedTags = [];
            if (typeof c.tags === 'string') {
              try { parsedTags = JSON.parse(c.tags); }
              catch (e) { parsedTags = c.tags.split(',').map(t => t.trim()).filter(Boolean); }
            } else if (Array.isArray(c.tags)) {
              parsedTags = c.tags;
            }

            const finalImage = extractFirstImage(c.images) || extractFirstImage(c.image) || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=800";
            return {
              ...c,
              image: finalImage,
              desc: c.public_description || c.persona || c.desc || c.description || "A mysterious character...",
              public_description: c.public_description || null,
              tags: parsedTags,
              likes: c.likes !== undefined && c.likes !== null ? c.likes : 0,
              msgs: c.msgs !== undefined && c.msgs !== null ? c.msgs : 0,
              creator: c.username ? (c.username.startsWith('@') ? c.username : `@${c.username}`) : (c.creator || "@unknown"),
              age: c.age || "Unknown",
              // normalize nsfw flags — treat missing as false
              nsfw: c.nsfw === true,
              isNsfw: c.isNsfw === true,
            };
          });

          const currentUserId = sessionInfo?.user?.id;
          const visibleCharacters = formatted.filter(c => c.is_public !== false || (currentUserId && c.uuid === currentUserId));

          // Debug: how many survive the default NSFW filter
          const safeCount = visibleCharacters.filter(c =>
            !c.nsfw && !c.isNsfw &&
            !(c.tags && c.tags.some(t => ['nsfw', '18+'].includes(t.toLowerCase())))
          ).length;
          console.log(`[Characters] After NSFW + visibility filter: ${safeCount}/${visibleCharacters.length} will show (toggle NSFW in filters to see rest)`);

          setCharacters(visibleCharacters);
        }
      }
    } catch (err) {
      console.error("[Characters] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkScroll();
    const ref = categoryRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
    }
    return () => {
      if (ref) ref.removeEventListener('scroll', checkScroll);
    };
  }, []);

  useEffect(() => {
    // Supabase Auth Persistence
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionInfo(session);
      if (session) {
        const metadata = session.user.user_metadata;
        setUser(metadata?.username || metadata?.full_name || session.user.email);
        const userAgreed = metadata?.age_verified === true || localStorage.getItem('age_verified') === 'true';
        if (!userAgreed) setIsAgeGateOpen(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionInfo(session);
      if (session) {
        const metadata = session.user.user_metadata;
        setUser(metadata?.username || metadata?.full_name || session.user.email);
        const userAgreed = metadata?.age_verified === true || localStorage.getItem('age_verified') === 'true';
        if (!userAgreed) setIsAgeGateOpen(true);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Creator Search Effect
  useEffect(() => {
    const fetchCreators = async () => {
      if (searchQuery.startsWith('@') && searchQuery.length > 1) {
        setIsSearchingCreators(true);
        const term = searchQuery.substring(1).trim();
        const { data, error } = await supabase
          .from('users')
          .select('uuid, username, is_premium, followers_count, following_count')
          .ilike('username', `%${term}%`)
          .limit(10);

        if (!error && data) {
          setSearchedCreators(data);
        } else {
          setSearchedCreators([]);
        }
        setIsSearchingCreators(false);
      } else {
        setSearchedCreators([]);
      }
    };

    // Add debounce
    const delayDebounceFn = setTimeout(() => {
      fetchCreators();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const filteredCharacters = React.useMemo(() => {
    let result = [...characters];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (q.startsWith('@')) {
        // We handle creator cards separately, but still let character filter show characters owned by that creator if any
        result = result.filter(c => c.creator && c.creator.toLowerCase().includes(q));
      } else {
        result = result.filter(c =>
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.desc && c.desc.toLowerCase().includes(q)) ||
          (c.tags && c.tags.some(t => t.toLowerCase().includes(q))) ||
          (c.creator && c.creator.toLowerCase().includes(q))
        );
      }
    }

    // Gender
    if (filterGender !== "All") {
      result = result.filter(c =>
        (c.gender && c.gender.toLowerCase() === filterGender.toLowerCase()) ||
        (c.tags && c.tags.some(t => t.toLowerCase() === filterGender.toLowerCase()))
      );
    }

    // Style
    if (filterStyle !== "All") {
      result = result.filter(c =>
        (c.style && c.style.toLowerCase() === filterStyle.toLowerCase()) ||
        (c.tags && c.tags.some(t => t.toLowerCase() === filterStyle.toLowerCase()))
      );
    }

    // NSFW - Removed hard filter as requested so NSFW characters always appear in grid but blurred when logged out.

    // Selected Tags
    if (selectedTags.length > 0) {
      result = result.filter(c =>
        selectedTags.some(tag => c.tags && c.tags.some(t => t.toLowerCase() === tag.toLowerCase()))
      );
    }

    // Categories slider (from the top bar)
    if (activeCategory !== "All" && activeCategory !== "Trending" && activeCategory !== "New") {
      result = result.filter(c => c.tags && c.tags.some(t => t.toLowerCase() === activeCategory.toLowerCase()));
    }

    // Sort
    if (sortBy === "Most Liked") {
      result.sort((a, b) => {
        const parseK = str => parseFloat((str || "0").toString().replace('k', '')) * (str?.toString().includes('k') ? 1000 : (str?.toString().includes('M') ? 1000000 : 1));
        return (parseK(b.likes) || 0) - (parseK(a.likes) || 0);
      });
    } else if (sortBy === "Newest" || activeCategory === "New") {
      result.sort((a, b) => (b.id || 0) - (a.id || 0)); // Assuming higher ID is newer
    } else { // Trending
      result.sort((a, b) => {
        const parseK = str => parseFloat((str || "0").toString().replace('k', '')) * (str?.toString().includes('k') ? 1000 : (str?.toString().includes('M') ? 1000000 : 1));
        return (parseK(b.msgs) || 0) - (parseK(a.msgs) || 0);
      });
    }

    return result;
  }, [characters, searchQuery, filterGender, filterStyle, filterNsfw, selectedTags, sortBy, activeCategory]);

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowLogoutConfirm(false);
    setActiveView("Explore");
  };

  const handleLike = async (characterId, currentLikes) => {
    // sessionInfo holds the real Supabase session; user is just a display-name string
    if (!sessionInfo) {
      setAuthMessage("Sign in to like characters!");
      setIsAuthOpen(true);
      return;
    }

    // ── GUARD: one like per character, no matter where the button is clicked ──
    if (likedIds.has(characterId)) return;
    setLikedIds(prev => new Set([...prev, characterId]));

    let numericLikes = 0;
    if (typeof currentLikes === 'number') {
      numericLikes = currentLikes;
    } else if (typeof currentLikes === 'string') {
      const stringVal = currentLikes.replace(/,/g, '').replace(/k$/i, '000').replace(/m$/i, '000000');
      const parsed = parseFloat(stringVal);
      if (!isNaN(parsed)) numericLikes = Math.floor(parsed);
    }

    const newLikes = numericLikes + 1;

    // Optimistic update so UI feels instant
    const formatLikes = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n;
    setCharacters(prev => prev.map(c =>
      c.id === characterId ? { ...c, likes: formatLikes(newLikes) } : c
    ));

    try {
      const { error } = await supabase
        .from('characters')
        .update({ likes: newLikes })
        .eq('id', characterId);

      if (error) {
        console.error("Like update failed (check RLS policies on characters table):", error.message);
        // Roll back optimistic update and remove from liked set so user can retry
        setLikedIds(prev => { const s = new Set(prev); s.delete(characterId); return s; });
        setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, likes: currentLikes } : c));
      }
    } catch (err) {
      console.error("Like error:", err);
      setLikedIds(prev => { const s = new Set(prev); s.delete(characterId); return s; });
      setCharacters(prev => prev.map(c => c.id === characterId ? { ...c, likes: currentLikes } : c));
    }
  };

  const scrollCategories = (direction) => {
    if (categoryRef.current) {
      categoryRef.current.scrollBy({ left: direction * 200, behavior: 'smooth' });
    }
  };

  const sidebarItems = [
    { icon: Plus, label: "Create", active: false, accent: false },
    { icon: Compass, label: "Explore", active: true, accent: false },
    { icon: MessageCircle, label: "Chat", active: false, accent: false },
    { icon: Camera, label: "Generate", active: false, accent: true },
    { icon: Sparkles, label: "My AI", active: false, accent: false },
    { icon: Play, label: "Feed", active: false, accent: false },
    { icon: Users, label: "Community", active: false, accent: false },
  ];

  const bottomItems = [
    { icon: User, label: "Profile" },
    { icon: HelpCircle, label: "Support" },
    { icon: MoreHorizontal, label: "More" },
  ];

  const moreMenuItems = [
    { icon: DiscordIcon, label: "Discord", link: import.meta.env.VITE_DISCORD_URL || "https://discord.com" },
    { icon: RedditIcon, label: "Reddit", link: import.meta.env.VITE_REDDIT_URL || "https://reddit.com" },
  ];

  const Sidebar = ({ mobile = false }) => (
    <div className={`${mobile ? 'fixed inset-0 z-50 flex' : 'hidden lg:flex'}`}>
      {mobile && (
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}
      <div className={`relative flex flex-col bg-gray-950 border-r border-purple-900/30 ${sidebarOpen ? 'w-56' : 'w-20'} transition-all duration-300 h-full`}>
        <div className="flex items-center gap-3 p-4 border-b border-purple-900/30">
          <button
            onClick={() => mobile ? setMobileSidebarOpen(false) : setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-purple-900/30 transition-colors"
          >
            {mobile ? <X size={20} className="text-purple-300" /> : <Menu size={20} className="text-purple-300" />}
          </button>
          {sidebarOpen && (
            <div
              onClick={() => { setActiveView("Explore"); setActiveCreatorProfile(null); if (mobile) setMobileSidebarOpen(false); }}
              className="flex items-center gap-1 cursor-pointer group hover:scale-105 transition-transform duration-300"
            >
              <Zap size={22} className="text-purple-400 group-hover:text-purple-300 group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.9)] transition-all avoid-invert" fill="currentColor" />
              <span className="font-black text-lg tracking-tight group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all">
                <span className="text-white">Dream</span><span className="text-purple-400 group-hover:text-purple-300">AI</span>
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {sidebarItems.map((item) => (
            <NavButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              active={activeView === item.label}
              accent={item.accent}
              sidebarOpen={sidebarOpen}
              onClick={() => {
                if (item.label === "Explore") setForceRefresh(p => p + 1);
                setActiveView(item.label);
                setActiveCreatorProfile(null);
                if (mobile) setMobileSidebarOpen(false);
              }}
            />
          ))}
        </nav>

        <div className="px-3 mb-4">
          <button
            onClick={() => { setShowUpgradeModal(true); if (mobile) setMobileSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/40 hover:scale-105 active:scale-95 ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            <Crown size={20} className="flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Upgrade Pro</span>}
          </button>
        </div>

        <div className="border-t border-purple-900/30 py-3 px-3 space-y-1">
          {bottomItems.map((item) => {
            const isMoreButton = item.label === "More";
            const useFlyout = isMoreButton && !sidebarOpen;

            return (
              <div key={item.label} className={`relative ${isMoreButton ? 'overflow-visible' : ''}`}>
                {isMoreButton && (
                  <div
                    className={`${useFlyout
                      ? `absolute left-full bottom-0 ml-2 w-44 origin-left transition-all duration-250 ${isMoreExpanded ? 'pointer-events-auto translate-x-0 opacity-100 scale-100' : 'pointer-events-none -translate-x-1 opacity-0 scale-95'}`
                      : `absolute left-0 right-0 bottom-full mb-1.5 origin-bottom transition-all duration-250 ${isMoreExpanded ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-1 opacity-0 scale-95'}`
                      }`}
                  >
                    <div>
                      <div className="rounded-2xl border border-white/8 bg-gray-950/96 backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.35)] p-1.5">
                        {moreMenuItems.map((moreItem) => (
                          <button
                            key={moreItem.label}
                            onClick={() => {
                              window.open(moreItem.link, '_blank', 'noopener,noreferrer');
                              setIsMoreExpanded(false);
                              if (mobile) setMobileSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-gray-200 hover:bg-white/5 hover:text-white transition-all duration-200"
                          >
                            <moreItem.icon size={18} className="text-purple-300 flex-shrink-0" />
                            <span className="text-sm font-medium tracking-tight">{moreItem.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (item.link) {
                      window.open(item.link, '_blank', 'noopener,noreferrer');
                      if (mobile) setMobileSidebarOpen(false);
                      return;
                    }
                    if (isMoreButton) {
                      setIsMoreExpanded(v => !v);
                      return;
                    }
                    setIsMoreExpanded(false);
                    if (item.label === "Profile") setActiveView("Profile");
                    setActiveCreatorProfile(null);
                    if (mobile) setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${(activeView === item.label || (isMoreButton && isMoreExpanded))
                    ? 'bg-purple-900/40 text-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-gray-500 hover:bg-purple-900/20 hover:text-purple-300'
                    }`}
                >
                  <item.icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${isMoreButton && isMoreExpanded ? 'rotate-90' : ''}`} />
                  {sidebarOpen && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="text-sm font-medium">{item.label}</span>
                      {isMoreButton && (
                        <ChevronRight
                          size={16}
                          className={`text-purple-400 transition-transform duration-300 ${isMoreExpanded ? '-rotate-90' : 'rotate-90'}`}
                        />
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      <Sidebar />
      {mobileSidebarOpen && <Sidebar mobile />}

      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
        {!(activeView === "Chat" && activeChatCharacter) && (
          <header
            className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 lg:px-6 py-3 border-b border-purple-900/30 bg-gray-950/90 backdrop-blur-xl z-40 transition-transform duration-300 lg:translate-y-0"
            style={{ transform: headerVisible ? 'translateY(0)' : 'translateY(-105%)' }}
          >
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-purple-900/30 transition-colors"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={22} className="text-purple-300" />
            </button>

            {/* Logo — proper button so it's always tappable on mobile */}
            <button
              onClick={() => { setActiveView("Explore"); setActiveCreatorProfile(null); }}
              className="lg:hidden flex items-center gap-1 group active:scale-95 transition-transform duration-200"
            >
              <Zap size={20} className="text-purple-400 avoid-invert" fill="currentColor" />
              <span className="font-black text-base tracking-tight">
                <span className="text-white">Dream</span><span className="text-purple-400">AI</span>
              </span>
            </button>

            <div className="hidden lg:block"></div>

            <div className="flex items-center gap-2 md:gap-4 relative">
              {user ? (
                <div className="relative flex items-center gap-3">
                  {/* Coins Badge */}
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold text-sm shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:bg-amber-500/20 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] flex items-center gap-1.5 transition-all duration-300"
                  >
                    <Zap size={14} className={isPremium ? "text-amber-400 fill-amber-400" : "text-amber-400"} />
                    {isPremium ? 'Premium' : `${coinBalance}`}
                  </button>

                  <div className="relative">
                    {/* Profile icon — tappable, opens dropdown */}
                    <button
                      onClick={() => setShowProfileDropdown(v => !v)}
                      className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 p-[2px] cursor-pointer shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 active:scale-95 transition-all"
                      aria-label="Profile menu"
                    >
                      <div className="w-full h-full rounded-[10px] bg-gray-900 flex items-center justify-center">
                        <User size={18} className="text-purple-300" />
                      </div>
                    </button>

                    {/* Dropdown */}
                    {showProfileDropdown && (
                      <>
                        {/* Backdrop */}
                        <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                        <div className="absolute right-0 top-12 z-50 w-64 bg-gray-900 border border-purple-900/40 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          {/* User info */}
                          <div className="px-4 py-4 border-b border-gray-800">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 p-[2px] flex-shrink-0">
                                <div className="w-full h-full rounded-[9px] bg-gray-800 flex items-center justify-center">
                                  <User size={16} className="text-purple-300" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-white font-bold text-sm truncate">@{user}</p>
                                  {isPremium && <Star size={12} className="text-amber-400 fill-amber-400 flex-shrink-0" />}
                                </div>
                                {sessionInfo?.user?.email && (
                                  <p className="text-gray-500 text-xs truncate">{sessionInfo.user.email}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          {/* Menu items */}
                          <div className="py-2">
                            <button
                              onClick={() => { setActiveView('Profile'); setShowProfileDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-medium"
                            >
                              <User size={16} className="text-purple-400" />
                              Profile
                            </button>
                            <button
                              onClick={() => { setIsLightTheme(!isLightTheme); setShowProfileDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-medium"
                            >
                              {isLightTheme ? <Moon size={16} className="text-purple-400" /> : <Sun size={16} className="text-purple-400" />}
                              {isLightTheme ? 'Dark Theme' : 'White Theme'}
                            </button>
                            <button
                              onClick={() => { setShowUpgradeModal(true); setShowProfileDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-amber-300 hover:text-amber-100 hover:bg-amber-900/30 transition-colors text-sm font-bold"
                            >
                              <Zap size={16} className="text-amber-400" />
                              Upgrade / Add Coins
                            </button>
                            <button
                              onClick={() => { setActiveView('Profile'); setShowProfileDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-medium"
                            >
                              <MoreHorizontal size={16} className="text-purple-400" />
                              Settings &amp; More
                            </button>
                            <button
                              onClick={() => { setIsAgeGateOpen(true); setShowProfileDropdown(false); }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-red-900/30 transition-colors text-sm font-medium border-t border-gray-800"
                            >
                              <Shield size={16} className="text-red-400" />
                              Terms &amp; Policies
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsAuthOpen(true)}
                    className="relative group overflow-hidden px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm transition-all duration-300 border border-purple-400/50 shadow-[0_0_20px_rgba(147,51,234,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] hover:bg-purple-500 active:scale-95"
                  >
                    <span className="relative z-10">Join Free</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        <main
          ref={mainScrollRef}
          onScroll={handleMainScroll}
          className={`flex-1 overflow-y-auto scrollbar-hide ${(activeView === "Chat" && activeChatCharacter) ? 'pb-0 h-screen' : 'pt-[68px] pb-24 lg:pb-0'}`}
        >
          {activeCreatorProfile ? (
            <CreatorProfileView
              creatorUsername={activeCreatorProfile}
              onBack={() => setActiveCreatorProfile(null)}
              onCharacterClick={(char) => {
                setActiveCreatorProfile(null);
                setActiveChatCharacter(char);
                setActiveView("Chat");
              }}
              currentUser={sessionInfo?.user}
              onLike={handleLike}
              likedIds={likedIds}
              onFollowChange={() => setProfileRefreshKey(k => k + 1)}
            />
          ) : activeView === "Create" ? (
            <CreateView
              user={user}
              sessionInfo={sessionInfo}
              onRequireLogin={() => {
                setAuthMessage("Sign in to create a character for free!");
                setIsAuthOpen(true);
              }}
              onStartChat={(char) => { setActiveChatCharacter(normalizeCharacter(char)); setActiveView("Chat"); }}
              coinBalance={isPremium ? Infinity : coinBalance}
              onBurnCoin={handleBurnCoin}
              onRequireUpgrade={() => setShowUpgradeModal(true)}
              onGuard={handleGuardTrigger}
            />
          ) : activeView === "Profile" ? (
            <ProfileView
              onLogout={confirmLogout}
              onForceLogout={handleLogout}
              refreshKey={profileRefreshKey}
              onReadTerms={() => setIsAgeGateOpen(true)}
              onGuard={handleGuardTrigger}
            />
          ) : activeView === "Chat" ? (
            <ChatView
              onNavigateToExplore={() => setActiveView("Explore")}
              character={activeChatCharacter}
              onBackToList={() => setActiveChatCharacter(null)}
              onSelectCharacter={(c) => setActiveChatCharacter(c)}
              user={user}
              sessionInfo={sessionInfo}
              onRequireLogin={() => {
                setAuthMessage("Sign in to chat with characters!");
                setIsAuthOpen(true);
              }}
              coinBalance={isPremium ? Infinity : coinBalance}
              onBurnCoin={handleBurnCoin}
              onRequireUpgrade={() => setShowUpgradeModal(true)}
              onGuard={handleGuardTrigger}
            />
          ) : activeView === "Generate" ? (
            <GenerateView
              sessionInfo={sessionInfo}
              coinBalance={coinBalance}
              isPremium={isPremium}
              onBurnCoin={handleBurnCoin}
              setShowUpgradeModal={setShowUpgradeModal}
              onRequireUpgrade={() => setShowUpgradeModal(true)}
            />
          ) : activeView === "CreateGroupChat" ? (
            <GroupChatCreateView
              onBack={() => setActiveView("Explore")}
              user={user}
              sessionInfo={sessionInfo}
              onNavigateToCreate={() => setActiveView("Create")}
              onStartChat={(groupData) => {
                setActiveChatCharacter({
                  ...groupData,
                  id: `group_${Date.now()}`,
                  isNewGroupChat: true,
                  name: groupData.title,
                  image: groupData.bgImage || groupData.characters[0]?.image || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=400',
                  desc: groupData.scenario,
                  greeting: groupData.openingMessage || `Welcome to ${groupData.title}!`,
                });
                setActiveView("Chat");
              }}
            />
          ) : activeView === "My AI" ? (
            <MyAIView
              onNavigateToCreate={() => setActiveView("Create")}
              onNavigateToGenerate={() => setActiveView("Generate")}
              sessionInfo={sessionInfo}
              user={user}
              onStartChat={(char) => { setActiveChatCharacter(normalizeCharacter(char)); setActiveView("Chat"); }}
            />
          ) : activeView === "Explore" ? (
            <div className="px-4 lg:px-6 py-5">

              {/* Promo Banner Slider */}
              <PromoSlider onSlideClick={(slide) => {
                if (slide.id === 1) {
                  setShowUpgradeModal(true);
                } else if (slide.id === 2) {
                  setActiveView("Generate");
                } else if (slide.id === 3) {
                  setAuthMessage("Create an account to join the Creator Payouts program!");
                  setIsAuthOpen(!user);
                }
              }} />

              <div className={`relative max-w-2xl mx-auto mb-6 transition-all duration-300 ${searchFocused ? 'scale-105' : ''}`}>
                <Search
                  size={20}
                  className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${searchFocused ? 'text-purple-400' : 'text-gray-500'}`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search characters, creators, or tags..."
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-900/80 border border-purple-900/40 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 text-sm"
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <kbd className="px-2 py-1 text-xs text-gray-500 bg-gray-800 rounded-lg border border-gray-700">⌘K</kbd>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-5">
                <button
                  onClick={() => setActiveView("CreateGroupChat")}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 transition-all shadow-md group"
                >
                  <Users size={18} className="text-white drop-shadow-sm" />
                  <span className="text-sm">Group Chat</span>
                </button>
                <button
                  onClick={() => setIsFilterOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 border border-purple-500/40 rounded-xl hover:bg-purple-900/20 hover:border-purple-400 transition-colors group"
                >
                  <Filter size={18} className="text-purple-400 group-hover:text-purple-300" />
                  <span className="text-gray-200 font-medium text-sm group-hover:text-white">Filters & Sorting</span>
                  {(selectedTags.length > 0 || filterGender !== "All" || filterStyle !== "All" || filterNsfw || sortBy !== "Trending") && (
                    <span className="bg-pink-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1 shadow-[0_0_8px_rgba(236,72,153,0.8)]">
                      {selectedTags.length + (filterGender !== "All" ? 1 : 0) + (filterStyle !== "All" ? 1 : 0) + (filterNsfw ? 1 : 0) + (sortBy !== "Trending" ? 1 : 0)}
                    </span>
                  )}
                </button>

                {/* Display active filter chips */}
                {filterGender !== "All" && <span className="px-3 py-1 bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold rounded-lg flex items-center gap-1">{filterGender}</span>}
                {filterStyle !== "All" && <span className="px-3 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-semibold rounded-lg flex items-center gap-1">{filterStyle}</span>}
                {filterNsfw && <span className="px-3 py-1 bg-red-900/40 border border-red-500/30 text-red-300 text-xs font-semibold rounded-lg flex items-center gap-1">NSFW</span>}
                {selectedTags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-800 border border-gray-600 text-gray-300 text-xs font-medium rounded-lg">{tag}</span>
                ))}
                {selectedTags.length > 3 && <span className="px-3 py-1 bg-gray-800 text-gray-400 text-xs font-medium rounded-lg">+{selectedTags.length - 3}</span>}
              </div>

              <div className="relative mb-6">
                {canScrollLeft && (
                  <button
                    onClick={() => scrollCategories(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-gray-950/90 border border-purple-900/40 rounded-full shadow-lg hover:bg-purple-900/40 transition-colors"
                  >
                    <ChevronLeft size={16} className="text-purple-300" />
                  </button>
                )}

                <div
                  ref={categoryRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex-shrink-0 px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300
                      ${activeCategory === cat
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                          : 'bg-gray-900/60 text-gray-400 hover:bg-purple-900/30 hover:text-purple-300 border border-purple-900/20'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {canScrollRight && (
                  <button
                    onClick={() => scrollCategories(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-gray-950/90 border border-purple-900/40 rounded-full shadow-lg hover:bg-purple-900/40 transition-colors"
                  >
                    <ChevronRight size={16} className="text-purple-300" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-purple-400" />
                  <h2 className="text-white font-semibold text-lg">
                    {searchQuery.startsWith('@') ? "Creators & Characters" : "Discover Characters"}
                  </h2>
                  <span className="text-gray-500 text-sm">({searchQuery.startsWith('@') ? searchedCreators.length + filteredCharacters.length : filteredCharacters.length})</span>
                </div>
              </div>

              {/* Creator Cards Section */}
              {searchQuery.startsWith('@') && searchQuery.length > 1 && (
                <div className="mb-8">
                  <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Creators</h3>
                  {isSearchingCreators ? (
                    <div className="flex h-24 items-center justify-center">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : searchedCreators.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {searchedCreators.map(creator => (
                        <div
                          key={creator.uuid}
                          onClick={() => setActiveCreatorProfile(creator.username)}
                          className="bg-gray-900 border border-purple-900/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-purple-500 hover:-translate-y-1 transition-all duration-300"
                        >
                          <div className="w-14 h-14 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                            <span className="text-xl font-bold bg-gradient-to-br from-purple-400 to-pink-400 bg-clip-text text-transparent uppercase">
                              {(creator.username || 'U').substring(0, 2)}
                            </span>
                            {creator.is_premium && (
                              <div className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                                <Crown size={8} className="text-black" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <h4 className="text-white font-bold truncate">@{creator.username}</h4>
                              {creator.is_premium && <BadgeCheck size={14} className="text-blue-400 flex-shrink-0" />}
                            </div>
                            <p className="text-gray-400 text-xs">
                              {creator.followers_count || 0} followers
                            </p>
                          </div>
                          <button className="p-2 bg-purple-900/40 text-purple-300 rounded-xl hover:bg-purple-600 hover:text-white transition-colors">
                            <UserPlus size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No creators found matching that username.</p>
                  )}
                </div>
              )}

              {/* Characters Grid */}
              {(filteredCharacters.length > 0 || !searchQuery.startsWith('@')) && (
                <>
                  {searchQuery.startsWith('@') && <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-3">Characters</h3>}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5 pb-8">
                    {filteredCharacters.map((character, index) => {
                      const hasNsfwTag = character.tags?.some(tag => ['nsfw', '18+'].includes(tag.toLowerCase()));
                      const isNsfw = character.nsfw || character.isNsfw || hasNsfwTag;
                      const shouldBlur = isNsfw && !sessionInfo;

                      return (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          index={index}
                          onClick={() => { setPreviewCharacter(character); }}
                          onLike={handleLike}
                          isLiked={likedIds.has(character.id)}
                          isBlurred={shouldBlur}
                          onUnblurClick={() => {
                            setAuthMessage("You must sign in to view NSFW characters.");
                            setIsAuthOpen(true);
                          }}
                          onCreatorClick={(creator) => {
                            setActiveCreatorProfile(creator.startsWith('@') ? creator.substring(1) : creator);
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              <div className="flex justify-center pb-8">
                <button className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 text-purple-300 font-medium hover:from-purple-600/30 hover:to-pink-600/30 hover:border-purple-400 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 active:scale-95">
                  Load More Characters
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 font-medium opacity-60">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-900 border border-purple-900/30 flex items-center justify-center">
                <Compass size={24} className="text-purple-400" />
              </div>
              <p>The "{activeView}" page is under construction</p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className={`lg:hidden fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-xl border-t border-purple-900/40 z-30 pb-safe ${(activeView === "Chat" && activeChatCharacter) ? "hidden" : ""}`}>
        <div className="flex items-end justify-around px-2 py-2 mb-1">
          {[
            { icon: Compass, label: "Explore", active: activeView === "Explore" },
            { icon: MessageCircle, label: "Chat", active: activeView === "Chat" },
            { icon: Plus, label: "Create", active: activeView === "Create" },
            { icon: Camera, label: "Generate", active: activeView === "Generate" },
            { icon: Sparkles, label: "My AI", active: activeView === "My AI" },
          ].map((item, idx) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === "Explore") setForceRefresh(p => p + 1);
                setActiveView(item.label);
                setActiveCreatorProfile(null);
              }}
              className="relative flex flex-col items-center justify-end gap-1 p-1 group w-16 h-12"
            >
              <item.icon size={22} className={`transition-all duration-300 ${item.active ? 'text-purple-400 -translate-y-1' : 'text-gray-500 group-hover:text-purple-300 group-hover:-translate-y-1'}`} />
              <span className={`text-[10px] font-semibold transition-colors tracking-wide ${item.active ? 'text-purple-300' : 'text-gray-500 group-hover:text-purple-300'}`}>
                {item.label}
              </span>
              {item.active && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      <FilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={{ sortBy, filterGender, filterStyle, filterNsfw, selectedTags }}
        setFilters={{ setSortBy, setFilterGender, setFilterStyle, setFilterNsfw, setSelectedTags }}
      />

      {/* ── Character Intro Modal ── */}
      {previewCharacter && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => { setPreviewCharacter(null); }} />
          <div className="relative w-full md:max-w-lg md:mx-4 max-h-[92vh] bg-gray-950 md:rounded-3xl overflow-hidden border-t md:border border-purple-500/10 shadow-2xl" style={{ animation: 'slideUp 0.3s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
            <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }`}</style>

            {/* Hero image */}
            <div className="relative h-64 md:h-72 w-full overflow-hidden">
              <img src={previewCharacter.image} alt={previewCharacter.name} className="w-full h-full object-cover scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-pink-900/20 mix-blend-overlay" />

              {/* Back + like buttons */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4">
                <button onClick={() => { setPreviewCharacter(null); }} className="p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-white/20 active:scale-90 transition-all">
                  <X size={20} />
                </button>
                {/* Heart — reads from shared likedIds Set — already liked stays filled */}
                <button
                  onClick={() => handleLike(previewCharacter.id, previewCharacter.likes)}
                  className={`p-2.5 backdrop-blur-md rounded-full transition-all active:scale-90 ${likedIds.has(previewCharacter.id)
                    ? 'bg-pink-500/50 text-pink-200 cursor-default'
                    : 'bg-black/30 text-white hover:bg-white/20'
                    }`}
                  aria-label={likedIds.has(previewCharacter.id) ? 'Already liked' : 'Like character'}
                >
                  <Heart size={18} fill={likedIds.has(previewCharacter.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              {/* Name + age overlay */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-end gap-4">
                  <div className="relative flex-shrink-0">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full opacity-60 blur-sm" />
                    <img src={previewCharacter.image} alt={previewCharacter.name} className="relative w-20 h-20 rounded-full object-cover border-4 border-gray-950 shadow-xl" />
                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-gray-950 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <h3 className="text-2xl font-black text-white mb-0.5 truncate">{previewCharacter.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {previewCharacter.age && <span className="text-purple-300 text-sm font-semibold">{previewCharacter.age} years old</span>}
                      <span className="w-1 h-1 bg-gray-600 rounded-full" />
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        <span className="text-green-400 text-[10px] font-bold uppercase">Online</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto max-h-[calc(92vh-16rem)] md:max-h-[calc(92vh-18rem)]">
              <div className="px-5 pb-8 pt-4">
                {/* Action shortcuts */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[{ icon: Phone, label: 'Call', color: 'purple' }, { icon: Search, label: 'Search', color: 'blue' }].map(({ icon: Icon, label, color }) => (
                    <button key={label} className={`flex flex-col items-center gap-2 p-4 bg-gray-900/60 border border-gray-800/50 hover:border-${color}-500/20 rounded-2xl transition-all group`}>
                      <div className={`w-10 h-10 bg-${color}-500/10 rounded-full flex items-center justify-center`}><Icon size={18} className={`text-${color}-400`} /></div>
                      <span className="text-[11px] font-bold text-gray-400">{label}</span>
                    </button>
                  ))}
                </div>

                {/* About / Persona — shows AI-generated public description when available */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-purple-400" />
                    <h4 className="text-xs font-black text-gray-300 uppercase tracking-wider">
                      {previewCharacter.public_description ? `About ${previewCharacter.name}` : 'Persona'}
                    </h4>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {previewCharacter.public_description || previewCharacter.desc || previewCharacter.persona || 'A mysterious companion waiting to meet you...'}
                    </p>
                  </div>
                </div>

                {/* Personality Traits */}
                {(previewCharacter.tags || []).length > 0 && (
                  <div className="mb-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Star size={14} className="text-pink-400" />
                      <h4 className="text-xs font-black text-gray-300 uppercase tracking-wider">Personality Traits</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(previewCharacter.tags || []).map((tag, i) => (
                        <span key={i} className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-300 border border-purple-500/15">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart size={13} className="text-red-400" />
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Likes</p>
                    </div>
                    <p className="text-white text-sm font-bold">{previewCharacter.likes || '0'}</p>
                  </div>
                  <div className="bg-gray-900/40 border border-gray-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare size={13} className="text-purple-400" />
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Messages</p>
                    </div>
                    <p className="text-white text-sm font-bold">{previewCharacter.msgs || '0'}</p>
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={() => {
                    setActiveChatCharacter(normalizeCharacter(previewCharacter));
                    setPreviewCharacter(null);
                    setActiveView("Chat");
                  }}
                  className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                >
                  <MessageCircle size={20} /> Start Chatting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        customMessage={authMessage}
        bannedError={bannedError}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthMessage("");
          setBannedError(null);
        }}
      />

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowLogoutConfirm(false)}></div>
          <div className="relative w-full max-w-sm bg-gray-900 border border-purple-900/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center mb-4">
              <LogOut size={28} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Log out of DreamAI?</h3>
            <p className="text-gray-400 text-sm mb-6">You can always log back in at any time to access your generated characters.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition">Cancel</button>
              <button onClick={handleLogout} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition">Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Animations & Scrollbars & Light Theme */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
        ${isLightTheme ? `
          body { 
            filter: invert(1) hue-rotate(180deg); 
            background: #fdfdfd; 
          }
          img:not(.avoid-invert img), video:not(.avoid-invert video), .avoid-invert { 
            filter: invert(1) hue-rotate(180deg); 
          }
        ` : ''}
      `}} />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        coinBalance={coinBalance}
        isPremium={isPremium}
        userUuid={sessionInfo?.user?.id}
        sessionInfo={sessionInfo}
        onPremiumGranted={() => {
          setIsPremium(true);
          setCoinBalance(9999);
          setShowUpgradeModal(false);
        }}
        onCoinsAdded={(newBalance) => {
          setCoinBalance(newBalance);
        }}
      />

      <AgeGateModal
        isOpen={isAgeGateOpen}
        onDecline={() => {
          window.location.href = "https://www.google.com/search?q=cats";
        }}
        onAgree={async () => {
          localStorage.setItem('age_verified', 'true');
          setHasAgreed18(true);
          setIsAgeGateOpen(false);
          if (sessionInfo?.user) {
            try { await supabase.auth.updateUser({ data: { age_verified: true } }); } catch (e) { }
          }
        }}
      />

      <GuardModal
        isOpen={guardModal.isOpen}
        reason={guardModal.reason}
        onClose={() => setGuardModal({ isOpen: false, reason: '' })}
      />

      {/* Cookie Banner (Only for logged in users) */}
      {user && <CookieBanner onReadPolicy={() => setIsAgeGateOpen(true)} />}
    </div>
  );
}
