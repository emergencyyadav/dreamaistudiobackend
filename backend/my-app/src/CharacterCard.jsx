import React, { useMemo, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Heart, Lock, MessageSquare, Pause, Play } from 'lucide-react';
import MediaFrame from './MediaFrame';
import { FALLBACK_MEDIA_IMAGE, resolveCharacterMedia } from './mediaUtils';

export default function CharacterCard({
  character,
  index,
  onClick,
  onLike,
  onCreatorClick,
  isLiked = false,
  isBlurred = false,
  onUnblurClick
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMotionPinned, setIsMotionPinned] = useState(false);
  const [videoPosterUrl, setVideoPosterUrl] = useState(null);

  const { stillList, stillImage, motionPreview } = useMemo(() => resolveCharacterMedia(character), [character]);
  const imageList = stillList.length ? stillList : [FALLBACK_MEDIA_IMAGE];
  const currentImage = imageList[currentImageIndex] || imageList[0] || FALLBACK_MEDIA_IMAGE;
  const canPreviewMotion = !!motionPreview && !isBlurred;
  const motionIsVideo = canPreviewMotion && /\.(mp4|webm|ogg|mov|m4v)([?#].*)?$/i.test(motionPreview);
  const showMotionPreview = canPreviewMotion && (isHovered || isMotionPinned);

  // Use the captured video poster as the display image when available
  const displayStillImage = videoPosterUrl || stillImage || null;

  const handlePrevImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onLike) onLike(character.id, character.likes);
  };

  const handleCreatorClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (onCreatorClick) onCreatorClick(character.creator);
  };

  const handleMotionToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!canPreviewMotion) return;
    setIsMotionPinned((prev) => !prev);
  };

  // Touch handler: tap to toggle video on mobile
  const handleCardTouch = useCallback((e) => {
    if (!canPreviewMotion || isBlurred) return;
    // Don't interfere with button taps
    if (e.target.closest('button')) return;
    setIsMotionPinned((prev) => !prev);
  }, [canPreviewMotion, isBlurred]);

  // Capture the video poster (first frame) for use as still image
  const handlePosterReady = useCallback((dataUrl) => {
    setVideoPosterUrl(dataUrl);
    // Mutate the character object so the generic poster can be passed to ChatView
    character.capturedPoster = dataUrl;
  }, [character]);

  const fmtCount = (n) => {
    if (n === undefined || n === null) return '0';
    const num = typeof n === 'string'
      ? parseFloat(n.replace(/,/g, '').replace(/k$/i, '000').replace(/m$/i, '000000'))
      : n;
    if (isNaN(num)) return n;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
    return String(num);
  };

  const creatorHandle = character.creator
    ? (character.creator.startsWith('@') ? character.creator : `@${character.creator}`)
    : '@unknown';

  return (
    <div
      onClick={(e) => {
        if (isBlurred) {
          e.stopPropagation();
          if (onUnblurClick) onUnblurClick();
          return;
        }
        onClick(e);
      }}
      className="avoid-invert relative cursor-pointer overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsMotionPinned(false);
      }}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onTouchCancel={() => setIsHovered(false)}
      style={{
        borderRadius: '12px',
        aspectRatio: '2/3',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}
    >
      {/* Single MediaFrame: shows poster when paused, plays video when toggled */}
      <MediaFrame
        imageUrl={displayStillImage || currentImage}
        motionUrl={motionPreview}
        alt={character.name}
        play={showMotionPreview}
        preload="metadata"
        onPosterReady={handlePosterReady}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out ${isBlurred ? 'scale-125 blur-xl' : 'group-hover:scale-105'}`}
      />

      {isBlurred && (
        <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-sm pointer-events-none" />
      )}

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0) 75%)' }}
      />

      {imageList.length > 1 && !isBlurred && (
        <div className="absolute left-1/2 top-2.5 z-20 flex -translate-x-1/2 items-center gap-1">
          {imageList.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      )}

      {imageList.length > 1 && !isBlurred && isHovered && (
        <>
          <button onClick={handlePrevImage} className="absolute left-1.5 top-1/2 z-30 rounded-full bg-black/50 p-1 text-white -translate-y-1/2 active:scale-90">
            <ChevronLeft size={16} />
          </button>
          <button onClick={handleNextImage} className="absolute right-1.5 top-1/2 z-30 rounded-full bg-black/50 p-1 text-white -translate-y-1/2 active:scale-90">
            <ChevronRight size={16} />
          </button>
        </>
      )}


      {canPreviewMotion && (
        <button
          onClick={handleMotionToggle}
          className="absolute right-2.5 top-2.5 z-20 flex items-center gap-1 rounded-full border border-white/10 bg-black/45 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md transition-colors hover:bg-black/60"
          aria-label={showMotionPreview ? 'Pause motion preview' : 'Play motion preview'}
        >
          {showMotionPreview ? <Pause size={12} /> : <Play size={12} fill="currentColor" />}
          <span>{motionIsVideo ? 'Video' : 'GIF'}</span>
        </button>
      )}

      {isBlurred && isHovered && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div
            className="flex items-center gap-2 rounded-full bg-purple-600/90 px-5 py-2 shadow-[0_0_20px_rgba(147,51,234,0.6)] backdrop-blur-md"
            onClick={(e) => {
              e.stopPropagation();
              if (onUnblurClick) onUnblurClick();
            }}
          >
            <Lock size={14} className="text-white" />
            <span className="text-sm font-bold text-white">Sign in to view</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-30 px-2.5 pb-2.5 pt-6 cursor-pointer" onClick={(e) => { e.stopPropagation(); if (!isBlurred) onClick(e); }}>
        <div className="mb-0.5 flex items-baseline gap-1.5">
          <h3 className="font-black leading-tight text-white drop-shadow-lg" style={{ fontSize: 'clamp(13px, 3.5vw, 17px)' }}>
            {character.name}
          </h3>
          <span className="flex-shrink-0 font-semibold text-white/70" style={{ fontSize: 'clamp(11px, 2.8vw, 14px)' }}>
            {character.age}
          </span>
        </div>

        <p
          className="mb-2 leading-snug text-white/75 drop-shadow-md"
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

        <div
          className="flex items-center gap-3 border-t border-white/10 pt-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleLikeClick}
            className={`flex min-h-[32px] items-center gap-1 transition-all active:scale-125 ${isLiked ? 'text-pink-400' : 'text-pink-300/80 hover:text-pink-400'}`}
          >
            <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} strokeWidth={isLiked ? 0 : 1.8} />
            <span className="font-semibold drop-shadow-sm" style={{ fontSize: '10px' }}>{fmtCount(character.likes)}</span>
          </button>

          <span className="flex items-center gap-1 text-white/50" title="Chats started by users">
            <MessageSquare size={12} strokeWidth={1.8} />
            <span className="font-semibold" style={{ fontSize: '10px' }}>{fmtCount(character.chats_started !== undefined ? character.chats_started : character.msgs)}</span>
          </span>

          <button
            onClick={handleCreatorClick}
            className="ml-auto flex min-h-[32px] items-center truncate text-white/40 transition-colors hover:text-purple-300"
            style={{ fontSize: '10px', maxWidth: '60px' }}
          >
            {creatorHandle.length > 8 ? `${creatorHandle.slice(0, 8)}…` : creatorHandle}
          </button>
        </div>
      </div>
    </div>
  );
}
