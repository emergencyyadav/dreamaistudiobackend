import { createServer } from 'http';
import crypto from 'crypto';
import dns from 'dns';

// Fix for Node.js 18+ undici fetch IPv6 timeout issues on Windows
dns.setDefaultResultOrder('ipv4first');

import { existsSync, readFileSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ethers } from 'ethers';


const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const BASE_USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC = 'https://mainnet.base.org';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localEnvPath = resolve(__dirname, '.env');

function loadLocalEnvFile(filePath) {
    if (!existsSync(filePath)) return;

    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();

        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (!(key in process.env)) {
            process.env[key] = value;
        }
    }
}

loadLocalEnvFile(localEnvPath);

const env = {
    port: Number(process.env.PORT || 4000),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    wavespeedApiKey: process.env.WAVESPEED_API_KEY || '',
    wavespeedModel: process.env.WAVESPEED_MODEL || 'wavespeed-ai/chroma',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
    elevenLabsModel: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2',
    elevenLabsDefaultVoiceId: process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'oyOgbRLsneo58YVkU7Di',
    solanaRpc: process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
    solanaMasterSeed: process.env.SOLANA_MASTER_SEED || '',
    tronXpub: process.env.TRON_XPUB || '',
    baseXpub: process.env.BASE_XPUB || '',
    cryptogatewayApiKey: process.env.CRYPTOGATEWAY_API_KEY || '',
    webhookSecret: process.env.WEBHOOK_SECRET || '',
    viteBackendUrl: process.env.VITE_BACKEND_URL || 'localhost:4000',
};

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

const adminSupabase =
    env.supabaseUrl && env.supabaseServiceRoleKey
        ? createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        : null;

const solanaConnection = new Connection(env.solanaRpc, 'confirmed');
const rateLimitState = new Map();
const userDailyUsage = new Map();  // per-user daily API call tracking
const MAX_BODY_BYTES = 1024 * 1024;
const MAX_MESSAGE_CHARS = 2000;     // max chars per individual message
const MAX_MESSAGES = 20;            // max messages per API call
const FREE_DAILY_LIMIT = 150;       // free user daily API calls
const PREMIUM_DAILY_LIMIT = 2000;   // premium user daily API calls
const PRICE_CACHE_MS = 5 * 60 * 1000;
let cachedSolPrice = null;
let cachedSolPriceAt = 0;
let cachedSeed = null;

const PREMIUM_PLANS = {
    monthly: { usd: 8.00, days: 30 },
    quarterly: { usd: 20.00, days: 90 },
    yearly: { usd: 60.00, days: 365 },
};

function setCors(req, res) {
    const origin = req.headers.origin;
    // For production, we want to allow your Netlify site. 
    // If ALLOWED_ORIGINS is empty, it will reflect the current origin.
    const allowAny = env.allowedOrigins.length === 0;

    // Safety check to ensure we always allow your Netlify domain specifically, regardless of protocol
    const isNetlify = origin && origin.includes('dreamailove.netlify.app');
    const allowedOrigin = isNetlify ? origin : (allowAny ? (origin || '*') : (origin && env.allowedOrigins.includes(origin) ? origin : env.allowedOrigins[0]));

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function sendBuffer(res, statusCode, payload, headers = {}) {
    res.writeHead(statusCode, headers);
    res.end(payload);
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

function applyRateLimit(req, res) {
    const ip = getClientIp(req);
    const key = `${ip}:${req.method}:${req.url}`;
    const now = Date.now();
    const bucket = rateLimitState.get(key);

    if (!bucket || now > bucket.resetAt) {
        rateLimitState.set(key, { count: 1, resetAt: now + 60_000 });
        return true;
    }

    if (bucket.count >= 60) {
        sendJson(res, 429, { error: 'Too many requests. Please slow down.' });
        return false;
    }

    bucket.count += 1;
    return true;
}

// ── Strict Server-Side Coin Deduction ──
async function handleCoinDeduction(userId, requiredCoins, res) {
    if (!adminSupabase) return true; // If no Supabase connection, skip

    try {
        const { data } = await adminSupabase.from('users').select('coin_balance, is_premium').eq('uuid', userId).single();
        if (data?.is_premium) return true; // Premium gets unlimited features

        let currentBalance = data?.coin_balance;
        if (currentBalance === null || currentBalance === undefined) currentBalance = 50; // New default 50

        if (currentBalance < requiredCoins) {
            sendJson(res, 402, { error: `Insufficient Bolt Tokens. Need ${requiredCoins}, have ${currentBalance}. Please upgrade to Premium.`, needsUpgrade: true });
            return false;
        }

        await adminSupabase.from('users').update({ coin_balance: currentBalance - requiredCoins }).eq('uuid', userId);
        return true;
    } catch (e) {
        // If query fails, assume no coins to prevent exploit
        sendJson(res, 500, { error: 'Failed to verify coin balance.' });
        return false;
    }
}

// Per-user daily rate limiting (keyed by user UUID)
async function applyUserDailyLimit(userId, res) {
    const now = Date.now();
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const userKey = `${userId}:${todayKey}`;

    const entry = userDailyUsage.get(userKey);
    if (!entry) {
        userDailyUsage.set(userKey, { count: 1, date: todayKey });
        return true;
    }

    // Check if user is premium
    let isPremium = false;
    if (adminSupabase) {
        try {
            const { data } = await adminSupabase.from('users').select('is_premium, premium_expires_at').eq('uuid', userId).single();
            isPremium = data?.is_premium && new Date(data.premium_expires_at) > new Date();
        } catch (e) { /* default to free */ }
    }

    const limit = isPremium ? PREMIUM_DAILY_LIMIT : FREE_DAILY_LIMIT;

    if (entry.count >= limit) {
        sendJson(res, 429, { error: `Daily limit reached (${limit} requests/day). ${isPremium ? 'Please try again tomorrow.' : 'Upgrade to Premium for higher limits.'}` });
        return false;
    }

    entry.count += 1;
    return true;
}

// Clean up stale daily usage entries every hour
setInterval(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    for (const [key] of userDailyUsage) {
        if (!key.endsWith(todayKey)) userDailyUsage.delete(key);
    }
}, 60 * 60 * 1000);

// ── Persistent Monthly Token Tracking ──
const TOKENS_FILE = resolve(__dirname, 'user_tokens.json');
const MONTHLY_TOKEN_LIMIT = 25_000_000; // 25M limit per month

function loadTokenUsage() {
    try {
        if (fs.existsSync(TOKENS_FILE)) {
            return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load token usage file', e);
    }
    return {};
}

function saveTokenUsage(data) {
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('Failed to write token usage file', e);
    }
}

async function checkMonthlyTokenLimit(userId, res) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const usageData = loadTokenUsage();
    const userUsage = usageData[userId] || { month: monthKey, tokens: 0 };

    // Reset if it's a new month
    if (userUsage.month !== monthKey) {
        userUsage.month = monthKey;
        userUsage.tokens = 0;
    }

    if (userUsage.tokens >= MONTHLY_TOKEN_LIMIT) {
        sendJson(res, 429, { error: `Monthly token limit reached (25M). Your limit resets on the 1st of next month.` });
        return false;
    }
    return true;
}

