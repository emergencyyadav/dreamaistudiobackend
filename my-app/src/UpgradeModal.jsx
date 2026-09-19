import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    X, Crown, Zap, Shield, Copy, Check, Loader2,
    RefreshCw, ExternalLink, CheckCircle2, AlertCircle,
    ChevronDown, Sparkles, ChevronRight, Coins,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import {
    PLANS,
    SOLANA_NETWORK,
    createCryptoPaymentOrder,
    checkCryptoPaymentOrder,
} from './SolanaPaymentService';
import { hasBackend } from './backendApi';

// ── Premium benefits ──────────────────────────────────────────────────────────
const BENEFITS = [
    { title: 'Unlimited Messages', desc: 'Up to 5,000 messages per month.' },
    { title: '100 Image Generations', desc: 'High-quality AI image creation.' },
    { title: 'Video Generation', desc: 'Text-to-Video and Image-to-Video (10/mo).' },
    { title: 'Expanded Characters', desc: 'Create more characters with privacy controls.' },
    { title: 'Leaderboard Access', desc: 'Push generated characters to the public ranking.' },
    { title: '1,000 Bonus Tokens', desc: 'Added instantly to your account balance.' },
    { title: 'Voice Features', desc: 'Listen to messages & customize character voices.' },
    { title: 'NSFW Access', desc: 'Unrestricted generations without safety filters.' },
    { title: 'Priority Queue', desc: 'Faster generation times during peak hours.' },
];

// ── Coin packs ────────────────────────────────────────────────────────────────
const COIN_PACKS = [
    { id: 'starter', coins: 100, bonus: 0, price: 0.99, label: 'Starter', popular: false },
    { id: 'popular', coins: 600, bonus: 100, price: 4.99, label: 'Popular', popular: true },
    { id: 'power', coins: 2500, bonus: 500, price: 14.99, label: 'Power', popular: false },
];

