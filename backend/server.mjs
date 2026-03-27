import { createServer } from 'http';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

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
const MAX_BODY_BYTES = 1024 * 1024;
const PRICE_CACHE_MS = 5 * 60 * 1000;
let cachedSolPrice = null;
let cachedSolPriceAt = 0;
let cachedSeed = null;

const PREMIUM_PLANS = {
    monthly: { usd: 4.99, days: 30 },
    yearly: { usd: 39.99, days: 365 },
};

function setCors(req, res) {
    const origin = req.headers.origin;
    const allowAny = env.allowedOrigins.length === 0;
    const allowedOrigin =
        allowAny ? (origin || '*') : (origin && env.allowedOrigins.includes(origin) ? origin : null);

    if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    return raw ? JSON.parse(raw) : {};
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

    return {
        provider: payload.provider || 'auto',
        model: typeof payload.model === 'string' ? payload.model.trim() : '',
        messages: payload.messages,
        temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.8,
        max_tokens: typeof payload.max_tokens === 'number' ? payload.max_tokens : 300,
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

async function generateWaveSpeedImages({ prompt, width, height, count = 1, model }) {
    if (!env.wavespeedApiKey) {
        throw new Error('Wavespeed is not configured on the backend');
    }
    if (!prompt || typeof prompt !== 'string') {
        throw new Error('prompt is required');
    }

    const safeCount = Math.max(1, Math.min(Number(count) || 1, 4));
    const safeWidth = Math.max(256, Math.min(Number(width) || 1024, 1536));
    const safeHeight = Math.max(256, Math.min(Number(height) || 1024, 1536));
    const imageModel = model || env.wavespeedModel;
    const urls = [];

    for (let index = 0; index < safeCount; index += 1) {
        const submitResponse = await fetch(`https://api.wavespeed.ai/api/v3/${imageModel}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${env.wavespeedApiKey}`,
            },
            body: JSON.stringify({ prompt, width: safeWidth, height: safeHeight }),
        });

        const submitData = await submitResponse.json();
        if (!submitResponse.ok || submitData?.code !== 200 || !submitData?.data?.urls?.get) {
            throw new Error(submitData?.message || 'Failed to start image generation');
        }

        const pollUrl = submitData.data.urls.get;
        let generated = [];
        for (let attempt = 0; attempt < 30; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const pollResponse = await fetch(pollUrl, {
                headers: { Authorization: `Bearer ${env.wavespeedApiKey}` },
            });
            const pollData = await pollResponse.json();
            if (pollData?.data?.status === 'completed') {
                const outputs = pollData.data.outputs || pollData.data.result || pollData.data.images || pollData.data.output;
                generated = extractImageUrls(outputs);
                break;
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

async function deriveAddressForUser(uuid) {
    const seed = await getMasterSeed();
    const index = uuidToChildIndex(uuid);
    const { key } = derivePath(`m/44'/501'/${index}'/0'`, seed.toString('hex'));
    const keypair = nacl.sign.keyPair.fromSeed(key);
    return bs58.encode(keypair.publicKey);
}

async function getOrCreateSolanaAddress(userId) {
    if (!adminSupabase) {
        throw new Error('Supabase service role is not configured');
    }

    const { data, error } = await adminSupabase
        .from('users')
        .select('crypto_addresses')
        .eq('uuid', userId)
        .single();

    if (!error && data?.crypto_addresses) {
        return data.crypto_addresses;
    }

    const address = await deriveAddressForUser(userId);
    await adminSupabase.from('users').update({ crypto_addresses: address }).eq('uuid', userId);
    return address;
}

async function getSignatureDetails(signature) {
    const tx = await solanaConnection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
    });
    if (!tx?.meta) return null;
    const accountKeys = tx.transaction.message.staticAccountKeys ?? tx.transaction.message.accountKeys ?? [];
    return { tx, accountKeys };
}

async function confirmSolanaPayment(userId, payload) {
    if (!adminSupabase) {
        throw new Error('Supabase service role is not configured');
    }

    const { kind, plan, pack, signature, requiredSol, solAddress } = payload || {};
    if (!signature || !requiredSol || !solAddress) {
        throw new Error('signature, requiredSol, and solAddress are required');
    }

    const expectedAddress = await getOrCreateSolanaAddress(userId);
    if (expectedAddress !== solAddress) {
        throw new Error('Payment address does not match the authenticated user');
    }

    const details = await getSignatureDetails(signature);
    if (!details) {
        throw new Error('Transaction could not be loaded');
    }

    const addressIndex = details.accountKeys.findIndex((key) => key.toString() === solAddress);
    if (addressIndex === -1) {
        throw new Error('Transaction does not pay the expected address');
    }

    const received = (details.tx.meta.postBalances[addressIndex] - details.tx.meta.preBalances[addressIndex]) / LAMPORTS_PER_SOL;
    if (received < Number(requiredSol) * 0.98) {
        throw new Error('Transaction amount is below the required threshold');
    }

    if (kind === 'premium') {
        const premiumPlan = PREMIUM_PLANS[plan];
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
            await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const data = await proxyChat(payload);
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
            await getAuthenticatedUser(req);
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

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/solana/address') {
            const user = await getAuthenticatedUser(req);
            const address = await getOrCreateSolanaAddress(user.id);
            sendJson(res, 200, { address });
            return;
        }

        if (req.method === 'POST' && requestUrl.pathname === '/api/payments/solana/confirm') {
            const user = await getAuthenticatedUser(req);
            const payload = await readJson(req);
            const result = await confirmSolanaPayment(user.id, payload);
            sendJson(res, 200, result);
            return;
        }

        sendJson(res, 404, { error: 'Not found' });
    } catch (error) {
        const statusCode = /missing bearer token|invalid or expired session/i.test(error.message) ? 401 : 500;
        sendJson(res, statusCode, { error: error.message || 'Internal server error' });
    }
});

server.listen(env.port, () => {
    console.log(`Backend listening on port ${env.port}`);
});