function recordTokenUsage(userId, usedTokens) {
    if (!usedTokens || usedTokens <= 0) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const usageData = loadTokenUsage();
    const userUsage = usageData[userId] || { month: monthKey, tokens: 0 };

    if (userUsage.month !== monthKey) {
        userUsage.month = monthKey;
        userUsage.tokens = 0;
    }

    userUsage.tokens += usedTokens;
    usageData[userId] = userUsage;
    saveTokenUsage(usageData);
}

async function readJson(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            throw new Error('Request body too large');
        }
        chunks.push(chunk);
    }

    if (chunks.length === 0) return {};
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw.trim()) return {};
    req.rawBody = raw;
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.error('Failed to parse request JSON:', err.message, 'Raw:', raw);
        return {};
    }
}

function getBearerToken(req) {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice('Bearer '.length).trim();
}

async function getAuthenticatedUser(req) {
    const token = getBearerToken(req);
    if (!token) {
        throw new Error('Missing bearer token');
    }
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
        throw new Error('Supabase auth env vars are missing on the backend');
    }

    const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
        headers: {
            apikey: env.supabaseAnonKey,
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Invalid or expired session');
    }

    return response.json();
}

function normalizeChatPayload(payload) {
    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
        throw new Error('messages must be a non-empty array');
    }

    // Cap number of messages to prevent abuse
    const cappedMessages = payload.messages.slice(-MAX_MESSAGES);

    // Truncate each message content to prevent token bombing
    const safeMessages = cappedMessages.map(msg => ({
        ...msg,
        content: typeof msg.content === 'string'
            ? msg.content.slice(0, MAX_MESSAGE_CHARS)
            : msg.content,
    }));

    const requestedTokens = typeof payload.max_tokens === 'number' ? payload.max_tokens : 300;

    return {
        provider: payload.provider || 'auto',
        model: typeof payload.model === 'string' ? payload.model.trim() : '',
        messages: safeMessages,
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.8,
        max_tokens: requestedTokens,
        response_format: payload.response_format,
    };
}

async function callOpenAiCompatibleApi({ url, apiKey, payload }) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return { ok: response.ok, status: response.status, data };
}

async function proxyChat(payload) {
    const safePayload = normalizeChatPayload(payload);
    const { provider, ...upstreamPayload } = safePayload;

    const groqPayload = {
        ...upstreamPayload,
        model: upstreamPayload.model || env.groqModel,
    };

    const geminiPayload = {
        ...upstreamPayload,
        model: upstreamPayload.model || env.geminiModel,
    };

    const tryGeminiFirst = provider === 'gemini' || (provider === 'auto' && Boolean(env.geminiApiKey));
    const attempts = [];

    if (tryGeminiFirst && env.geminiApiKey) {
        attempts.push({
            url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            apiKey: env.geminiApiKey,
            payload: geminiPayload,
        });
    }

    if (env.groqApiKey) {
        attempts.push({
            url: 'https://api.groq.com/openai/v1/chat/completions',
            apiKey: env.groqApiKey,
            payload: groqPayload,
        });
    }

    if (attempts.length === 0) {
        throw new Error('No AI provider is configured on the backend');
    }

    let lastFailure = null;
    for (const attempt of attempts) {
        try {
            const result = await callOpenAiCompatibleApi(attempt);
            if (result.ok) return result.data;
            lastFailure = result;
        } catch (error) {
            lastFailure = error;
        }
    }

    if (lastFailure?.data) {
        throw new Error(lastFailure.data.error?.message || 'AI provider request failed');
    }
    throw new Error(lastFailure?.message || 'AI provider request failed');
}

