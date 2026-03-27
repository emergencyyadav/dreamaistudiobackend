/**
 * imageSearch.js
 * ──────────────
 * Calls the local image proxy server (imageproxy.mjs) to search
 * Cloudinary for the best image matching the character's traits.
 *
 * The proxy runs on http://localhost:4000 and keeps Cloudinary
 * credentials safe on the server side.
 */

import { buildBackendUrl, hasBackend } from './backendApi';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600&h=800';

/**
 * Searches Cloudinary (via local proxy) for the best matching image.
 * @param {string[]} tags     - Character trait tags (lowercase)
 * @param {string}   fallback - Fallback URL if no match found
 * @returns {Promise<string>} - The winning image URL
 */
export async function findBestMatchingImage(tags, fallback = FALLBACK_IMAGE) {
    if (!tags || tags.length === 0) return fallback;
    if (!hasBackend) return fallback;

    try {
        const response = await fetch(buildBackendUrl('/api/images/search'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags }),
        });

        if (!response.ok) {
            console.warn('[imageSearch] Proxy returned error:', response.status);
            return fallback;
        }

        const { url } = await response.json();

        if (!url) {
            console.warn('[imageSearch] No matching image found for tags:', tags);
            return fallback;
        }

        console.log('[imageSearch] ✅ Image matched:', url);
        return url;

    } catch (err) {
        console.warn('[imageSearch] Backend image search unavailable, using fallback. Error:', err.message);
        return fallback;
    }
}

/**
 * Builds a lowercase tag array from all character creation fields.
 * These tags are sent to the proxy which uses them to query Cloudinary.
 */
export function buildCharacterTags({
    gender,
    style,
    ethnicity,
    skinTone,
    eyeColor,
    hairColor,
    hairStyle,
    bodyType,
    breastSize,
    buttSize,
    personality,
    occupation,
    relationship,
    fetish,
    hobby,
    voice,
} = {}) {
    const tags = [];

    const add = (val) => {
        if (val && val !== 'None' && val !== 'Custom') {
            tags.push(val.toLowerCase().trim());
        }
    };

    // Priority tags first (most images will be tagged with these)
    add(gender);       // female / male / trans
    add(style);        // realistic / anime
    add(ethnicity);    // black / asian / white / latina ...
    add(bodyType);     // slim / curvy / athletic ...
    add(hairStyle);    // long / braided / short ...
    add(hairColor);    // black / blonde / red ...
    add(eyeColor);     // blue / brown / green ...
    add(personality);  // sweet / tsundere / dominant ...
    add(occupation);   // nurse / student / model ...
    add(fetish);       // vanilla / roleplay ...
    add(hobby);        // gaming / art ...
    add(relationship); // lover / stranger ...
    add(voice);        // honey / asmr ...

    // Breast / butt size as composite tags
    if (breastSize && breastSize !== 'None') add(`breast_${breastSize.toLowerCase()}`);
    if (buttSize && buttSize !== 'None') add(`butt_${buttSize.toLowerCase()}`);

    // Drop duplicates
    return [...new Set(tags)];
}
