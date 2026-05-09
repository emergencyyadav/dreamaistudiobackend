import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables manually if not already loaded
function loadEnv() {
    const envPath = resolve(__dirname, '.env');
    if (existsSync(envPath)) {
        const raw = readFileSync(envPath, 'utf8');
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const idx = trimmed.indexOf('=');
            if (idx === -1) continue;
            const key = trimmed.slice(0, idx).trim();
            let val = trimmed.slice(idx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (!(key in process.env)) process.env[key] = val;
        }
    }
}

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const adminSupabase = supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    : null;

/**
 * Updates a user's subscription or balance after a successful payment.
 */
export async function fulfillOrder(userId, kind, planOrPack) {
    if (!adminSupabase) {
        console.error('[DB] Error: adminSupabase not initialized');
        return { success: false, error: 'DB not initialized' };
    }

    try {
        if (kind === 'premium') {
            const PREMIUM_PLANS = {
                monthly: { days: 30 },
                quarterly: { days: 90 },
                yearly: { days: 365 },
            };
            const plan = PREMIUM_PLANS[planOrPack] || PREMIUM_PLANS.monthly;
            const expiresAt = new Date(Date.now() + plan.days * 86400_000).toISOString();

            console.log(`[DB] Fulfilling Premium: User=${userId}, Plan=${planOrPack}, Expires=${expiresAt}`);

            const { error } = await adminSupabase.from('users').update({
                is_premium: true,
                premium_plan: planOrPack,
                premium_expires_at: expiresAt,
                coin_balance: 99999, // Unlimited for premium
            }).eq('uuid', userId);

            if (error) throw error;
            return { success: true, type: 'premium', expiresAt };
        } 
        
        if (kind === 'coins') {
            const COIN_PACKS = {
                starter: 100,
                popular: 700,
                power: 3000
            };
            const addedCoins = COIN_PACKS[planOrPack] || 100;

            console.log(`[DB] Fulfilling Coins: User=${userId}, Pack=${planOrPack}, Amount=${addedCoins}`);

            // Get current balance first
            const { data: user, error: fetchErr } = await adminSupabase
                .from('users')
                .select('coin_balance')
                .eq('uuid', userId)
                .single();

            if (fetchErr) throw fetchErr;

            const newBalance = (Number(user?.coin_balance) || 0) + addedCoins;
            const { error: updateErr } = await adminSupabase
                .from('users')
                .update({ coin_balance: newBalance })
                .eq('uuid', userId);

            if (updateErr) throw updateErr;
            return { success: true, type: 'coins', newBalance };
        }

        return { success: false, error: 'Unknown fulfillment kind' };
    } catch (err) {
        console.error('[DB] Fulfillment failed:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Simple local usage tracking (as used in server.mjs)
 */
const TOKENS_FILE = resolve(__dirname, 'user_tokens.json');
export function loadTokenUsage() {
    try {
        if (existsSync(TOKENS_FILE)) {
            return JSON.parse(readFileSync(TOKENS_FILE, 'utf8'));
        }
    } catch (e) {}
    return {};
}

export function saveTokenUsage(data) {
    try {
        writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {}
}