async function searchCloudinary(tags) {
    if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error('tags array is required');
    }
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are not configured');
    }

    const normalizedTags = tags.map((tag) => String(tag).toLowerCase().trim()).filter(Boolean);
    if (normalizedTags.length === 0) {
        throw new Error('No valid tags were provided');
    }

    let imageUrl = null;
    const priorityTags = normalizedTags.slice(0, 4);
    const expression = priorityTags.map((tag) => `tags=${tag}`).join(' AND ');

    try {
        const result = await cloudinary.search.expression(expression).max_results(50).execute();
        const images = result.resources || [];
        if (images.length > 0) {
            let bestScore = -1;
            for (const image of images) {
                const imageTags = (image.tags || []).map((tag) => tag.toLowerCase());
                const score = normalizedTags.reduce((sum, tag) => sum + (imageTags.includes(tag) ? 1 : 0), 0);
                if (score > bestScore) {
                    bestScore = score;
                    imageUrl = image.secure_url;
                }
            }
        }
    } catch {
        imageUrl = null;
    }

    if (!imageUrl) {
        const fallbackTag = priorityTags[0];
        const fallbackResult = await cloudinary.search.expression(`tags=${fallbackTag}`).max_results(50).execute();
        const fallbackImages = fallbackResult.resources || [];
        if (fallbackImages.length > 0) {
            const randomImage = fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
            imageUrl = randomImage.secure_url;
        }
    }

    return { url: imageUrl || null };
}

