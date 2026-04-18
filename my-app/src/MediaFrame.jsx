import React, { useEffect, useRef, useState } from 'react';
import { FALLBACK_MEDIA_IMAGE, isAnimatedUrl, isVideoUrl } from './mediaUtils';

export default function MediaFrame({
    imageUrl,
    motionUrl,
    alt = '',
    className = '',
    play = false,
    muted = true,
    loop = true,
    preload = 'metadata',
    onPosterReady,
}) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const videoSource = motionUrl && isVideoUrl(motionUrl) ? motionUrl : null;
    const imageSource = imageUrl || (!videoSource ? motionUrl : null) || FALLBACK_MEDIA_IMAGE;
    const [videoPoster, setVideoPoster] = useState(null);

    // Capture the first frame of the video as a still image
    useEffect(() => {
        if (!videoSource) return;
        const tempVideo = document.createElement('video');
        tempVideo.crossOrigin = 'anonymous';
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.preload = 'auto';
        tempVideo.src = videoSource;

        const handleSeek = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = tempVideo.videoWidth || 320;
                canvas.height = tempVideo.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                if (dataUrl && dataUrl.length > 100) {
                    setVideoPoster(dataUrl);
                    if (onPosterReady) onPosterReady(dataUrl);
                }
            } catch (e) {
                // CORS or other error — no poster
            }
            tempVideo.removeEventListener('seeked', handleSeek);
            tempVideo.src = '';
            tempVideo.load();
        };

        const handleLoaded = () => {
            tempVideo.currentTime = 0.1;
        };

        tempVideo.addEventListener('loadeddata', handleLoaded);
        tempVideo.addEventListener('seeked', handleSeek);
        tempVideo.load();

        return () => {
            tempVideo.removeEventListener('loadeddata', handleLoaded);
            tempVideo.removeEventListener('seeked', handleSeek);
            tempVideo.src = '';
        };
    }, [videoSource]);

    // Play / pause control
    useEffect(() => {
        const videoEl = videoRef.current;
        if (!videoEl) return;

        if (play) {
            videoEl.style.opacity = '1';
            const playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => { });
            }
            return;
        }

        videoEl.pause();
        try {
            if (videoEl.readyState >= 2) {
                videoEl.currentTime = Math.min(0.05, videoEl.duration || 0.05);
            }
        } catch { }
    }, [play, videoSource]);

    // Has a video? Always render video element
    if (videoSource) {
        // Determine the best poster: captured frame > valid imageUrl > fallback
        const validImageUrl = imageUrl && !isVideoUrl(imageUrl) ? imageUrl : null;
        const posterImage = videoPoster || validImageUrl || FALLBACK_MEDIA_IMAGE;

        return (
            <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
                {/* Still image underneath — visible while video loads */}
                <img
                    src={posterImage}
                    alt={alt}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
                />
                {/* Video element — always visible, paused at first frame when not playing */}
                <video
                    ref={videoRef}
                    src={videoSource}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        zIndex: 1,
                        opacity: 1,
                    }}
                    muted={muted}
                    loop={loop}
                    playsInline
                    preload={preload}
                    onLoadedData={(event) => {
                        if (!play) {
                            event.currentTarget.pause();
                            try {
                                event.currentTarget.currentTime = Math.min(0.05, event.currentTarget.duration || 0.05);
                            } catch { }
                        }
                    }}
                />
            </div>
        );
    }

    // Animated gif / webp
    if (motionUrl && isAnimatedUrl(motionUrl)) {
        return <img src={motionUrl} alt={alt} className={className} />;
    }

    // Plain still image
    return <img src={imageSource} alt={alt} className={className} />;
}
