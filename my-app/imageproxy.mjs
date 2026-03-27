/**
 * imageproxy.mjs
 * ──────────────
 * Lightweight local proxy server that accepts character tags from the
 * frontend and searches Cloudinary for the best matching image.
 *
 * Run with:  node imageproxy.mjs
 * Or via:    npm run imageproxy
 *
 * Endpoint:
 *   POST http://localhost:4000/search-image
 *   Body: { "tags": ["female", "realistic", "slim", "black"] }
 *   Returns: { "url": "https://res.cloudinary.com/..." }
 */

import { v2 as cloudinary } from 'cloudinary';
import { createServer } from 'http';

// ── Cloudinary credentials ──────────────────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const PORT = 4000;

// ── Request handler ─────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
    // CORS headers — allow requests from Vite dev server
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/search-image') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const { tags } = JSON.parse(body);

                if (!tags || !Array.isArray(tags) || tags.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'tags array is required' }));
                    return;
                }

                // Build an expression that matches images having ALL provided tags
                // Falls back to ANY tag if nothing found with all tags
                const normalisedTags = tags.map(t => t.toLowerCase().trim()).filter(Boolean);

                console.log('[imageproxy] Searching Cloudinary for tags:', normalisedTags);

                // Try most-specific search first (all tags), then progressively relax
                let imageUrl = null;
                const [primaryTag, ...secondaryTags] = normalisedTags;

                // Strategy: search with the most important tags (gender + style + ethnicity = first 3)
                const priorityTags = normalisedTags.slice(0, 4);
                const expression = priorityTags.map(t => `tags=${t}`).join(' AND ');

                try {
                    const result = await cloudinary.search
                        .expression(expression)
                        .max_results(50)
                        .execute();

                    const images = result.resources || [];
                    console.log(`[imageproxy] Found ${images.length} images for expression: ${expression}`);

                    if (images.length > 0) {
                        // Score remaining tags
                        let bestScore = -1;
                        let bestUrl = null;

                        for (const img of images) {
                            const imgTags = (img.tags || []).map(t => t.toLowerCase());
                            let score = 0;
                            for (const tag of normalisedTags) {
                                if (imgTags.includes(tag)) score++;
                            }
                            if (score > bestScore) {
                                bestScore = score;
                                bestUrl = img.secure_url;
                            }
                        }
                        imageUrl = bestUrl;
                    }
                } catch (searchErr) {
                    console.warn('[imageproxy] Precise search failed, trying single tag:', searchErr.message);
                }

                // Fallback: search with just the first (most important) tag
                if (!imageUrl && primaryTag) {
                    try {
                        const fallbackResult = await cloudinary.search
                            .expression(`tags=${primaryTag}`)
                            .max_results(50)
                            .execute();

                        const fallbackImages = fallbackResult.resources || [];
                        if (fallbackImages.length > 0) {
                            // Pick a random one
                            const randomPick = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
                            imageUrl = randomPick.secure_url;
                            console.log(`[imageproxy] Fallback: random image from tag "${primaryTag}" — ${imageUrl}`);
                        }
                    } catch (e) {
                        console.error('[imageproxy] Fallback search also failed:', e.message);
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ url: imageUrl || null }));

            } catch (err) {
                console.error('[imageproxy] Error:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Health check
    if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', port: PORT }));
        return;
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`\n🔍 Image Proxy running on http://localhost:${PORT}`);
    console.log(`   POST /search-image  — search Cloudinary by tags`);
    console.log(`   GET  /health        — health check\n`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n⚠️  Port ${PORT} is already in use.`);
        console.error(`   Kill the old process and try again:\n`);
        console.error(`   Windows: netstat -ano | findstr :${PORT}   → taskkill /PID <pid> /F`);
        console.error(`   Mac/Linux: lsof -ti:${PORT} | xargs kill\n`);
        process.exit(1);
    }
});