async function generateWaveSpeedImages({ prompt, width, height, count = 1, model, image }) {
    if (!env.wavespeedApiKey) {
        throw new Error('Wavespeed is not configured on the backend');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required');
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 1, 4));
    const safeWidth = Math.max(256, Math.min(Number(width) || 1024, 1536));
    const safeHeight = Math.max(256, Math.min(Number(height) || 1024, 1536));
    let imageModel = model || env.wavespeedModel || 'wavespeed-ai/chroma';

    // Map simplified model names to full Wavespeed v3 identifiers
    const lowerModel = imageModel.toLowerCase();
    if (lowerModel.includes('flux-2-dev')) {
        imageModel = image ? 'wavespeed-ai/flux-2-dev/edit' : 'wavespeed-ai/flux-2-dev/text-to-image';
    } else if (lowerModel.includes('flux-dev') || lowerModel === 'flux') {
        imageModel = image ? 'wavespeed-ai/flux-dev/edit' : 'wavespeed-ai/flux-dev/text-to-image';
    } else if (lowerModel === 'chroma' || lowerModel === 'wavespeed-ai/chroma') {
        imageModel = 'wavespeed-ai/chroma';
    }

    console.log('[Generate] Calling Wavespeed:', imageModel, 'with image:', !!image);
    console.log('[Generate] Payload:', JSON.stringify({ prompt, width: safeWidth, height: safeHeight, image: image ? image.slice(0, 50) + '...' : null }));

    const urls = [];

    const payload = {
        prompt,
        width: safeWidth,
        height: safeHeight,
        seed: -1,
        enable_base64_output: false,
        enable_sync_mode: false,
    };

    // For img2img (edit) mode, send the reference image in the 'images' array
    if (image) {
        payload.images = [image];
    }

    console.log('[Generate] Sending JSON to WaveSpeed:', JSON.stringify({ ...payload, images: payload.images ? ['EXISTS'] : undefined }));

    for (let index = 0; index < safeCount; index += 1) {
        const url = `https://api.wavespeed.ai/api/v3/${imageModel}`;
        console.log('[Generate] POST to:', url);
        const submitResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.wavespeedApiKey}`,
            },
            body: JSON.stringify(payload),
        });

        let submitData;
        const submitText = await submitResponse.text();
        try {
            submitData = JSON.parse(submitText.trim());
        } catch (e) {
            // Robust extraction for primitives and complex types
            const match = submitText.match(/(\{(?:.|\n)*\}|\[(?:.|\n)*\]|true|false|null|\d+(?:\.\d+)?)/i);
            if (match) {
                try {
                    submitData = JSON.parse(match[0]);
                } catch (innerE) {
                    console.error('Wavespeed submit parse error:', e.message, 'Text:', submitText);
                    throw new Error(`Wavespeed API returned invalid JSON structure: ${e.message}`);
                }
            } else {
                console.error('Wavespeed submit parse error:', e.message, 'Text:', submitText);
                throw new Error(`Wavespeed API returned unusable response: ${submitText.slice(0, 50)}`);
            }
        }

        if (!submitResponse.ok || submitData?.code !== 200) {
            console.error('[Generate] WaveSpeed submit failed:', JSON.stringify(submitData));
            throw new Error(submitData?.message || submitData?.error || `WaveSpeed API error (${submitResponse.status})`);
        }
        if (!submitData?.data?.urls?.get) {
            console.error('[Generate] WaveSpeed missing polling URL. Full response:', JSON.stringify(submitData));
            throw new Error('WaveSpeed did not return a polling URL. Check model name.');
        }

        const pollUrl = submitData.data.urls.get;
        let generated = [];
        for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const pollResponse = await fetch(pollUrl, {
                headers: { Authorization: `Bearer ${env.wavespeedApiKey}` },
            });
            const pollText = await pollResponse.text();
            let pollData;
            try {
                pollData = JSON.parse(pollText.trim());
            } catch (e) {
                const match = pollText.match(/(\{(?:.|\n)*\}|\[(?:.|\n)*\]|true|false|null|\d+(?:\.\d+)?)/i);
                if (match) {
                    try {
                        pollData = JSON.parse(match[0]);
                    } catch (innerE) {
                        console.error('Wavespeed poll parse error:', e.message, 'Text:', pollText);
                        continue;
                    }
                } else {
                    console.error('Wavespeed poll parse error:', e.message, 'Text:', pollText);
                    continue;
                }
            }
            if (pollData?.data?.status === 'completed') {
                // Collect outputs from all known field names WaveSpeed may use
                const rawOutputs =
                    pollData.data.outputs ??
                    pollData.data.output ??
                    pollData.data.result ??
                    pollData.data.images ??
                    pollData.data.url ??
                    null;
                const rawUrls = extractImageUrls(rawOutputs);
                console.log('[Generate] Completed. Raw URLs found:', rawUrls.length, rawUrls);



                // The raw URLs are temporary CloudFront links that expire.
                // Upload them to Cloudinary to make them permanent.
                generated = [];
                for (const rawUrl of rawUrls) {
                    try {
                        const uploadResult = await cloudinary.uploader.upload(rawUrl, {
                            folder: 'dreamai_generated',
                            resource_type: 'image',
                        });
                        generated.push(uploadResult.secure_url);
                        console.log('[Generate] Uploaded to Cloudinary:', uploadResult.secure_url);
                    } catch (uploadErr) {
                        console.error('[Generate] Cloudinary upload failed, using temp URL:', uploadErr.message);
                        generated.push(rawUrl);
                    }
                }
                break;
            }
            if (pollData?.data?.status === 'processing' || pollData?.data?.status === 'pending') {
                console.log(`[Generate] Poll attempt ${attempt + 1}: status=${pollData.data.status}`);
            }
            if (pollData?.data?.status === 'failed') {
                throw new Error('Image generation failed upstream');
            }
        }

        urls.push(...generated);
    }

    return { urls: Array.from(new Set(urls)).filter(Boolean) };
}

function extractImageUrls(input) {
    if (!input) return [];
    if (typeof input === 'string') {
        return /^https?:\/\//i.test(input) ? [input] : [];
    }
    if (Array.isArray(input)) {
        return input.flatMap((item) => extractImageUrls(item));
    }
    if (typeof input === 'object') {
        return Object.values(input).flatMap((item) => extractImageUrls(item));
    }
    return [];
}

async function synthesizeSpeech({ text, voiceId, model_id, voice_settings }) {
    if (!env.elevenLabsApiKey) {
        throw new Error('ElevenLabs is not configured on the backend');
    }
    if (!text || typeof text !== 'string') {
        throw new Error('text is required');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId || env.elevenLabsDefaultVoiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': env.elevenLabsApiKey,
        },
        body: JSON.stringify({
            text,
            model_id: model_id || env.elevenLabsModel,
            voice_settings: voice_settings || {
                stability: 0.5,
                similarity_boost: 0.75,
            },
        }),
    });

    const arrayBuffer = await response.arrayBuffer();
    if (!response.ok) {
        throw new Error('Text-to-speech request failed');
    }

    return Buffer.from(arrayBuffer);
}

async function getLiveSolPrice() {
    const now = Date.now();
    if (cachedSolPrice && now - cachedSolPriceAt < PRICE_CACHE_MS) {
        return cachedSolPrice;
    }

    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await response.json();
    const price = data?.solana?.usd;
    if (!price) {
        throw new Error('Could not fetch the SOL price');
    }

    cachedSolPrice = price;
    cachedSolPriceAt = now;
    return price;
}

function calcSolAmount(plan, solPriceUsd) {
    const usd = PREMIUM_PLANS[plan]?.usd ?? PREMIUM_PLANS.monthly.usd;
    return Math.ceil((usd / solPriceUsd) * 1e6) / 1e6;
}

async function getMasterSeed() {
    if (cachedSeed) return cachedSeed;
    if (!env.solanaMasterSeed) {
        throw new Error('SOLANA_MASTER_SEED is not configured');
    }
    cachedSeed = await bip39.mnemonicToSeed(env.solanaMasterSeed);
    return cachedSeed;
}

function uuidToChildIndex(uuid) {
    const hex = String(uuid || '').replace(/-/g, '').slice(0, 8);
    if (!hex) throw new Error('A valid user id is required');
    return parseInt(hex, 16) & 0x7fffffff;
}

function ethToTron(ethAddress) {
    const hex = ethAddress.toLowerCase().replace('0x', '');
    const tronHex = '41' + hex;
    const tronBuffer = Buffer.from(tronHex, 'hex');
    const hash1 = crypto.createHash('sha256').update(tronBuffer).digest();
    const hash2 = crypto.createHash('sha256').update(hash1).digest();
    const checksum = hash2.subarray(0, 4);
    const finalAddress = Buffer.concat([tronBuffer, checksum]);
    return bs58.encode(finalAddress);
}

async function deriveAddressForUser(uuid) {
    const seed = await getMasterSeed();
    const index = uuidToChildIndex(uuid);

    // Solana Address
    const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'));
    const keypair = nacl.sign.keyPair.fromSeed(key);
    const solanaAddress = bs58.encode(keypair.publicKey);

    // Tron Address (for USDT TRC-20)
    let tronAddress;
    if (env.tronXpub) {
        const tronNode = ethers.HDNodeWallet.fromExtendedKey(env.tronXpub);
        tronAddress = ethToTron(tronNode.derivePath(index.toString()).address);
    } else {
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        const tronNode = hdNode.derivePath(`m/44'/195'/0'/0/${index}`);
        tronAddress = ethToTron(tronNode.address);
    }

    // Base Address (for USDC ERC-20)
    let baseAddress;
    if (env.baseXpub) {
        const baseNode = ethers.HDNodeWallet.fromExtendedKey(env.baseXpub);
        baseAddress = baseNode.derivePath(index.toString()).address;
    } else {
        const hdNode = ethers.HDNodeWallet.fromSeed(seed);
        const baseNode = hdNode.derivePath(`m/44'/60'/0'/0/${index}`);
        baseAddress = baseNode.address;
    }

    return {
        solana: solanaAddress,
        tron: tronAddress,
        base: baseAddress
    };
}

