/**
 * SolanaPaymentService.js
 *
 * Safe frontend payment helpers:
 * - public price lookup and chain polling can stay client-side
 * - address derivation and privileged payment confirmation must happen on the backend
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { backendJson, hasBackend } from './backendApi';

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
const SOLANA_NETWORK = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';

export const PLANS = {
    monthly: { usd: 4.99, label: 'Monthly', period: '/ month' },
    yearly: { usd: 39.99, label: 'Yearly', period: '/ year', savings: '33%' },
};

let solPriceCache = null;
let solPriceFetchedAt = 0;
const PRICE_CACHE_MS = 5 * 60 * 1000;

export async function getLiveSolPrice() {
    if (hasBackend) {
        try {
            const data = await backendJson('/api/payments/solana/price?plan=monthly');
            if (data?.usd_price) return data.usd_price;
        } catch (err) {
            console.warn('[Solana] Backend price lookup failed, using public fallback:', err.message);
        }
    }

    const now = Date.now();
    if (solPriceCache && now - solPriceFetchedAt < PRICE_CACHE_MS) {
        return solPriceCache;
    }

    try {
        const res = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
            { signal: AbortSignal.timeout(5000) }
        );
        const data = await res.json();
        const price = data?.solana?.usd;
        if (price && price > 0) {
            solPriceCache = price;
            solPriceFetchedAt = now;
            return price;
        }
    } catch (err) {
        console.warn('[Solana] CoinGecko fetch failed, using fallback price:', err.message);
    }

    return solPriceCache || 130;
}

export function calcSolAmount(plan, solPriceUsd) {
    const usd = PLANS[plan]?.usd ?? 4.99;
    return Math.ceil((usd / solPriceUsd) * 1e6) / 1e6;
}

export async function getOrCreateUserSolanaAddress(uuid, sessionInfo = null) {
    if (!uuid) return null;
    if (!hasBackend) {
        console.warn('[Solana] Safe address derivation requires VITE_BACKEND_URL. Frontend derivation is disabled.');
        return null;
    }

    try {
        const data = await backendJson('/api/payments/solana/address', {
            method: 'POST',
            sessionInfo,
            body: {},
        });
        return data?.address || null;
    } catch (err) {
        console.error('[Solana] getOrCreateUserSolanaAddress error:', err);
        return null;
    }
}

export const getUserSolanaAddress = getOrCreateUserSolanaAddress;

const connection = new Connection(SOLANA_RPC, 'confirmed');

export async function checkSolanaPayment(userAddress, requiredSolAmount, since = null) {
    try {
        const pubkey = new PublicKey(userAddress);
        const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 25 });

        for (const sigInfo of signatures) {
            if (since && sigInfo.blockTime && sigInfo.blockTime < since / 1000) continue;
            if (sigInfo.err) continue;

            const tx = await connection.getTransaction(sigInfo.signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            if (!tx?.meta) continue;

            const accountKeys = tx.transaction.message.staticAccountKeys
                ?? tx.transaction.message.accountKeys;

            const idx = accountKeys.findIndex(k => k.toString() === userAddress);
            if (idx === -1) continue;

            const received = (tx.meta.postBalances[idx] - tx.meta.preBalances[idx]) / LAMPORTS_PER_SOL;
            if (received <= 0) continue;

            if (received >= requiredSolAmount * 0.98) {
                return {
                    paid: true,
                    amount: received,
                    signature: sigInfo.signature,
                    timestamp: sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
                };
            }
        }

        return { paid: false, amount: 0, signature: null, timestamp: null };
    } catch (err) {
        console.error('[Solana] checkSolanaPayment error:', err);
        return { paid: false, amount: 0, signature: null, timestamp: null, error: err.message };
    }
}

export function pollForPayment(userAddress, requiredSol, {
    onPaid,
    onTick,
    onError,
    intervalMs = 15000,
    maxAttempts = 40,
} = {}) {
    let attempt = 0;
    let cancelled = false;
    const since = Date.now();

    const check = async () => {
        if (cancelled) return;
        attempt += 1;
        if (onTick) onTick(attempt, maxAttempts);

        try {
            const result = await checkSolanaPayment(userAddress, requiredSol, since);
            if (result.paid) {
                if (onPaid) onPaid(result);
                return;
            }
        } catch (err) {
            if (onError) onError(err);
        }

        if (!cancelled && attempt < maxAttempts) setTimeout(check, intervalMs);
    };

    setTimeout(check, 3000);
    return () => { cancelled = true; };
}

export { SOLANA_NETWORK, SOLANA_RPC };
