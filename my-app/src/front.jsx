import React, { useState, useRef, useEffect, useCallback } from "react";
import AuthModal from "./AuthModal";
import OnboardingModal from "./OnboardingModal";
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
import LandingPage from "./LandingPage";
import Roleplay from "./Roleplay";
import StoryGenerator from "./StoryGenerator";
import AgeGateModal from "./AgeGateModal";
import PolicyModal from "./PolicyModal";
import MediaFrame from "./MediaFrame";
import GuardModal from "./GuardModal";
import CookieBanner from "./CookieBanner";
import { checkContentSafe } from "./guard";
import { supabase } from "./supabaseClient";
import { FALLBACK_MEDIA_IMAGE, extractFirstStill, resolveCharacterMedia } from "./mediaUtils";
import { useTranslation } from "./i18n.jsx";
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
  Moon,
  Bell,
  Globe,
  ChevronDown,
  Check,
  Gift,
  Activity,
  Trash2,
  Drama,
  BookOpen
} from "lucide-react";

function extractFirstImage(imgField) {
  if (!imgField) return null;
  const firstStill = extractFirstStill(imgField);
  if (firstStill) return firstStill;
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

  const media = resolveCharacterMedia(char);
  const finalImage = media.stillImage || FALLBACK_MEDIA_IMAGE;
  return {
    ...char,
    image: finalImage,
    motionPreview: char.motionPreview || media.motionPreview || null,
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
const DiscordIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 127.14 96.36" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.71,32.65-1.82,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39,86.1a68.77,68.77,0,0,1-10.87-5.2c.85-.6,1.69-1.25,2.5-1.9a75.78,75.78,0,0,0,65.88,0c.81.65,1.66,1.3,2.5,1.9a68.55,68.55,0,0,1-10.87,5.2,78.11,78.11,0,0,0,6.33,10.26,105.33,105.33,0,0,0,32.18-16.15h0C130.66,50.31,126.12,26.54,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5.07-12.65,11.41-12.65S54,46,53.86,53,48.81,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5.07-12.65,11.44-12.65S96.23,46,96.12,53,91.06,65.69,84.69,65.69Z" />
  </svg>
);

const RedditIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M16.67,10A1.46,1.46,0,0,0,14.2,8.89,6.49,6.49,0,0,0,11.05,8L12,3.83l3,.64a1.14,1.14,0,1,0,.19-.7l-3.37-.71a.36.36,0,0,0-.43.28L10.37,8.11a6.5,6.5,0,0,0-3.09.84A1.46,1.46,0,1,0,4.8,11.39a.34.34,0,0,0,.1.06,4.65,4.65,0,0,0-.1,1c0,2.14,2.29,3.89,5.1,3.89s5.1-1.75,5.1-3.89a4.41,4.41,0,0,0-.09-1,.4.4,0,0,0,.1-.06A1.46,1.46,0,0,0,16.67,10ZM7.44,12.79a1.08,1.08,0,1,1,1.08,1.07A1.07,1.07,0,0,1,7.44,12.79ZM12.7,15.11a3.81,3.81,0,0,1-5.32,0,.22.22,0,0,1,.3-.32,3.37,3.37,0,0,0,4.72,0,.22.22,0,0,1,.3.32Zm-.18-1.25a1.08,1.08,0,1,1,1.08-1.07A1.07,1.07,0,0,1,12.52,13.86Z" />
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
    image: "https://scontent-fml20-1.xx.fbcdn.net/v/t1.15752-9/664942261_1217053043841263_140641987614141883_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=103&ccb=1-7&_nc_sid=9f807c&_nc_ohc=-0WEp_t8Sc8Q7kNvwFjOlyy&_nc_oc=AdoSeAxTzL3GY5Dsr9OP5NXiRL1dZcyol3urkp5vyZkjDcjXL9zsutV39VuB6i9SDeY&_nc_zt=23&_nc_ht=scontent-fml20-1.xx&_nc_ss=7a3a8&oh=03_Q7cD5AFHKeSM1Gkd-ZzYNMGOKOiPY1sodvk5UbvCVmes7KI0-w&oe=69FA8D76",
    action: "Upgrade Now"
  },


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
      className="relative w-full max-w-3xl mx-auto mb-6 md:mb-8 rounded-2xl md:rounded-[2rem] overflow-hidden shadow-2xl group cursor-pointer"
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
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] w-full relative aspect-[4/3] sm:aspect-video md:aspect-[21/9] lg:h-64 rounded-2xl overflow-hidden"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {promoSlides.map((slide) => (
          <div key={slide.id} className="min-w-full relative shrink-0 bg-gray-950 flex items-center justify-center overflow-hidden">
            {/* Blurred background layer to fill empty sides */}
            <img
              src={slide.image}
              className="absolute inset-0 w-full h-full object-cover opacity-40 blur-3xl scale-110 pointer-events-none"
              alt=""
            />
            {/* Foreground crisp image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="relative z-10 w-full h-full object-contain object-center pointer-events-none pb-6 md:pb-0 md:p-2"
            />

            <div className="absolute z-20 inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent pointer-events-none" />

            <div className="absolute z-30 inset-x-0 bottom-0 p-3 sm:p-4 md:p-6 flex flex-col justify-end">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg text-[9px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-wider text-white border border-white/30">{slide.badge}</span>
              </div>
              <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-1 drop-shadow-md">{slide.title}</h2>
              <p className="text-gray-200 text-[10px] sm:text-xs font-medium line-clamp-2 max-w-xl mb-2 sm:mb-3 drop-shadow-sm leading-relaxed">{slide.subtitle}</p>
              <div className="flex items-center gap-1.5 sm:gap-2 text-white font-bold text-[11px] sm:text-xs md:text-sm group-hover:gap-3 transition-all">
                {slide.action} <ChevronRight size={14} className="md:w-[16px] md:h-[16px]" />
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
  const { t, lang: selectedLang, setLang: setSelectedLang } = useTranslation();
  const [characters, setCharacters] = useState([]);
  const [user, setUser] = useState(null);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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
  const [isSupportExpanded, setIsSupportExpanded] = useState(false);

  // --- Upgrade & Coins States ---
  const [coinBalance, setCoinBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
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
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'like', text: 'Your character received a new like!', time: '2m ago', read: false },
    { id: 2, type: 'welcome', text: 'Welcome to DreamAI! Start by creating a character.', time: '1h ago', read: false },
    { id: 3, type: 'update', text: 'New features: Video character cards now supported!', time: '3h ago', read: true },
  ]);
  const unreadCount = notifications.filter(n => !n.read).length;
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

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
  const [activePolicy, setActivePolicy] = useState(null);
  const [hasAgreed18, setHasAgreed18] = useState(() => localStorage.getItem('age_verified') === 'true');
  const [bannedError, setBannedError] = useState(null);
  const [guardModal, setGuardModal] = useState({ isOpen: false, reason: '' });
  const showLanding = !user && !authLoading;
  const showCookieBanner = !!user && hasAgreed18 && !isAgeGateOpen;
  const openPolicy = (section = 'terms') => setActivePolicy(section);

  // Automatically throw Age Gate on main page load if haven't agreed and user is logged in
  useEffect(() => {
    if (sessionInfo?.user && !hasAgreed18) {
      setIsAgeGateOpen(true);
    }
  }, [sessionInfo, hasAgreed18]);

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
            setCoinBalance(data.coin_balance ?? 50); // new default is 50 coins
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
      const { data, error } = await supabase.from('characters').select('*, chats(count)');

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
          setCharacters(fallbackCharacters);
        } else {
          const formatted = data.map(c => {
            let parsedTags = [];
            if (typeof c.tags === 'string') {
              try { parsedTags = JSON.parse(c.tags); }
              catch (e) { parsedTags = c.tags.split(',').map(t => t.trim()).filter(Boolean); }
            } else if (Array.isArray(c.tags)) {
              parsedTags = c.tags;
            }

            let chatsCount = undefined;
            if (c.chats && Array.isArray(c.chats) && c.chats.length > 0 && typeof c.chats[0].count === 'number') {
              chatsCount = c.chats[0].count;
            }

            const finalImage = extractFirstImage(c.images) || extractFirstImage(c.image) || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600&h=800";
            return {
              ...c,
              // Keep the original images/image fields so resolveCharacterMedia can find videos
              images: c.images,
              image: finalImage,
              desc: c.public_description || c.persona || c.desc || c.description || "A mysterious character...",
              public_description: c.public_description || null,
              tags: parsedTags,
              chats_started: chatsCount !== undefined ? chatsCount : (c.chats_started !== undefined ? c.chats_started : undefined),
              likes: c.likes !== undefined && c.likes !== null ? c.likes : 0,
              msgs: c.msgs !== undefined && c.msgs !== null ? c.msgs : 0,
              creator: c.username ? (c.username.startsWith('@') ? c.username : `@${c.username}`) : (c.creator || "@unknown"),
              age: c.age || "Unknown",
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
    setAuthLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionInfo(session);
      if (session) {
        setIsAuthOpen(false);
        setAuthMessage("");
        setBannedError(null);
        const metadata = session.user.user_metadata;
        const userAgreed = metadata?.age_verified === true || localStorage.getItem('age_verified') === 'true';
        if (!userAgreed) setIsAgeGateOpen(true);

        // DB is the SINGLE source of truth for username
        supabase.from('users').select('username').eq('uuid', session.user.id).maybeSingle().then(({ data: dbUser }) => {
          if (dbUser?.username) {
            setUser(dbUser.username);
            setShowOnboarding(false);
          } else {
            setUser(metadata?.full_name || session.user.email);
            setShowOnboarding(true);
          }
          setAuthLoading(false);
        });

        const pendingStr = localStorage.getItem('pendingLandingCharacter');
        if (pendingStr) {
          try {
            const pendingData = JSON.parse(pendingStr);
            localStorage.removeItem('pendingLandingCharacter');
            const newChar = {
              id: 'custom_' + Date.now(),
              name: 'My Custom Companion',
              image: pendingData.image,
              desc: `A ${pendingData.personality.toLowerCase()} ${pendingData.gender.toLowerCase()} companion (${pendingData.style}). Appearance: ${pendingData.ethnicity}, ${pendingData.bodyType}.`,
              tags: [pendingData.personality, pendingData.style],
              creator: metadata?.username || '@me',
              msgs: 0,
              likes: 0
            };
            setActiveChatCharacter(newChar);
            setActiveView('Chat');
          } catch (err) {
            console.error("Error parsing", err);
          }
        }
      } else {
        setAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionInfo(session);
      if (session) {
        setIsAuthOpen(false);
        setAuthMessage("");
        setBannedError(null);
        const metadata = session.user.user_metadata;
        const userAgreed = metadata?.age_verified === true || localStorage.getItem('age_verified') === 'true';
        if (!userAgreed) setIsAgeGateOpen(true);

        // DB is the SINGLE source of truth for username
        supabase.from('users').select('username').eq('uuid', session.user.id).maybeSingle().then(({ data: dbUser }) => {
          if (dbUser?.username) {
            setUser(dbUser.username);
            setShowOnboarding(false);
          } else {
            setUser(metadata?.full_name || session.user.email);
            setShowOnboarding(true);
          }
        });

        const pendingStr = localStorage.getItem('pendingLandingCharacter');
        if (pendingStr) {
          try {
            const pendingData = JSON.parse(pendingStr);
            localStorage.removeItem('pendingLandingCharacter');
            const newChar = {
              id: 'custom_' + Date.now(),
              name: 'My Custom Companion',
              image: pendingData.image,
              desc: `A ${pendingData.personality.toLowerCase()} ${pendingData.gender.toLowerCase()} companion (${pendingData.style}). Appearance: ${pendingData.ethnicity}, ${pendingData.bodyType}.`,
              tags: [pendingData.personality, pendingData.style],
              creator: metadata?.username || '@me',
              msgs: 0,
              likes: 0
            };
            setActiveChatCharacter(newChar);
            setActiveView('Chat');
          } catch (err) {
            console.error("Error parsing", err);
          }
        }
      } else {
        setUser(null);
        setIsAgeGateOpen(false);
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
    { icon: Compass, label: "Explore", displayLabel: t('discover'), active: true, accent: false },
    { icon: Drama, label: "Roleplay", displayLabel: "Roleplay", active: false, accent: false },
    { icon: MessageCircle, label: "Chat", displayLabel: t('chat'), active: false, accent: false },
    { icon: Plus, label: "Create", displayLabel: t('create'), active: false, accent: false },
    { icon: Camera, label: "Generate", displayLabel: t('generate'), active: false, accent: false },
    { icon: BookOpen, label: "Story", displayLabel: "Story", active: false, accent: false },
    { icon: Sparkles, label: "My AI", displayLabel: t('myAi'), active: false, accent: false },
    { icon: Users, label: "Community", displayLabel: t('community'), active: false, accent: false },
    { icon: Play, label: "Feed", displayLabel: t('feed'), active: false, accent: false },
  ];

  const bottomItems = [
    { icon: User, label: "Profile", displayLabel: t('profile') },
    { icon: HelpCircle, label: "Support", displayLabel: 'Support' },
    { icon: MoreHorizontal, label: "More", displayLabel: t('more') },
  ];

  const moreMenuItems = [
    { icon: DiscordIcon, label: "Discord", link: import.meta.env.VITE_DISCORD_URL || "https://discord.com", color: "#5865F2" },
    { icon: RedditIcon, label: "Reddit", link: import.meta.env.VITE_REDDIT_URL || "https://reddit.com", color: "#FF4500" },
    { icon: Gift, label: "Invite & Earn", view: "Invite", color: "#A855F7" },
  ];

  const supportMenuItems = [
    { icon: MessageCircle, label: "Gmail Support", link: "mailto:dreamaistudio02@gmail.com", color: "#EA4335" },
    { icon: DiscordIcon, label: "Discord Support", link: import.meta.env.VITE_DISCORD_URL || "https://discord.com", color: "#5865F2" },
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
              label={item.displayLabel || item.label}
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
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl ${isPremium ? 'bg-gray-800 text-purple-300 hover:bg-gray-700' : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-purple-500/40 hover:scale-[1.03] active:scale-95'} font-semibold transition-all duration-300 hover:shadow-lg ${!sidebarOpen ? 'justify-center' : ''}`}
          >
            {isPremium ? <Star size={20} className="flex-shrink-0" /> : <Crown size={20} className="flex-shrink-0" />}
            {sidebarOpen && <span className="text-sm">{isPremium ? 'My Plan' : 'Upgrade Pro'}</span>}
          </button>
        </div>

        <div className="border-t border-purple-900/30 py-3 px-3 space-y-1">
          {bottomItems.map((item) => {
            const isMoreButton = item.label === "More";
            const isSupportButton = item.label === "Support";
            const isExpanded = isMoreButton ? isMoreExpanded : (isSupportButton ? isSupportExpanded : false);
            const useFlyout = (isMoreButton || isSupportButton) && !sidebarOpen;
            const currentMenuItems = isMoreButton ? moreMenuItems : (isSupportButton ? supportMenuItems : []);

            return (
              <div key={item.label} className={`relative ${isMoreButton || isSupportButton ? 'overflow-visible' : ''}`}>
                {(isMoreButton || isSupportButton) && (
                  <div
                    className={`${useFlyout
                      ? `absolute left-full bottom-0 ml-2 w-48 origin-left transition-all duration-250 ${isExpanded ? 'pointer-events-auto translate-x-0 opacity-100 scale-100' : 'pointer-events-none -translate-x-1 opacity-0 scale-95'}`
                      : `absolute left-0 right-0 bottom-full mb-1.5 origin-bottom transition-all duration-250 ${isExpanded ? 'pointer-events-auto translate-y-0 opacity-100 scale-100' : 'pointer-events-none translate-y-1 opacity-0 scale-95'}`
                      }`}
                  >
                    <div>
                      <div className="rounded-2xl border border-white/8 bg-gray-950/96 backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.35)] p-1.5">
                        {currentMenuItems.map((menuItem) => (
                          <button
                            key={menuItem.label}
                            onClick={() => {
                              if (menuItem.link) {
                                window.open(menuItem.link, '_blank', 'noopener,noreferrer');
                              } else if (menuItem.view) {
                                setActiveView(menuItem.view);
                              }
                              setIsMoreExpanded(false);
                              setIsSupportExpanded(false);
                              if (mobile) setMobileSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-200 hover:bg-white/5 hover:text-white transition-all duration-200 group"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-900 group-hover:bg-gray-800 transition-colors">
                              <menuItem.icon size={18} style={{ color: menuItem.color || 'inherit' }} className="flex-shrink-0" />
                            </div>
                            <span className="text-sm font-semibold tracking-tight">{menuItem.label}</span>
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
                      setIsSupportExpanded(false);
                      return;
                    }
                    if (isSupportButton) {
                      setIsSupportExpanded(v => !v);
                      setIsMoreExpanded(false);
                      return;
                    }
                    setIsMoreExpanded(false);
                    setIsSupportExpanded(false);
                    if (item.label === "Profile") setActiveView("Profile");
                    setActiveCreatorProfile(null);
                    if (mobile) setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${(activeView === item.label || (isMoreButton && isMoreExpanded) || (isSupportButton && isSupportExpanded))
                    ? 'bg-purple-900/40 text-purple-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]'
                    : 'text-gray-500 hover:bg-purple-900/20 hover:text-purple-300'
                    }`}
                >
                  <item.icon size={20} className={`flex-shrink-0 transition-transform duration-300 ${(isMoreButton && isMoreExpanded) || (isSupportButton && isSupportExpanded) ? 'rotate-90' : ''}`} />
                  {sidebarOpen && (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="text-sm font-medium">{item.displayLabel || item.label}</span>
                      {(isMoreButton || isSupportButton) && (
                        <ChevronRight
                          size={16}
                          className={`text-purple-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-90'}`}
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
      {/* ═══ SPLASH LOADING SCREEN ═══ */}
      {authLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-950 absolute inset-0 z-[200]">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '2s' }} />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-2xl shadow-purple-500/30" style={{ animation: 'boltPulse 1.5s ease-in-out infinite' }}>
                <Zap size={28} className="text-white" fill="currentColor" />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-black text-lg text-white tracking-tight">Dream</span>
              <span className="font-black text-lg text-purple-400 tracking-tight">AI</span>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-purple-400" style={{ animation: 'dotBounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
          <style>{`
            @keyframes boltPulse {
              0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
              50% { transform: scale(1.1); box-shadow: 0 0 40px rgba(168, 85, 247, 0.6); }
            }
            @keyframes dotBounce {
              0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
              40% { opacity: 1; transform: scale(1.2); }
            }
          `}</style>
        </div>
      ) : showLanding ? (
        <div className="w-full h-full overflow-y-auto z-[45] absolute inset-0 bg-[#0a0a0a]">
          <LandingPage
            onLogin={() => setIsAuthOpen(true)}
            onGetStarted={() => {
              setAuthMessage("Create a free account to interact with characters.");
              setIsAuthOpen(true);
            }}
            onOpenPolicies={openPolicy}
          />
        </div>
      ) : (
        <>
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
                    <div className="relative flex items-center gap-2">

                      {/* Language Selector */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowLangDropdown(v => !v); setShowNotifications(false); setShowProfileDropdown(false); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.06] hover:text-white text-sm font-medium transition-all"
                          aria-label="Change language"
                        >
                          <Globe size={14} className="text-purple-400" />
                          <span className="text-xs">{LANGUAGES.find(l => l.code === selectedLang)?.flag}</span>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{selectedLang}</span>
                          <ChevronDown size={12} className="text-gray-500" />
                        </button>
                        {showLangDropdown && (
                          <>
                            <div className="fixed inset-0 z-[100] cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLangDropdown(false); }} />
                            <div className="fixed left-3 right-3 top-16 z-[101] sm:absolute sm:left-auto sm:top-11 sm:right-0 sm:w-52 max-h-72 overflow-y-auto bg-gray-900 border border-purple-900/40 rounded-2xl shadow-2xl shadow-purple-900/30 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
                              <div className="px-3 py-2.5 border-b border-gray-800">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Language</p>
                              </div>
                              {LANGUAGES.map(lang => (
                                <button
                                  key={lang.code}
                                  onClick={() => { setSelectedLang(lang.code); setShowLangDropdown(false); }}
                                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors ${selectedLang === lang.code ? 'bg-purple-600/20 text-purple-300' : 'text-gray-300 hover:bg-white/[0.05] hover:text-white'}`}
                                >
                                  <span className="text-base">{lang.flag}</span>
                                  <span className="font-medium flex-1 text-left">{lang.label}</span>
                                  {selectedLang === lang.code && <Check size={14} className="text-purple-400" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Notification Bell */}
                      <div className="relative">
                        <button
                          onClick={() => { setShowNotifications(v => !v); setShowLangDropdown(false); setShowProfileDropdown(false); }}
                          className="relative w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center transition-all"
                          aria-label="Notifications"
                        >
                          <Bell size={18} className="text-gray-300" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-gray-950 flex items-center justify-center text-[10px] font-black text-white animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </button>
                        {showNotifications && (
                          <>
                            <div className="fixed inset-0 z-[100] cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNotifications(false); }} />
                            <div className="fixed left-3 right-3 top-16 z-[101] sm:absolute sm:left-auto sm:top-12 sm:right-0 sm:w-80 bg-gray-900 border border-purple-900/40 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  <Bell size={14} className="text-purple-400" />
                                  {t('notifications')}
                                </h3>
                                {unreadCount > 0 && (
                                  <button onClick={markAllRead} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-wider">
                                    {t('markAllRead')}
                                  </button>
                                )}
                              </div>
                              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                {notifications.length === 0 ? (
                                  <div className="py-10 text-center text-gray-500 text-sm">No notifications yet</div>
                                ) : (
                                  notifications.map(notif => (
                                    <div
                                      key={notif.id}
                                      className={`px-4 py-3 border-b border-gray-800/50 flex items-start gap-3 transition-colors hover:bg-white/[0.02] ${!notif.read ? 'bg-purple-900/10' : ''}`}
                                    >
                                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!notif.read ? 'bg-purple-400' : 'bg-gray-700'}`} />
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-sm leading-snug ${!notif.read ? 'text-white font-medium' : 'text-gray-400'}`}>{notif.text}</p>
                                        <p className="text-[10px] text-gray-600 mt-1 font-medium">{notif.time}</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="relative">
                        {/* Profile icon — tappable, opens dropdown */}
                        <button
                          onClick={() => { setShowProfileDropdown(v => !v); setShowNotifications(false); setShowLangDropdown(false); }}
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
                            <div className="fixed inset-0 z-[100] cursor-default" style={{ WebkitTapHighlightColor: 'transparent' }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowProfileDropdown(false); }} />
                            <div className="absolute right-0 top-12 z-[101] w-64 bg-gray-900 border border-purple-900/40 rounded-2xl shadow-2xl shadow-purple-900/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {sessionInfo?.user?.email && (
                                        <p className="text-gray-500 text-xs truncate max-w-[120px]">{sessionInfo.user.email}</p>
                                      )}
                                      <div className="flex items-center gap-1 px-1.5 py-[2px] rounded bg-purple-500/10 border border-purple-500/20 shrink-0" title="Bolt Tokens">
                                        <Zap size={10} className="text-purple-400 fill-purple-400/50" />
                                        <span className="text-[10px] font-bold text-purple-400 truncate tracking-wide">{isPremium ? '∞' : coinBalance}</span>
                                      </div>
                                    </div>
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
                                  {t('profile')}
                                </button>
                                <button
                                  onClick={() => { setIsLightTheme(!isLightTheme); setShowProfileDropdown(false); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-medium"
                                >
                                  {isLightTheme ? <Moon size={16} className="text-purple-400" /> : <Sun size={16} className="text-purple-400" />}
                                  {isLightTheme ? t('darkTheme') : t('whiteTheme')}
                                </button>
                                <button
                                  onClick={() => { setShowUpgradeModal(true); setShowProfileDropdown(false); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-amber-300 hover:text-amber-100 hover:bg-amber-900/30 transition-colors text-sm font-bold"
                                >
                                  <Zap size={16} className="text-amber-400" />
                                  {t('upgradeCoins')}
                                </button>
                                <button
                                  onClick={() => { setActiveView('Profile'); setShowProfileDropdown(false); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-purple-900/30 transition-colors text-sm font-medium"
                                >
                                  <MoreHorizontal size={16} className="text-purple-400" />
                                  {t('settingsMore')}
                                </button>
                                <button
                                  onClick={() => { setIsAgeGateOpen(true); setShowProfileDropdown(false); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-white hover:bg-red-900/30 transition-colors text-sm font-medium border-t border-gray-800"
                                >
                                  <Shield size={16} className="text-red-400" />
                                  {t('termsPolicies')}
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
                        <span className="relative z-10">{t('joinFree')}</span>
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
                  coinBalance={coinBalance}
                  onBurnCoin={handleBurnCoin}
                  onRequireUpgrade={() => setShowUpgradeModal(true)}
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
                  onReadTerms={openPolicy}
                  onGuard={handleGuardTrigger}
                  coinBalance={coinBalance}
                  selectedLang={selectedLang}
                  setSelectedLang={setSelectedLang}
                />
              ) : activeView === "Chat" ? (
                <ChatView
                  onNavigateToExplore={() => setActiveView("Explore")}
                  onNavigateToCreateGroup={() => setActiveView("CreateGroupChat")}
                  character={activeChatCharacter}
                  onBackToList={() => setActiveChatCharacter(null)}
                  onSelectCharacter={(c) => setActiveChatCharacter(c)}
                  onNavigateToExplore={() => setActiveView("Explore")}
                  onNavigateToCreateGroup={() => setActiveView("CreateGroupChat")}
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
              ) : activeView === "Roleplay" ? (
                <Roleplay />
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
              ) : activeView === "Story" ? (
                <StoryGenerator
                  sessionInfo={sessionInfo}
                  isPremium={isPremium}
                  onRequireUpgrade={() => setShowUpgradeModal(true)}
                  user={user}
                  onRequireLogin={() => {
                    setAuthMessage("Sign in to unlock story generation!");
                    setIsAuthOpen(true);
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

                  <div className={`relative max-w-2xl mx-auto mb-4 flex gap-2 sm:gap-3 transition-all duration-300 ${searchFocused ? 'scale-[1.02]' : ''}`}>
                    <div className="relative flex-1">
                      <Search
                        size={20}
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${searchFocused ? 'text-purple-400' : 'text-gray-500'}`}
                      />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search characters, creators, or tags..."
                        className="w-full pl-11 sm:pl-12 pr-4 sm:pr-14 py-3.5 bg-gray-900/80 border border-purple-900/40 rounded-xl sm:rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:shadow-lg focus:shadow-purple-500/20 transition-all duration-300 text-sm"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:block">
                        <kbd className="px-2 py-1 text-[10px] sm:text-xs text-gray-500 bg-gray-800 rounded-lg border border-gray-700">⌘K</kbd>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsFilterOpen(true)}
                      className="relative shrink-0 flex items-center justify-center w-[52px] sm:w-auto sm:px-5 bg-gray-900/80 border border-purple-900/40 rounded-xl sm:rounded-2xl hover:bg-purple-900/40 hover:border-purple-400 transition-colors group shadow-sm"
                    >
                      <Filter size={18} className="text-purple-400/80 group-hover:text-purple-300 transition-colors" />
                      <span className="hidden sm:inline text-gray-300 font-medium text-sm ml-2 group-hover:text-white transition-colors">{t('filters')}</span>
                      {(selectedTags.length > 0 || filterGender !== "All" || filterStyle !== "All" || filterNsfw || sortBy !== "Trending") && (
                        <span className="absolute top-2 right-2 sm:static sm:ml-2 bg-pink-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-[0_0_8px_rgba(236,72,153,0.8)] leading-none">
                          {selectedTags.length + (filterGender !== "All" ? 1 : 0) + (filterStyle !== "All" ? 1 : 0) + (filterNsfw ? 1 : 0) + (sortBy !== "Trending" ? 1 : 0)}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Display active filter chips if any */}
                  {(filterGender !== "All" || filterStyle !== "All" || filterNsfw || selectedTags.length > 0) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                      {filterGender !== "All" && <span className="px-2.5 py-1 bg-purple-900/40 border border-purple-500/30 text-purple-300 text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1">{filterGender}</span>}
                      {filterStyle !== "All" && <span className="px-2.5 py-1 bg-blue-900/40 border border-blue-500/30 text-blue-300 text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1">{filterStyle}</span>}
                      {filterNsfw && <span className="px-2.5 py-1 bg-red-900/40 border border-red-500/30 text-red-300 text-[11px] sm:text-xs font-semibold rounded-lg flex items-center gap-1">NSFW</span>}
                      {selectedTags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-gray-800 border border-gray-600 text-gray-300 text-[11px] sm:text-xs font-medium rounded-lg">{tag}</span>
                      ))}
                      {selectedTags.length > 3 && <span className="px-2.5 py-1 bg-gray-800 text-gray-400 text-[11px] sm:text-xs font-medium rounded-lg">+{selectedTags.length - 3}</span>}
                    </div>
                  )}

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
                          {t(cat.toLowerCase()) || cat}
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
                        {/* Skeleton loading cards while characters fetch from DB */}
                        {loading && characters.length === 0 && [...Array(8)].map((_, i) => (
                          <div key={`skel-${i}`} className="rounded-2xl bg-gray-900/80 border border-gray-800/50 overflow-hidden" style={{ animation: `fadeSlideUp 0.3s ease-out ${i * 60}ms both` }}>
                            <div className="aspect-[3/4] bg-gray-800/50 relative overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/20 to-transparent" style={{ animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
                            </div>
                            <div className="p-3 space-y-2.5">
                              <div className="h-4 w-3/4 bg-gray-800/60 rounded-lg" />
                              <div className="h-3 w-full bg-gray-800/40 rounded-lg" />
                              <div className="h-3 w-1/2 bg-gray-800/40 rounded-lg" />
                              <div className="flex gap-2 pt-1">
                                <div className="h-5 w-14 bg-gray-800/50 rounded-md" />
                                <div className="h-5 w-14 bg-gray-800/50 rounded-md" />
                              </div>
                            </div>
                          </div>
                        ))}
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
                { icon: Compass, label: "Explore", displayLabel: t('discover'), active: activeView === "Explore" },
                { icon: MessageCircle, label: "Chat", displayLabel: t('chat'), active: activeView === "Chat" },
                { icon: Plus, label: "Create", displayLabel: t('create'), active: activeView === "Create" },
                { icon: Camera, label: "Generate", displayLabel: t('generate'), active: activeView === "Generate" },
                { icon: Sparkles, label: "My AI", displayLabel: t('myAi'), active: activeView === "My AI" },
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
                    {item.displayLabel || item.label}
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
                  <MediaFrame
                    imageUrl={resolveCharacterMedia(previewCharacter).stillImage || previewCharacter.image}
                    motionUrl={resolveCharacterMedia(previewCharacter).motionPreview || previewCharacter.motionPreview}
                    alt={previewCharacter.name}
                    className="w-full h-full object-cover scale-105"
                  />
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
                        <MediaFrame
                          imageUrl={resolveCharacterMedia(previewCharacter).stillImage || previewCharacter.image}
                          motionUrl={resolveCharacterMedia(previewCharacter).motionPreview || previewCharacter.motionPreview}
                          alt={previewCharacter.name}
                          className="relative w-20 h-20 rounded-full object-cover border-4 border-gray-950 shadow-xl"
                        />
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
                  <div className="px-6 pb-8 pt-6">
                    {/* About / Persona — shows AI-generated public description when available */}
                    <div className="mb-6">
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                        {previewCharacter.public_description ? `About ${previewCharacter.name}` : 'Persona'}
                      </h4>
                      <div>
                        <p className="text-gray-200 text-base leading-relaxed">
                          {previewCharacter.public_description || previewCharacter.desc || previewCharacter.persona || 'A mysterious companion waiting to meet you...'}
                        </p>
                      </div>
                    </div>

                    {/* Personality Traits */}
                    {(previewCharacter.tags || []).length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Personality Traits</h4>
                        <div className="flex flex-wrap gap-2">
                          {(previewCharacter.tags || []).map((tag, i) => (
                            <span key={i} className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-xl bg-gradient-to-r from-gray-800 to-gray-800 border border-gray-700 text-gray-300">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex gap-8 mb-8">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Heart size={14} className="text-gray-500" />
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Likes</p>
                        </div>
                        <p className="text-gray-300 text-base font-bold">{previewCharacter.likes || '0'}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MessageSquare size={14} className="text-gray-500" />
                          <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider">Chats Started</p>
                        </div>
                        <p className="text-gray-300 text-base font-bold">{previewCharacter.chats_started !== undefined ? previewCharacter.chats_started : (previewCharacter.msgs || '0')}</p>
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

        </>
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

      {showOnboarding && sessionInfo && (
        <OnboardingModal
          session={sessionInfo}
          onComplete={(updates) => {
            setUser(updates.username);
            setShowOnboarding(false);
            setForceRefresh(p => p + 1);
          }}
        />
      )}

      {
        showLogoutConfirm && (
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
        )
      }

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
        }}
        onCoinsAdded={(newBalance) => {
          setCoinBalance(newBalance);
        }}
      />

      <PolicyModal
        isOpen={!!activePolicy}
        initialSection={activePolicy || 'terms'}
        onClose={() => setActivePolicy(null)}
      />

      <AgeGateModal
        isOpen={isAgeGateOpen}
        onOpenPolicy={openPolicy}
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
      {showCookieBanner && <CookieBanner onReadPolicy={() => openPolicy("cookies")} />}
    </div >
  );
}