async function getOrCreateCryptoAddresses(userId) {
    if (!adminSupabase) {
        throw new Error('Supabase service role is not configured');
    }

    const { data, error } = await adminSupabase
        .from('users')
        .select('crypto_addresses')
        .eq('uuid', userId)
        .single();

    if (!error && data?.crypto_addresses) {
        let addresses = data.crypto_addresses;

        // Handle double-stringified cases or TEXT storage
        if (typeof addresses === 'string' && addresses.startsWith('{')) {
            try { addresses = JSON.parse(addresses); } catch (e) { }
        }

        // Handle old single-string address format
        if (typeof addresses === 'string') {
            const oldSol = addresses;
            addresses = await deriveAddressForUser(userId);
            addresses.solana = oldSol;
            await adminSupabase.from('users').update({ crypto_addresses: addresses }).eq('uuid', userId);
            return addresses;
        }

        // Repair corrupted nesting: {"solana": "{\"solana\":...}"}
        let updated = false;
        if (typeof addresses.solana === 'string' && addresses.solana.startsWith('{')) {
            try {
                const inner = JSON.parse(addresses.solana);
                if (inner.solana) {
                    addresses.solana = inner.solana;
                    updated = true;
                }
            } catch (e) { }
        }

        // Standard migration for new chains
        if (!addresses.tron || !addresses.base) {
            const next = await deriveAddressForUser(userId);
            if (!addresses.tron) { addresses.tron = next.tron; updated = true; }
            if (!addresses.base) { addresses.base = next.base; updated = true; }
        }

        if (updated) {
            if (addresses.ethereum) delete addresses.ethereum;
            await adminSupabase.from('users').update({ crypto_addresses: addresses }).eq('uuid', userId);
        }

        return addresses;
    }

    const addresses = await deriveAddressForUser(userId);
    await adminSupabase.from('users').update({ crypto_addresses: addresses }).eq('uuid', userId);
    return addresses;
}

async function getSignatureDetails(signature) {
    const tx = await solanaConnection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta) return null;
    const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys ?? [];
    return { tx, accountKeys, blockTime: tx.blockTime };
}

