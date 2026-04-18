export const FALLBACK_MEDIA_IMAGE = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|mov|m4v)([?#].*)?$/i;
const GIF_EXT_RE = /\.(gif|webp)([?#].*)?$/i;

export function parseUrlList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.flatMap(parseUrlList);
    if (typeof value !== 'string') return [];

    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed.flatMap(parseUrlList) : [trimmed];
        } catch {
            return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }

    return trimmed.split(',').map((item) => item.trim()).filter(Boolean);
}

export function isVideoUrl(url = '') {
    return VIDEO_EXT_RE.test(url);
}

export function isAnimatedUrl(url = '') {
    return GIF_EXT_RE.test(url);
}

export function extractFirstStill(value) {
    return parseUrlList(value).find((url) => url && !isVideoUrl(url) && !isAnimatedUrl(url)) || null;
}

export function resolveCharacterMedia(character = {}) {
    const stillCandidates = [];
    const motionCandidates = [];

    const stillPrioritySources = [
        character.poster,
        character.poster_url,
        character.posterUrl,
        character.thumbnail,
        character.thumbnail_url,
        character.thumbnailUrl,
        character.preview_image,
        character.previewImage,
        character.cover_image,
        character.coverImage
    ];

    const motionPrioritySources = [
        character.preview_video,
        character.previewVideo,
        character.video_url,
        character.videoUrl,
        character.video,
        character.videos,
        character.gif,
        character.preview_gif,
        character.motion_preview,
        character.motionPreview,
        character.media,
        character.media_url
    ];

    [...stillPrioritySources, ...motionPrioritySources, character.images, character.image].forEach((source) => {
        parseUrlList(source).forEach((url) => {
            if (isVideoUrl(url) || isAnimatedUrl(url)) motionCandidates.push(url);
            else stillCandidates.push(url);
        });
    });

    const stillList = [...new Set(stillCandidates.filter(Boolean))];
    const motionList = [...new Set(motionCandidates.filter(Boolean))];

    return {
        stillList,
        motionList,
        stillImage: stillList[0] || null,
        motionPreview: motionList[0] || null
    };
}