function useCopy() {
    const [copied, setCopied] = useState(false);
    const copy = useCallback((text) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, []);
    return [copied, copy];
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN MODAL
// ══════════════════════════════════════════════════════════════════════════════
export default function UpgradeModal({
    isOpen,
    onClose,
    coinBalance,
    isPremium,
    userUuid,
    sessionInfo,
    onPremiumGranted,
    onCoinsAdded,
}) {
    const [activeTab, setActiveTab] = useState('premium');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: '94vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800/80 bg-gray-900/70 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Zap size={18} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg tracking-tight">Upgrade Account</h2>
                            <p className="text-[11px] text-gray-400">
                                Current Status: <span className="text-purple-300 font-semibold">{isPremium ? 'Lifetime Pro' : `${coinBalance} Coins`}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b border-gray-800/80 bg-gray-900/40 px-6">
                    <button
                        onClick={() => setActiveTab('premium')}
                        className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'premium'
                            ? 'border-purple-500 text-purple-300'
                            : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                    >
                        <Crown size={14} />
                        Membership Plans
                    </button>
                    <button
                        onClick={() => setActiveTab('coins')}
                        className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'coins'
                            ? 'border-purple-500 text-purple-300'
                            : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                    >
                        <Coins size={14} />
                        Bolt Coin Packs
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5 bg-gray-950" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed transparent' }}>
                    {activeTab === 'premium' ? (
                        <PremiumTab
                            userUuid={userUuid}
                            sessionInfo={sessionInfo}
                            onPremiumGranted={onPremiumGranted}
                            onClose={onClose}
                            isPremium={isPremium}
                        />
                    ) : (
                        <CoinsTab
                            userUuid={userUuid}
                            sessionInfo={sessionInfo}
                            onCoinsAdded={onCoinsAdded}
                            onClose={onClose}
                            coinBalance={coinBalance}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREMIUM TAB
// ══════════════════════════════════════════════════════════════════════════════
function PremiumTab({ userUuid, sessionInfo, onPremiumGranted, onClose, isPremium }) {
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [successData, setSuccessData] = useState(null);

    if (successData) {
        return (
            <SuccessPanel
                title="Subscribed to Premium! 👑"
                subtitle={`Your ${selectedPlan === 'yearly' ? 'Yearly' : selectedPlan === 'quarterly' ? '3-Month' : 'Monthly'} subscription is now active.`}
                txSig={successData.signature}
                detailedPerks={BENEFITS}
                perkColor="purple"
                ctaLabel="Start Exploring"
                onClose={onClose}
            />
        );
    }

    if (isPremium) {
        const expiresIn = sessionInfo?.user?.user_metadata?.premium_expires_at || "30 Days";
        return (
            <div className="bg-gray-900/60 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4">
                <Crown size={40} className="text-purple-400 mx-auto" />
                <h3 className="text-2xl font-bold text-white">Active Subscription</h3>
                <div className="flex justify-center items-center gap-2 mt-2">
                    <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase">
                        <CheckCircle2 size={13} /> Active Pro
                    </span>
                    <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold">
                        Expires in: {expiresIn}
                    </span>
                </div>
            </div>
        );
    }

    const usdPrice = PLANS[selectedPlan]?.usd || 8.00;

    return (
        <div className="space-y-5">
            <PlanSelector selectedPlan={selectedPlan} setSelectedPlan={setSelectedPlan} />

            <div className="bg-gray-900/60 rounded-2xl border border-gray-800/80 p-4">
                <p className="text-white font-bold text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 text-purple-300">
                    <Sparkles size={14} /> Premium Features Included
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    {BENEFITS.map((b) => (
                        <div key={b.title} className="flex items-start gap-2">
                            <Check size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-gray-200 text-xs font-bold">{b.title}</p>
                                <p className="text-gray-500 text-[11px] leading-tight">{b.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Crypto Checkout Panel */}
            <CryptoCheckoutPanel
                userUuid={userUuid}
                sessionInfo={sessionInfo}
                kind="premium"
                plan={selectedPlan}
                usdPrice={usdPrice}
                onSuccess={(res) => {
                    setSuccessData(res);
                    if (onPremiumGranted) onPremiumGranted({ plan: selectedPlan, txSig: res.signature });
                }}
            />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// COINS TAB
// ══════════════════════════════════════════════════════════════════════════════
function CoinsTab({ userUuid, sessionInfo, onCoinsAdded, onClose, coinBalance }) {
    const [selectedPack, setSelectedPack] = useState(COIN_PACKS[1]); // Default to 'Popular'
    const [successData, setSuccessData] = useState(null);

    if (successData) {
        return (
            <SuccessPanel
                title={`${(selectedPack.coins + selectedPack.bonus).toLocaleString()} Bolt Coins Added! ⚡`}
                subtitle="Your balance has been updated instantly."
                txSig={successData.signature}
                perks={[`+${selectedPack.coins} Base`, `+${selectedPack.bonus} Bonus`, '⚡ Instant Credit']}
                perkColor="purple"
                ctaLabel="Start Chatting"
                onClose={onClose}
            />
        );
    }

    return (
        <div className="space-y-5">
            {/* Pack selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {COIN_PACKS.map((pack) => {
                    const active = selectedPack.id === pack.id;
                    const totalCoins = pack.coins + pack.bonus;
                    return (
                        <button
                            key={pack.id}
                            type="button"
                            onClick={() => setSelectedPack(pack)}
                            className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all ${active
                                ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                                : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                                }`}
                        >
                            {pack.popular && (
                                <span className="absolute -top-2.5 right-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                                    Best Value
                                </span>
                            )}
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-400">{pack.label}</span>
                                {pack.bonus > 0 && (
                                    <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                                        +{pack.bonus} Free
                                    </span>
                                )}
                            </div>
                            <p className="text-2xl font-black text-white">{totalCoins.toLocaleString()}</p>
                            <p className="text-[11px] text-gray-500 mb-3">Bolt Coins</p>
                            <div className="mt-auto pt-2 border-t border-gray-800/80 flex items-center justify-between">
                                <span className="text-sm font-bold text-purple-300">${pack.price}</span>
                                {active && <Check size={14} className="text-purple-400" />}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Crypto Checkout Panel */}
            <CryptoCheckoutPanel
                userUuid={userUuid}
                sessionInfo={sessionInfo}
                kind="coins"
                pack={selectedPack}
                usdPrice={selectedPack.price}
                onSuccess={(res) => {
                    setSuccessData(res);
                    const newTotal = (coinBalance || 0) + selectedPack.coins + selectedPack.bonus;
                    if (onCoinsAdded) onCoinsAdded(newTotal);
                }}
            />
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// CRYPTO CHECKOUT PANEL (Supports Solana SOL/USDT/USDC + Ethereum ETH/USDT/USDC)
// With 1% Slippage Allowance, QR Code, and Auto-Sweep
// ══════════════════════════════════════════════════════════════════════════════
function CryptoCheckoutPanel({
    userUuid,
    sessionInfo,
    kind,
    plan,
    pack,
    usdPrice,
    onSuccess,
}) {
    const [network, setNetwork] = useState('solana'); // 'solana' | 'ethereum'
    const [selectedCoin, setSelectedCoin] = useState('SOL');
    const [order, setOrder] = useState(null);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderError, setOrderError] = useState(null);
    const [copiedAddr, copyAddr] = useCopy();
    const [copiedAmt, copyAmt] = useCopy();
    const [pollCount, setPollCount] = useState(0);
    const pollRef = useRef(null);

    const tokenOptions = network === 'solana' ? [
        { id: 'SOL', label: 'SOL', sub: 'Native' },
        { id: 'USDT_SOL', label: 'USDT', sub: 'Solana SPL' },
        { id: 'USDC_SOL', label: 'USDC', sub: 'Solana SPL' },
    ] : [
        { id: 'ETH', label: 'ETH', sub: 'Native' },
        { id: 'USDT_ETH', label: 'USDT', sub: 'ERC-20' },
        { id: 'USDC_ETH', label: 'USDC', sub: 'ERC-20' },
    ];

    const handleNetworkSwitch = (net) => {
        setNetwork(net);
        setSelectedCoin(net === 'solana' ? 'SOL' : 'ETH');
    };

    // Create Order on token or plan change
    useEffect(() => {
        let active = true;
        setOrderLoading(true);
        setOrderError(null);
        setOrder(null);
        if (pollRef.current) clearInterval(pollRef.current);

        createCryptoPaymentOrder({
            kind,
            plan,
            pack,
            coin: selectedCoin,
            sessionInfo,
        }).then((data) => {
            if (!active) return;
            setOrder(data);
            setOrderLoading(false);
        }).catch((err) => {
            if (!active) return;
            setOrderError(err.message || 'Failed to initialize checkout. Please check server config.');
            setOrderLoading(false);
        });

        return () => {
            active = false;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [kind, plan, pack?.id, selectedCoin]);

    // Poll for on-chain confirmation every 3 seconds
    useEffect(() => {
        if (!order?.orderId) return;

        const poll = async () => {
            try {
                setPollCount(c => c + 1);
                const res = await checkCryptoPaymentOrder({
                    orderId: order.orderId,
                    sessionInfo,
                });

                if (res?.status === 'confirmed') {
                    if (pollRef.current) clearInterval(pollRef.current);
                    onSuccess({
                        signature: order.orderId,
                        amount: order.expectedAmount,
                    });
                }
            } catch (err) {
                console.warn('[Checkout Poll Error]', err.message);
            }
        };

        pollRef.current = setInterval(poll, 3200);
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [order?.orderId]);

    const qrValue = order?.address
        ? (selectedCoin === 'SOL'
            ? `solana:${order.address}?amount=${order.expectedAmount}`
            : order.address)
        : '';

    return (
        <div className="bg-gray-900/80 border border-purple-500/20 rounded-3xl p-5 space-y-5">
            {/* Header: Select Network */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Select Network</p>
                    <span className="text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                        ${usdPrice.toFixed(2)} USD
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-gray-950 p-1 rounded-2xl border border-gray-800">
                    <button
                        type="button"
                        onClick={() => handleNetworkSwitch('solana')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${network === 'solana'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <span>⚡ Solana</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleNetworkSwitch('ethereum')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${network === 'ethereum'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <span>⟠ Ethereum</span>
                    </button>
                </div>
            </div>

            {/* Token Pills */}
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Select Token</p>
                <div className="grid grid-cols-3 gap-2">
                    {tokenOptions.map((token) => {
                        const active = selectedCoin === token.id;
                        return (
                            <button
                                key={token.id}
                                type="button"
                                onClick={() => setSelectedCoin(token.id)}
                                className={`py-2.5 px-3 rounded-xl border text-center transition-all ${active
                                    ? 'border-purple-500 bg-purple-500/15 text-white shadow'
                                    : 'border-gray-800 bg-gray-950/60 text-gray-400 hover:text-white hover:border-gray-700'
                                    }`}
                            >
                                <p className="text-xs font-black">{token.label}</p>
                                <p className="text-[10px] text-gray-500 truncate">{token.sub}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Checkout Order Card */}
            {orderLoading && (
                <div className="py-12 text-center space-y-3">
                    <Loader2 size={26} className="text-purple-400 animate-spin mx-auto" />
                    <p className="text-xs text-gray-400">Generating checkout address...</p>
                </div>
            )}

            {orderError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center space-y-2">
                    <AlertCircle size={20} className="text-red-400 mx-auto" />
                    <p className="text-xs text-red-300 font-semibold">{orderError}</p>
                    <p className="text-[11px] text-gray-400">Make sure PAYMENT_MASTER_SEED is set in your .env file.</p>
                </div>
            )}

            {!orderLoading && !orderError && order && (
                <div className="bg-gray-950/90 rounded-2xl border border-purple-500/20 p-5 space-y-5">
                    {/* Amount to send */}
                    <div className="text-center space-y-1">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">Send Exactly</p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                                {order.expectedAmount}
                            </span>
                            <span className="text-lg font-bold text-purple-400">{order.symbol}</span>
                            <button
                                type="button"
                                onClick={() => copyAmt(String(order.expectedAmount))}
                                className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                                title="Copy Amount"
                            >
                                {copiedAmt ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 px-2.5 py-0.5 rounded-full text-[11px] font-semibold mt-1">
                            <span>✓ 1% Slippage Accepted (Min: {order.minAmount} {order.symbol})</span>
                        </div>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center">
                        <div className="p-3 bg-white rounded-2xl shadow-xl shadow-purple-950/30">
                            <QRCodeSVG
                                value={qrValue}
                                size={150}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                    </div>

                    {/* Deposit Address Box */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
                            <span>Deposit Address ({order.networkName})</span>
                            {copiedAddr && <span className="text-green-400 font-bold">Copied!</span>}
                        </div>
                        <div className="flex items-center gap-2 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                            <p className="font-mono text-xs text-gray-200 truncate flex-1 select-all">
                                {order.address}
                            </p>
                            <button
                                type="button"
                                onClick={() => copyAddr(order.address)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex-shrink-0"
                            >
                                {copiedAddr ? <Check size={13} /> : <Copy size={13} />}
                                <span>{copiedAddr ? 'Copied' : 'Copy'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Status Watching Radar */}
                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-purple-300">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                            </span>
                            <span className="font-medium">Listening on-chain...</span>
                        </div>
                        <span className="text-gray-500 text-[11px]">Instant automated fulfillment</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PLAN SELECTOR SUB-COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
function PlanSelector({ selectedPlan, setSelectedPlan }) {
    const plans = [
        { id: 'monthly', title: 'Monthly', price: '$8', sub: 'Billed monthly' },
        { id: 'quarterly', title: '3 Months', price: '$20', sub: 'Billed quarterly', badge: 'Save 17%' },
        { id: 'yearly', title: 'Yearly', price: '$60', sub: 'Billed yearly', badge: 'Save 38%' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((p) => {
                const active = selectedPlan === p.id;
                return (
                    <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative flex flex-col p-4 rounded-2xl border text-left transition-all ${active
                            ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]'
                            : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                            }`}
                    >
                        {p.badge && (
                            <span className="absolute -top-2.5 right-3 bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow">
                                {p.badge}
                            </span>
                        )}
                        <span className="text-xs font-semibold text-gray-400 mb-1">{p.title}</span>
                        <div className="flex items-baseline gap-1 my-1">
                            <span className="text-3xl font-black text-white">{p.price}</span>
                        </div>
                        <span className="text-[11px] text-gray-500">{p.sub}</span>
                        {active && (
                            <div className="absolute bottom-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                                <Check size={12} className="text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUCCESS PANEL
// ══════════════════════════════════════════════════════════════════════════════
function SuccessPanel({ title, subtitle, txSig, perks, detailedPerks, perkColor = 'purple', ctaLabel, onClose }) {
    return (
        <div className="text-center py-8 space-y-6">
            <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping" />
                <div className="relative w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center shadow-xl shadow-purple-600/40">
                    <CheckCircle2 size={38} className="text-white" />
                </div>
            </div>

            <div>
                <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">{subtitle}</p>
            </div>

            {detailedPerks && (
                <div className="text-left bg-gray-900/60 border border-gray-800 rounded-2xl p-5 max-w-md mx-auto space-y-3">
                    <p className="text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 text-purple-300">
                        <Crown size={15} /> Your Unlocked Perks
                    </p>
                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#7c3aed transparent' }}>
                        {detailedPerks.map((p) => (
                            <div key={p.title} className="flex items-start gap-2">
                                <Check size={13} className="text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-gray-200 text-xs font-bold">{p.title}</p>
                                    <p className="text-gray-500 text-[11px] leading-tight">{p.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {perks && (
                <div className="flex justify-center gap-3 max-w-sm mx-auto">
                    {perks.map((p) => (
                        <div key={p} className="bg-purple-950/40 border border-purple-500/20 px-3 py-2 rounded-xl text-purple-300 text-xs font-bold">
                            {p}
                        </div>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={onClose}
                className="w-full max-w-xs mx-auto py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg shadow-purple-600/30 active:scale-[0.98]"
            >
                {ctaLabel || 'Done'}
            </button>
        </div>
    );
}