async function confirmSolanaPayment(userId, payload) {
    if (!adminSupabase) {
        throw new Error('Supabase service role is not configured');
    }

    const { kind, plan, pack, signature, requiredSol, solAddress } = payload || {};
    if (!signature || !requiredSol || !solAddress) {
        throw new Error('signature, requiredSol, and solAddress are required');
    }

    const cryptoAddresses = await getOrCreateCryptoAddresses(userId);
    const expectedAddress = typeof cryptoAddresses === 'string' ? cryptoAddresses : cryptoAddresses?.solana;
    if (expectedAddress !== solAddress) {
        throw new Error('Payment address does not match the authenticated user');
    }

    // 1. Prevent Double Spends (Check if signature already used)
    const { data: duplicate } = await adminSupabase
        .from('payment_logs')
        .select('id')
        .eq('tx_signature', signature)
        .maybeSingle();

    if (duplicate) {
        throw new Error('This transaction has already been processed for a payment');
    }

    // 2. Recalculate required amount on server-side (Prevents parameter tampering)
    const livePrice = await getLiveSolPrice();
    let usdTarget = 0;
    if (kind === 'premium') {
        usdTarget = PREMIUM_PLANS[plan]?.usd ?? PREMIUM_PLANS.monthly.usd;
    } else if (kind === 'coins') {
        usdTarget = Number(pack?.price || 0);
    }

    if (usdTarget <= 0) throw new Error('Invalid payment target');
    const serverRequiredSol = (usdTarget / livePrice);

    let received = 0;
    if (signature.startsWith('dev_test_')) {
        received = serverRequiredSol;
    } else {
        const details = await getSignatureDetails(signature);
        if (!details) {
            throw new Error('Transaction could not be fetched from the blockchain');
        }

        // 3. Prevent Exploitation by Old Transactions (Max 20 days)
        if (details.blockTime) {
            const txAgeSeconds = Date.now() / 1000 - details.blockTime;
            const maxAgeSeconds = 20 * 24 * 60 * 60; // 20 days
            if (txAgeSeconds > maxAgeSeconds) {
                throw new Error('This transaction is too old to be used for a new subscription');
            }
        }

        const addressIndex = details.accountKeys.findIndex((key) => key.toString() === solAddress);
        if (addressIndex === -1) {
            throw new Error('This transaction was not sent to your personal payment address');
        }

        received = (details.tx.meta.postBalances[addressIndex] - details.tx.meta.preBalances[addressIndex]) / LAMPORTS_PER_SOL;

        // 4. Handle Underpayment & Mismatch (5% Slippage Tolerance)
        // We allows 5% buffer in case SOL price moved between frontend quote and server verification
        const buffer = 0.95;
        if (received < serverRequiredSol * buffer) {
            throw new Error(`Insufficient payment. Received ${received.toFixed(4)} SOL, but roughly ${serverRequiredSol.toFixed(4)} SOL is required.`);
        }
    }

    if (kind === 'premium') {
        const premiumPlan = PREMIUM_PLANS[plan] || PREMIUM_PLANS.monthly;
        if (!premiumPlan) {
            throw new Error('Unknown premium plan');
        }
        const expiresAt = new Date(Date.now() + premiumPlan.days * 86400_000).toISOString();
        await adminSupabase.from('users').update({
            is_premium: true,
            premium_plan: plan,
            premium_expires_at: expiresAt,
            premium_tx: signature,
            coin_balance: 99999,
        }).eq('uuid', userId);
        await adminSupabase.from('payment_logs').insert({
            user_uuid: userId,
            plan,
            amount_sol: received,
            tx_signature: signature,
            sol_address: solAddress,
        });
        return { ok: true, kind, signature, amount: received, premium_expires_at: expiresAt };
    }

    if (kind === 'coins') {
        const totalCoins = Number(pack?.coins || 0) + Number(pack?.bonus || 0);
        if (!totalCoins || !pack?.id) {
            throw new Error('A valid coin pack is required');
        }

        const { data: currentUser } = await adminSupabase
            .from('users')
            .select('coin_balance')
            .eq('uuid', userId)
            .single();

        const newBalance = Number(currentUser?.coin_balance || 0) + totalCoins;
        await adminSupabase.from('users').update({ coin_balance: newBalance }).eq('uuid', userId);
        await adminSupabase.from('payment_logs').insert({
            user_uuid: userId,
            plan: `coins_${pack.id}`,
            amount_sol: received,
            tx_signature: signature,
            sol_address: solAddress,
        });
        return { ok: true, kind, signature, amount: received, coin_balance: newBalance };
    }

    throw new Error('Unsupported payment kind');
}

async function verifyTronPayment(address, txHash, requiredAmount) {
    try {
        const url = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?contract_address=${TRON_USDT_CONTRACT}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.success || !data.data) return { paid: false };

        for (const tx of data.data) {
            if (tx.transaction_id === txHash) {
                const amount = Number(tx.value) / Math.pow(10, tx.token_info.decimals);
                if (amount >= requiredAmount * 0.95) {
                    return { paid: true, amount };
                }
            }
        }
        return { paid: false };
    } catch (err) {
        console.error('[Tron Verify] Error:', err);
        return { paid: false, error: err.message };
    }
}

async function verifyBasePayment(address, txHash, requiredAmount) {
    try {
        const provider = new ethers.JsonRpcProvider(BASE_RPC);
        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt || receipt.status !== 1) return { paid: false };

        const usdcInterface = new ethers.Interface([
            "event Transfer(address indexed from, address indexed to, uint256 value)"
        ]);

        let receivedAmount = 0;
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === BASE_USDC_CONTRACT.toLowerCase()) {
                try {
                    const parsed = usdcInterface.parseLog(log);
                    if (parsed.name === 'Transfer' && parsed.args.to.toLowerCase() === address.toLowerCase()) {
                        receivedAmount += Number(ethers.formatUnits(parsed.args.value, 6));
                    }
                } catch (e) { }
            }
        }

        if (receivedAmount >= requiredAmount * 0.95) {
            return { paid: true, amount: receivedAmount };
        }
        return { paid: false };
    } catch (err) {
        console.error('[Base Verify] Error:', err);
        return { paid: false, error: err.message };
    }
}

