import React, { useState } from 'react';
import { Heart, MessageSquare, ChevronLeft, ChevronRight, Lock } from 'lucide-react';

export default function CharacterCard({ character, index, onClick, onLike, onCreatorClick, isLiked = false, isBlurred = false, onUnblurClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // ── Parse image list ──────────────────────────────────────────────────────
  let imageList = [];
  try {
    const rawImages = character.images || character.image;
    if (Array.isArray(rawImages)) {
      imageList = rawImages;
    } else if (typeof rawImages === 'string') {
      if (rawImages.startsWith('[') || rawImages.startsWith('{')) {
        imageList = JSON.parse(rawImages);
        if (!Array.isArray(imageList)) imageList = [rawImages];
      } else {
        imageList = rawImages.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  } catch {
    imageList = [character.images || character.image];
  }
  if (!imageList || imageList.length === 0)
    imageList = ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800'];

  const currentImage = imageList[currentImageIndex] || imageList[0];

  const handlePrevImage = (e) => { e.stopPropagation(); e.preventDefault(); setCurrentImageIndex(p => (p === 0 ? imageList.length - 1 : p - 1)); };
  const handleNextImage = (e) => { e.stopPropagation(); e.preventDefault(); setCurrentImageIndex(p => (p === imageList.length - 1 ? 0 : p + 1)); };
  const handleLikeClick = (e) => { e.stopPropagation(); e.preventDefault(); if (onLike) onLike(character.id, character.likes); };
  const handleCreatorClick = (e) => { e.stopPropagation(); e.preventDefault(); if (onCreatorClick) onCreatorClick(character.creator); };

  // ── Format counts (1234 → 1.2k) ─────────────────────────────────────────
  const fmtCount = (n) => {
    if (n === undefined || n === null) return '0';
    const num = typeof n === 'string'
      ? parseFloat(n.replace(/,/g, '').replace(/k$/i, '000').replace(/m$/i, '000000'))
      : n;
    if (isNaN(num)) return n;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'k';
    return String(num);
  };

  const creatorHandle = character.creator
    ? (character.creator.startsWith('@') ? character.creator : `@${character.creator}`)
    : '@unknown';

  return (
    <div
      onClick={(e) => {
        if (isBlurred) { e.stopPropagation(); if (onUnblurClick) onUnblurClick(); }
        else onClick(e);
      }}
      className="avoid-invert relative overflow-hidden cursor-pointer group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: '12px',
        aspectRatio: '2/3',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* ── Main image ────────────────────────────────────────────────────── */}
      <img
        src={currentImage}
        alt={character.name}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out ${isBlurred ? 'blur-xl scale-125' : 'group-hover:scale-105'}`}
      />

      {/* ── Blur overlay for NSFW ──────────────────────────────────────────── */}
      {isBlurred && (
        <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-sm pointer-events-none" />
      )}

      {/* ── Deep gradient for text readability ────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 75%)' }}
      />

      {/* ── Multi-image dots ─────────────────────────────────────────────── */}
      {imageList.length > 1 && !isBlurred && (
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 z-20">
          {imageList.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}

      {/* ── Image nav arrows ─────────────────────────────────────────────── */}
      {imageList.length > 1 && !isBlurred && isHovered && (
        <>
          <button onClick={handlePrevImage} className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white z-30 active:scale-90">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextImage} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white z-30 active:scale-90">
            <ChevronRight size={16} />
          </button>
        </>
      )}

      {/* ── Online dot ───────────────────────────────────────────────────── */}
      <div className="absolute top-2.5 left-2.5 z-20">
        <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.9)] animate-pulse" />
      </div>

      {/* ── Hover / NSFW unlock overlay ─────────────────────────────────── */}
      {isBlurred && isHovered && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="bg-purple-600/90 backdrop-blur-md rounded-full px-5 py-2 shadow-[0_0_20px_rgba(147,51,234,0.6)] flex items-center gap-2"
            onClick={(e) => { e.stopPropagation(); if (onUnblurClick) onUnblurClick(); }}
          >
            <Lock size={14} className="text-white" />
            <span className="text-white font-bold text-sm">Sign in to view</span>
          </div>
        </div>
      )}

      {/* ── Bottom content ────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6 z-30">

        {/* Name + Age */}
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <h3 className="text-white font-black leading-tight drop-shadow-lg" style={{ fontSize: 'clamp(13px, 3.5vw, 17px)' }}>
            {character.name}
          </h3>
          <span className="text-white/70 font-semibold flex-shrink-0" style={{ fontSize: 'clamp(11px, 2.8vw, 14px)' }}>
            {character.age}
          </span>
        </div>

        {/* Description */}
        <p
          className="text-white/75 leading-snug mb-2 drop-shadow-md"
          style={{
            fontSize: 'clamp(10px, 2.5vw, 12px)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {character.desc}
        </p>

        {/* Stats row — stopPropagation so clicks don't open modal */}
        <div
          className="flex items-center gap-3 pt-1.5 border-t border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Like */}
          <button
            onClick={handleLikeClick}
            className={`flex items-center gap-1 transition-all active:scale-125 min-h-[32px] ${isLiked ? 'text-pink-400' : 'text-pink-300/80 hover:text-pink-400'}`}
          >
            <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={isLiked ? 0 : 1.8} />
            <span className="font-semibold drop-shadow-sm" style={{ fontSize: '10px' }}>{fmtCount(character.likes)}</span>
          </button>

          {/* Messages */}
          <span className="flex items-center gap-1 text-white/50">
            <MessageSquare size={12} strokeWidth={1.8} />
            <span className="font-semibold" style={{ fontSize: '10px' }}>{fmtCount(character.msgs)}</span>
          </span>

          {/* Creator */}
          <button
            onClick={handleCreatorClick}
            className="ml-auto text-white/40 hover:text-purple-300 transition-colors truncate min-h-[32px] flex items-center"
            style={{ fontSize: '10px', maxWidth: '60px' }}
          >
            {creatorHandle.length > 8 ? creatorHandle.slice(0, 8) + '…' : creatorHandle}
          </button>
        </div>
      </div>
    </div>
  );
}