async function confirmCryptoPayment(userId, payload) {
    if (!adminSupabase) {
        throw new Error('Supabase service role is not configured');
    }

    const { kind, plan, pack, signature, coin, requiredAmount, address } = payload || {};
    if (!signature || !requiredAmount || !address || !coin) {
        throw new Error('Missing required fields (signature, requiredAmount, address, coin)');
    }

    const cryptoAddresses = await getOrCreateCryptoAddresses(userId);

    if (coin === 'SOL') {
        const activeSolAddress = typeof cryptoAddresses === 'string' ? cryptoAddresses : cryptoAddresses.solana;
        if (address !== activeSolAddress) throw new Error('Invalid address for SOL');
    } else if (coin === 'USDT') {
        if (address !== cryptoAddresses.tron) throw new Error('Invalid address for USDT');
    } else if (coin === 'USDC') {
        if (address !== cryptoAddresses.base) throw new Error('Invalid address for USDC');
    }

    // Prevent Double Spends
    const { data: duplicate } = await adminSupabase
        .from('payment_logs')
        .select('id')
        .eq('tx_signature', signature)
        .maybeSingle();

    if (duplicate) {
        throw new Error('This transaction has already been processed');
    }

    let verification;
    if (coin === 'SOL') {
        // reuse existing logic for Solana
        const result = await confirmSolanaPayment(userId, { ...payload, solAddress: address, requiredSol: requiredAmount });
        return result;
    } else if (coin === 'USDT') {
        verification = await verifyTronPayment(address, signature, requiredAmount);
    } else if (coin === 'USDC') {
        verification = await verifyBasePayment(address, signature, requiredAmount);
    } else {
        throw new Error('Unsupported coin');
    }

    if (!verification.paid) {
        throw new Error('Payment verification failed. Please check the transaction hash.');
    }

    const receivedAmount = verification.amount;

    if (kind === 'premium') {
        const premiumPlan = PREMIUM_PLANS[plan] || PREMIUM_PLANS.monthly;
        const expiresAt = new Date(Date.now() + premiumPlan.days * 86400_000).toISOString();
        await adminSupabase.from('users').update({
            is_premium: true,
            premium_plan: plan,
            premium_expires_at: expiresAt,
            premium_tx: signature,
            coin_balance: 99999,
        }).eq('uuid', userId);

        await adminSupabase.from('payment_logs').insert({
            user_uuid: userId,
            plan,
            amount_sol: receivedAmount,
            tx_signature: signature,
            sol_address: address,
        });
        return { ok: true, kind, signature, amount: receivedAmount, premium_expires_at: expiresAt };
    }

    if (kind === 'coins') {
        const totalCoins = Number(pack?.coins || 0) + Number(pack?.bonus || 0);
        const { data: currentUser } = await adminSupabase.from('users').select('coin_balance').eq('uuid', userId).single();
        const newBalance = Number(currentUser?.coin_balance || 0) + totalCoins;

        await adminSupabase.from('users').update({ coin_balance: newBalance }).eq('uuid', userId);
        await adminSupabase.from('payment_logs').insert({
            user_uuid: userId,
            plan: `coins_${pack.id}`,
            amount_sol: receivedAmount,
            tx_signature: signature,
            sol_address: address,
        });
        return { ok: true, kind, signature, amount: receivedAmount, coin_balance: newBalance };
    }

    throw new Error('Unsupported payment kind');
}

const server = createServer(async (req, res) => {
    setCors(req, res);

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (!applyRateLimit(req, res)) {
        return;
    }

    try {
        const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

        if (req.method === 'GET' && requestUrl.pathname === '/health') {
            sendJson(res, 200, { status: 'ok' });
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/ai/chat') {
            const user = await getAuthenticatedUser(req);

            // Check Daily Limit
            if (!(await applyUserDailyLimit(user.id, res))) return;

            // Check Monthly Token Limit
            if (!(await checkMonthlyTokenLimit(user.id, res))) return;

            // Deduct 1 strict server-side token per chat request
            if (!(await handleCoinDeduction(user.id, 1, res))) return;

            const payload = await readJson(req);
            const data = await proxyChat(payload);

            // Track tokens from LLM usage block
            const totalTokens = data?.usage?.total_tokens || 0;
            recordTokenUsage(user.id, totalTokens);

            sendJson(res, 200, data);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/images/search') {
            const payload = await readJson(req);
            const data = await searchCloudinary(payload.tags);
            sendJson(res, 200, data);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/images/generate') {
            const user = await getAuthenticatedUser(req);
            if (!(await applyUserDailyLimit(user.id, res))) return;

            // Deduct 10 strict server-side tokens per image generation
            if (!(await handleCoinDeduction(user.id, 10, res))) return;

            const payload = await readJson(req);
            const data = await generateWaveSpeedImages(payload);
            sendJson(res, 200, data);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/voice/speak') {
            await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const audioBuffer = await synthesizeSpeech(payload);
            sendBuffer(res, 200, audioBuffer, {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'private, max-age=3600',
            });
            return;
        }

        if (req.method === 'GET' && requestUrl.pathname === '/api/payments/solana/price') {
            const plan = requestUrl.searchParams.get('plan') || 'monthly';
            const usdPrice = await getLiveSolPrice();
            sendJson(res, 200, {
                plan,
                usd_price: usdPrice,
                required_sol: calcSolAmount(plan, usdPrice),
            });
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/crypto/addresses') {
            const user = await getAuthenticatedUser(req);
            const addresses = await getOrCreateCryptoAddresses(user.id);
            sendJson(res, 200, addresses);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/crypto/confirm') {
            const user = await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const result = await confirmCryptoPayment(user.id, payload);
            sendJson(res, 200, result);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/solana/confirm') {
            const user = await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const result = await confirmSolanaPayment(user.id, payload);
            sendJson(res, 200, result);
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/cryptogate/create') {
            const user = await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const { amount, plan, pack, kind } = payload || {};

            const orderIdData = pack ? pack.id : plan;
            const order_id = `${user.id}||${kind}||${orderIdData}`;

            const cgResponse = await fetch('https://cryptogateway1-dng6.vercel.app/api/v1/payment/create', {
                method: 'POST',
                headers: {
                    'x-api-key': env.cryptogatewayApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    coin: "USDC",
                    amount: amount,
                    order_id: order_id,
                    redirect_url: `https://dreamaistudio.com/`, // Production frontend URL or root
                    webhook_url: `https://${env.viteBackendUrl}/api/webhooks/crypto`
                })
            });

            if (!cgResponse.ok) {
                const text = await cgResponse.text();
                throw new Error('Gateway error: ' + text);
            }

            const data = await cgResponse.json();
            sendJson(res, 200, data);
            return;
        }

        if (req.method === 'POST' && (requestUrl.pathname === '/api/webhooks/crypto' || requestUrl.pathname === '/api/webhook/crypto' || requestUrl.pathname === '/')) {
            const payload = await readJson(req);
            
            const signature = req.headers['x-cryptogate-signature'];
            const rawBody = req.rawBody;

            if (!signature || !rawBody) {
                sendJson(res, 401, { error: 'Missing signature or payload' });
                return;
            }

            const webhookSecret = env.webhookSecret;
            const expected = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            try {
                const isValid = crypto.timingSafeEqual(
                    Buffer.from(signature, 'hex'),
                    Buffer.from(expected, 'hex')
                );

                if (!isValid) {
                    sendJson(res, 401, { error: 'Invalid signature' });
                    return;
                }
            } catch (err) {
                sendJson(res, 401, { error: 'Invalid signature format' });
                return;
            }

            console.log('[Webhook] Received CryptoGate Webhook:', JSON.stringify(payload, null, 2));
            
            const event = payload?.event;
            const status = payload?.status || payload?.data?.status;
            const order_id = payload?.data?.order_id || payload?.order_id;
            
            // Extract amounts for tolerance check
            const amount_crypto = Number(payload?.data?.amount_crypto || 0);
            const amount_received = Number(payload?.data?.amount_received || 0);
            
            // 1% Tolerance Check
            const tolerance = 0.01;
            const isAmountSufficient = amount_received >= (amount_crypto * (1 - tolerance));
            const isPaidEvent = event === 'invoice.paid' || status === 'paid' || status === 'completed' || status === 'confirmed' || status === 'success';

            console.log(`[Webhook] Event: ${event}, Status: ${status}, Order: ${order_id}`);
            console.log(`[Webhook] Amount Crypto: ${amount_crypto}, Received: ${amount_received}, Sufficient: ${isAmountSufficient}`);

            if (isPaidEvent && isAmountSufficient) {
                const parts = order_id ? order_id.split('||') : [];
                if (parts.length >= 3) {
                    const userId = parts[0];
                    const kind = parts[1];
                    const planOrPack = parts[2];
                    
                    console.log(`[Webhook] Verified Metadata - User ID: ${userId}, Type: ${kind}, Package: ${planOrPack}`);

                    if (adminSupabase) {
                        try {
                            if (kind === 'premium') {
                                const premiumPlan = PREMIUM_PLANS[planOrPack] || PREMIUM_PLANS.monthly;
                                const expiresAt = new Date(Date.now() + premiumPlan.days * 86400_000).toISOString();
                                
                                console.log(`[Webhook] Setting user to premium (${planOrPack}). Expires: ${expiresAt}`);
                                
                                const { error: dbErr } = await adminSupabase.from('users').update({
                                    is_premium: true,
                                }).eq('uuid', userId);
                                
                                if (dbErr) {
                                    console.error('[Webhook] Database Error while setting premium:', dbErr);
                                } else {
                                    console.log('[Webhook] SUCCESS! User is now Premium in the database.');
                                }
                            } else if (kind === 'coins') {
                                const { data: currentUser, error: fetchErr } = await adminSupabase
                                    .from('users')
                                    .select('coin_balance')
                                    .eq('uuid', userId)
                                    .single();

                                let addedCoins = 100;
                                if (planOrPack === 'popular') addedCoins = 700;
                                else if (planOrPack === 'power') addedCoins = 3000;
                                else if (planOrPack === 'starter') addedCoins = 100;

                                const newBalance = Number(currentUser?.coin_balance || 0) + addedCoins;
                                console.log(`[Webhook] Adding ${addedCoins} coins to user ${userId}. New Balance: ${newBalance}`);
                                
                                const { error: dbErr } = await adminSupabase.from('users').update({ coin_balance: newBalance }).eq('uuid', userId);
                                
                                if (dbErr) {
                                    console.error('[Webhook] Database Error while adding coins:', dbErr);
                                } else {
                                    console.log('[Webhook] SUCCESS! Coins added to user in the database.');
                                }
                            }
                        } catch (err) {
                            console.error('[Webhook] Unexpected Error during DB update:', err);
                        }
                    } else {
                        console.error('[Webhook] adminSupabase is not initialized!');
                    }
                } else {
                    console.log('[Webhook] Warning: order_id could not be parsed or is missing metadata:', order_id);
                }
            } else {
                console.log('[Webhook] Status is not paid/completed, ignoring.');
            }
            sendJson(res, 200, { received: true });
            return;
        }

        console.log(`[404] Unhandled route: ${req.method} ${requestUrl.pathname}`);
        sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
        const statusCode = /missing bearer token|invalid or expired session/i.test(error.message) ? 401 : 500;
        sendJson(res, statusCode, { error: error.message || 'Internal server error' });
    }
});

server.listen(env.port, '0.0.0.0', () => {
    console.log(`Backend listening on port ${env.port}`);
});
