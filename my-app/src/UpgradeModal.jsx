import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    X, Crown, Zap, BadgeCheck, CreditCard, Shield,
    Copy, Check, Loader2, RefreshCw, ExternalLink,
    CheckCircle2, AlertCircle, Clock, ChevronDown,
    Sparkles, ChevronRight, TrendingDown, Coins,
} from 'lucide-react';
import { supabase } from './supabaseClient';
import {
    getOrCreateUserSolanaAddress,
    getLiveSolPrice,
    calcSolAmount,
    pollForPayment,
    PLANS,
    SOLANA_NETWORK,
} from './SolanaPaymentService';
import { backendJson, hasBackend } from './backendApi';

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
    { id: 'starter', coins: 100, bonus: 0, price: 0.99, label: 'Starter', popular: false, color: 'purple' },
    { id: 'popular', coins: 600, bonus: 100, price: 4.99, label: 'Popular', popular: true, color: 'purple' },
    { id: 'power', coins: 2500, bonus: 500, price: 14.99, label: 'Power', popular: false, color: 'pink' },
];

// ── Shared helpers ────────────────────────────────────────────────────────────
function explorerUrl(addr) {
    return `https://solscan.io/account/${addr}${SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`;
}

function useCopy() {
    const [copied, setCopied] = useState(false);
    const copy = useCallback((text) => {
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
    onCoinsAdded,   // callback(newBalance) after coin purchase
}) {
    const [activeTab, setActiveTab] = useState('premium');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div
                className="relative w-full max-w-2xl bg-gray-950 border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col"
                style={{ maxHeight: '92vh' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-900/40 border border-purple-500/20 flex items-center justify-center">
                            <Zap size={20} className="text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-xl tracking-tight">DreamAI Premium</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Current Status: <span className="text-purple-400 font-semibold">{isPremium ? 'Lifetime Pro' : `${coinBalance} Coins`}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 bg-gray-950" style={{ scrollbarWidth: 'thin', scrollbarColor: '#4c1d95 transparent' }}>
                    <PremiumTab userUuid={userUuid} sessionInfo={sessionInfo} onPremiumGranted={onPremiumGranted} onClose={onClose} coinBalance={coinBalance} isPremium={isPremium} />
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// PREMIUM TAB  (monthly/yearly subscription)
// ══════════════════════════════════════════════════════════════════════════════
function PremiumTab({ userUuid, sessionInfo, onPremiumGranted, onClose, coinBalance, isPremium }) {
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [payMethod, setPayMethod] = useState('');
    const [solAddress, setSolAddress] = useState(null);
    const [addrLoading, setAddrLoading] = useState(false);
    const [solUsdPrice, setSolUsdPrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [requiredSol, setRequiredSol] = useState(null);
    const [addrCopied, copyAddr] = useCopy();
    const [payStatus, setPayStatus] = useState('idle');
    const [pollAttempt, setPollAttempt] = useState(0);
    const [pollMax, setPollMax] = useState(40);
    const [txSig, setTxSig] = useState(null);
    const cancelRef = useRef(null);

    const reset = useCallback(() => {
        if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
        setPayMethod(''); setPayStatus('idle'); setPollAttempt(0);
        setSolAddress(null); setRequiredSol(null); setSolUsdPrice(null);
    }, []);

    useEffect(() => {
        if (payMethod !== 'solana' || !userUuid) return;
        if (!solAddress) {
            setAddrLoading(true);
            getOrCreateUserSolanaAddress(userUuid, sessionInfo)
                .then(a => { setSolAddress(a); setAddrLoading(false); })
                .catch(() => setAddrLoading(false));
        }
        setPriceLoading(true);
        getLiveSolPrice().then(p => {
            setSolUsdPrice(p);
            setRequiredSol(calcSolAmount(selectedPlan, p));
            setPriceLoading(false);
        }).catch(() => setPriceLoading(false));
    }, [payMethod, userUuid]);                          // eslint-disable-line

    useEffect(() => {
        if (solUsdPrice && payMethod === 'solana') setRequiredSol(calcSolAmount(selectedPlan, solUsdPrice));
    }, [selectedPlan, solUsdPrice, payMethod]);

    const handleSuccess = useCallback(async (r) => {
        setPayStatus('success'); setTxSig(r.signature); cancelRef.current = null;
        try {
            if (hasBackend) {
                await backendJson('/api/payments/solana/confirm', {
                    method: 'POST',
                    sessionInfo,
                    body: {
                        kind: 'premium',
                        plan: selectedPlan,
                        signature: r.signature,
                        requiredSol,
                        solAddress,
                    }
                });
            } else {
                const expires = selectedPlan === 'yearly'
                    ? new Date(Date.now() + 365 * 86400_000).toISOString()
                    : selectedPlan === 'quarterly'
                        ? new Date(Date.now() + 90 * 86400_000).toISOString()
                        : new Date(Date.now() + 30 * 86400_000).toISOString();
                await supabase.from('users').update({
                    is_premium: true, premium_plan: selectedPlan,
                    premium_expires_at: expires, premium_tx: r.signature,
                    coin_balance: 99999,
                }).eq('uuid', userUuid);
                await supabase.from('payment_logs').insert({
                    user_uuid: userUuid, plan: selectedPlan,
                    amount_sol: r.amount, tx_signature: r.signature, sol_address: solAddress,
                });
            }
            if (onPremiumGranted) onPremiumGranted({ plan: selectedPlan, txSig: r.signature });
        } catch (e) { console.error('[Premium] grant error', e); }
    }, [selectedPlan, requiredSol, solAddress, userUuid, sessionInfo, onPremiumGranted]);

    const startWatch = useCallback(() => {
        if (!solAddress || !requiredSol) return;
        if (cancelRef.current) cancelRef.current();
        setPayStatus('waiting'); setPollAttempt(0);

        cancelRef.current = pollForPayment(solAddress, requiredSol, {
            onTick: (a, m) => { setPollAttempt(a); setPollMax(m); setPayStatus('checking'); },
            onPaid: handleSuccess,
            onError: e => console.error('[Solana]', e),
        });
    }, [solAddress, requiredSol, handleSuccess]);

    const simulateWatch = useCallback(() => {
        if (!solAddress || !requiredSol) return;
        handleSuccess({ signature: 'dev_test_' + Date.now(), amount: requiredSol });
    }, [solAddress, requiredSol, handleSuccess]);

    const changePlan = (p) => { setSelectedPlan(p); reset(); };

    if (payStatus === 'success') return (
        <div className="p-5">
            <SuccessPanel
                title="Subscribed to Premium"
                subtitle={`Your ${selectedPlan === 'yearly' ? 'Yearly' : selectedPlan === 'quarterly' ? '3-Month' : 'Monthly'} subscription is now active.`}
                txSig={txSig}
                detailedPerks={BENEFITS}
                perkColor="purple"
                ctaLabel="Explore Premium!"
                onClose={onClose}
            />
        </div>
    );

    if (isPremium && payStatus !== 'success') {
        const expiresIn = sessionInfo?.user?.user_metadata?.premium_expires_at || "30 Days"; // Fallback or dynamic
        return (
            <div className="p-6">
                <div className="bg-gray-900 border border-purple-500/20 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                    <Crown size={44} className="text-purple-400 mx-auto" />
                    <h3 className="text-2xl font-black text-white">My Plan</h3>

                    <div className="flex justify-center items-center gap-2 mt-2">
                        <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 uppercase tracking-wide">
                            <CheckCircle2 size={14} /> Active Status
                        </span>
                        <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full text-xs font-bold">
                            Expires in: {expiresIn}
                        </span>
                    </div>

                    <div className="mt-6 text-left bg-gray-950/80 p-5 rounded-xl border border-gray-800">
                        <h4 className="text-gray-300 font-bold mb-3 flex items-center gap-2"><Sparkles size={16} className="text-purple-400" /> Subscription & Return Policy</h4>
                        <div className="text-gray-400 text-xs space-y-3 leading-relaxed">
                            <p><strong>Subscription Basic Policy:</strong> Your plan renews automatically at the end of each billing cycle. You may cancel anytime from your account settings to stop future billing, and you will retain access to premium features until the end of your current cycle.</p>
                            <p><strong>Same-Day Refund Policy:</strong> Complete satisfaction is our priority. If you request a cancellation within exactly <strong>24 hours (1 Day)</strong> of your initial purchase, you are eligible for a full 100% refund. Renewals are not eligible for refunds.</p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-800/80 flex items-center gap-2">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-wide">Premium Support:</span>
                            <a href="mailto:dreamaistudio02@gmail.com" className="text-purple-400 text-xs font-semibold hover:text-purple-300">dreamaistudio02@gmail.com</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5 space-y-5">
            <PlanSelector selectedPlan={selectedPlan} setSelectedPlan={changePlan} />

            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-white font-bold text-sm mb-3">Premium Plan Includes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                    {BENEFITS.map(b => (
                        <div key={b.title} className="flex items-start gap-2">
                            <Check size={14} className="text-purple-500 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-300 text-sm font-medium leading-snug">{b.title}</p>
                        </div>
                    ))}
                </div>
            </div>

            {payMethod === '' && (
                <PaymentPicker
                    label={selectedPlan === 'monthly' ? '$8.00 / month' : selectedPlan === 'quarterly' ? '$20.00 / 3 months' : '$60.00 / year'}
                    usdPrice={PLANS[selectedPlan]?.usd}
                    requiredSol={requiredSol}
                    priceLoading={priceLoading}
                    userUuid={userUuid}
                    onSelect={setPayMethod}
                />
            )}
            {payMethod === 'stripe' && <StripePanel price={selectedPlan === 'monthly' ? '$8.00/mo' : selectedPlan === 'quarterly' ? '$20.00/3mo' : '$60.00/yr'} onBack={reset} />}
            {payMethod === 'solana' && (
                <SolanaPayPanel
                    solAddress={solAddress} addrLoading={addrLoading}
                    solUsdPrice={solUsdPrice} priceLoading={priceLoading}
                    requiredSol={requiredSol}
                    addrCopied={addrCopied} copyAddr={copyAddr}
                    payStatus={payStatus} pollAttempt={pollAttempt} pollMax={pollMax}
                    onStartWatch={startWatch} onSimulate={simulateWatch} onBack={reset}
                    badge={selectedPlan === 'monthly' ? 'Monthly' : selectedPlan === 'quarterly' ? 'Quarterly' : 'Yearly · 38% OFF'}
                    usdLabel={`$${PLANS[selectedPlan]?.usd}`}
                    instructions={[
                        'Open any Solana wallet (Phantom, Solflare, etc.)',
                        `Send exactly <b>${requiredSol ?? '...'} SOL</b> to the address above on <b>Solana Mainnet</b>`,
                        'Click the button below — Premium activates within ~30 seconds',
                    ]}
                />
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// COINS TAB  (one-time coin purchases)
// ══════════════════════════════════════════════════════════════════════════════
function CoinsTab({ userUuid, sessionInfo, onCoinsAdded, onClose, coinBalance }) {
    const [selectedPack, setSelectedPack] = useState(null);  // COIN_PACKS item
    const [payMethod, setPayMethod] = useState('');
    const [solAddress, setSolAddress] = useState(null);
    const [addrLoading, setAddrLoading] = useState(false);
    const [solUsdPrice, setSolUsdPrice] = useState(null);
    const [priceLoading, setPriceLoading] = useState(false);
    const [requiredSol, setRequiredSol] = useState(null);
    const [addrCopied, copyAddr] = useCopy();
    const [payStatus, setPayStatus] = useState('idle');
    const [pollAttempt, setPollAttempt] = useState(0);
    const [pollMax, setPollMax] = useState(40);
    const [txSig, setTxSig] = useState(null);
    const cancelRef = useRef(null);

    const reset = useCallback(() => {
        if (cancelRef.current) { cancelRef.current(); cancelRef.current = null; }
        setPayMethod(''); setPayStatus('idle'); setPollAttempt(0);
        setRequiredSol(null); setSolUsdPrice(null);
    }, []);

    const selectPack = (pack) => { setSelectedPack(pack); reset(); };
    const goBack = () => { setSelectedPack(null); reset(); };

    // Load address + live price when Solana chosen
    useEffect(() => {
        if (payMethod !== 'solana' || !userUuid || !selectedPack) return;
        if (!solAddress) {
            setAddrLoading(true);
            getOrCreateUserSolanaAddress(userUuid, sessionInfo)
                .then(a => { setSolAddress(a); setAddrLoading(false); })
                .catch(() => setAddrLoading(false));
        }
        setPriceLoading(true);
        getLiveSolPrice().then(p => {
            setSolUsdPrice(p);
            setRequiredSol(+(selectedPack.price / p).toFixed(6) > 0
                ? Math.ceil((selectedPack.price / p) * 1e6) / 1e6
                : null);
            setPriceLoading(false);
        }).catch(() => setPriceLoading(false));
    }, [payMethod, userUuid, selectedPack?.id]);       // eslint-disable-line

    const handleSuccess = useCallback(async (r) => {
        setPayStatus('success'); setTxSig(r.signature); cancelRef.current = null;
        try {
            const totalCoins = selectedPack.coins + selectedPack.bonus;
            const newBalance = (coinBalance || 0) + totalCoins;

            if (hasBackend) {
                const result = await backendJson('/api/payments/solana/confirm', {
                    method: 'POST',
                    sessionInfo,
                    body: {
                        kind: 'coins',
                        signature: r.signature,
                        requiredSol,
                        solAddress,
                        pack: selectedPack,
                    }
                });
                if (onCoinsAdded) onCoinsAdded(result?.coin_balance ?? newBalance);
            } else {
                await supabase.from('users').update({
                    coin_balance: newBalance,
                }).eq('uuid', userUuid);

                await supabase.from('payment_logs').insert({
                    user_uuid: userUuid,
                    plan: `coins_${selectedPack.id}`,
                    amount_sol: r.amount,
                    tx_signature: r.signature,
                    sol_address: solAddress,
                });

                if (onCoinsAdded) onCoinsAdded(newBalance);
            }
        } catch (e) { console.error('[Coins] credit error', e); }
    }, [selectedPack, coinBalance, requiredSol, solAddress, userUuid, sessionInfo, onCoinsAdded]);

    const startWatch = useCallback(() => {
        if (!solAddress || !requiredSol || !selectedPack) return;
        if (cancelRef.current) cancelRef.current();
        setPayStatus('waiting'); setPollAttempt(0);

        cancelRef.current = pollForPayment(solAddress, requiredSol, {
            onTick: (a, m) => { setPollAttempt(a); setPollMax(m); setPayStatus('checking'); },
            onPaid: handleSuccess,
            onError: e => console.error('[Solana]', e),
        });
    }, [solAddress, requiredSol, selectedPack, handleSuccess]);

    const simulateWatch = useCallback(() => {
        if (!solAddress || !requiredSol || !selectedPack) return;
        handleSuccess({ signature: 'dev_test_' + Date.now(), amount: requiredSol });
    }, [solAddress, requiredSol, selectedPack, handleSuccess]);

    if (payStatus === 'success' && selectedPack) return (
        <div className="p-5">
            <SuccessPanel
                title={`${(selectedPack.coins + selectedPack.bonus).toLocaleString()} Bolt Coins Added! ⚡`}
                subtitle={`Your wallet has been topped up. Current balance reflects the new coins.`}
                txSig={txSig}
                perks={[`+${selectedPack.coins}`, `+${selectedPack.bonus} Bonus`, '⚡ Instant']}
                perkColor="purple"
                ctaLabel="Start Chatting"
                onClose={onClose}
            />
        </div>
    );

    return (
        <div className="p-5 space-y-5">
            {/* Pack grid */}
            {!selectedPack && (
                <>
                    <div className="text-center">
                        <h3 className="text-xl font-black text-white mb-1">Buy Bolt Coins</h3>
                        <p className="text-gray-400 text-sm">1 message = 1 coin · Generate character = 5 coins</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {COIN_PACKS.map(pack => (
                            <div
                                key={pack.id}
                                onClick={() => selectPack(pack)}
                                className={`relative rounded-2xl p-5 flex flex-col items-center text-center cursor-pointer border-2 transition-all group hover:scale-[1.03] active:scale-95 ${pack.popular
                                    ? 'border-purple-500 bg-purple-900/20 shadow-[0_0_25px_rgba(147,51,234,0.2)]'
                                    : 'border-gray-700/60 bg-gray-900/40 hover:border-gray-600'}`}
                            >
                                {pack.popular && (
                                    <div className="absolute -top-3 bg-purple-500 text-white text-[10px] uppercase font-black px-3 py-0.5 rounded-full tracking-wider shadow">
                                        Most Popular
                                    </div>
                                )}
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 mt-2 ${pack.popular ? 'bg-purple-600/30' : 'bg-gray-800'}`}>
                                    <Zap size={26} className={`text-${pack.color}-400 ${pack.popular ? 'fill-purple-400' : ''} group-hover:scale-110 transition-transform`} />
                                </div>
                                <h4 className="text-2xl font-black text-white mb-0.5">{pack.coins.toLocaleString()}</h4>
                                <p className="text-xs text-gray-500">Bolt Coins</p>
                                {pack.bonus > 0 && (
                                    <p className="text-xs text-purple-300 font-semibold mt-0.5">+{pack.bonus} Bonus</p>
                                )}
                                <div className="mt-3 w-full">
                                    <div className={`w-full py-2.5 rounded-xl font-black text-sm transition-all ${pack.popular
                                        ? 'bg-purple-600 text-white group-hover:bg-purple-500 shadow shadow-purple-600/40'
                                        : 'bg-gray-800 text-white group-hover:bg-gray-700'}`}>
                                        ${pack.price.toFixed(2)}
                                    </div>
                                </div>
                                {pack.bonus > 0 && (
                                    <p className="text-[10px] text-gray-600 mt-1.5">
                                        {((pack.coins + pack.bonus) / pack.price).toFixed(0)} coins per $1
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3 text-center">
                        <p className="text-amber-400/80 text-xs">
                            <Sparkles size={11} className="inline-block mr-1" />
                            Tip: <strong>Premium</strong> gives unlimited coins — better value for daily users.
                        </p>
                    </div>
                </>
            )}

            {/* Pack selected → show payment picker or panels */}
            {selectedPack && payMethod === '' && (
                <>
                    {/* Selected pack summary */}
                    <div className="flex items-center gap-3">
                        <button onClick={goBack} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors">
                            <ChevronDown size={16} className="rotate-90" />
                        </button>
                        <div className="flex-1 bg-gray-900/70 border border-gray-800 rounded-2xl px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center">
                                    <Zap size={20} className="text-purple-400 fill-purple-400" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-sm">
                                        {selectedPack.coins.toLocaleString()}
                                        {selectedPack.bonus > 0 && <span className="text-purple-400 text-xs ml-1">+{selectedPack.bonus} bonus</span>}
                                        <span className="text-gray-400 font-normal"> Bolt Coins</span>
                                    </p>
                                    <p className="text-gray-500 text-xs">{selectedPack.label} pack</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white font-black text-lg">${selectedPack.price.toFixed(2)}</p>
                                <p className="text-gray-600 text-xs">one-time</p>
                            </div>
                        </div>
                    </div>

                    <PaymentPicker
                        label={`$${selectedPack.price.toFixed(2)} one-time`}
                        usdPrice={selectedPack.price}
                        requiredSol={requiredSol}
                        priceLoading={priceLoading}
                        userUuid={userUuid}
                        onSelect={setPayMethod}
                    />
                </>
            )}

            {selectedPack && payMethod === 'stripe' && (
                <StripePanel price={`$${selectedPack.price.toFixed(2)}`} onBack={reset} />
            )}

            {selectedPack && payMethod === 'solana' && (
                <>
                    {/* Pack reminder */}
                    <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-500/20 rounded-xl px-4 py-2.5">
                        <Zap size={15} className="text-purple-400 fill-purple-400 flex-shrink-0" />
                        <span className="text-purple-300 text-sm font-bold">
                            {selectedPack.coins.toLocaleString()}
                            {selectedPack.bonus > 0 && ` + ${selectedPack.bonus} bonus`} Bolt Coins
                        </span>
                        <span className="ml-auto text-gray-500 text-xs">for ${selectedPack.price.toFixed(2)}</span>
                        <button onClick={reset} className="text-gray-600 hover:text-gray-400 transition-colors">
                            <ChevronDown size={14} className="rotate-90" />
                        </button>
                    </div>

                    <SolanaPayPanel
                        solAddress={solAddress} addrLoading={addrLoading}
                        solUsdPrice={solUsdPrice} priceLoading={priceLoading}
                        requiredSol={requiredSol}
                        addrCopied={addrCopied} copyAddr={copyAddr}
                        payStatus={payStatus} pollAttempt={pollAttempt} pollMax={pollMax}
                        onStartWatch={startWatch} onSimulate={simulateWatch} onBack={reset}
                        badge="One-Time Purchase"
                        usdLabel={`$${selectedPack.price.toFixed(2)}`}
                        instructions={[
                            'Open any Solana wallet (Phantom, Solflare, etc.)',
                            `Send exactly <b>${requiredSol ?? '...'} SOL</b> to the address on <b>Solana Mainnet</b>`,
                            'Click the button below — coins are credited within ~30 seconds',
                        ]}
                    />
                </>
            )}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function PlanSelector({ selectedPlan, setSelectedPlan }) {
    const plans = [
        { id: 'monthly', title: 'Monthly', price: '$8', sub: 'Billed monthly' },
        { id: 'quarterly', title: '3 Months', price: '$20', sub: 'Billed quarterly' },
        { id: 'yearly', title: 'Yearly', price: '$60', sub: 'Billed yearly', badge: 'Save 38%' },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map(p => {
                const active = selectedPlan === p.id;
                return (
                    <button
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`relative flex flex-col p-4 rounded-xl border text-left transition-colors ${active
                            ? 'border-purple-500 bg-purple-900/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                            : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                            }`}
                    >
                        {p.badge && (
                            <div className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                                {p.badge}
                            </div>
                        )}
                        <p className={`text-xs font-semibold ${active ? 'text-purple-400' : 'text-gray-400'} mb-1`}>{p.title}</p>
                        <div className="flex items-baseline gap-1 mt-auto">
                            <span className="text-2xl font-bold text-white">{p.price}</span>
                        </div>
                        <p className="text-xs mt-1 text-gray-500">{p.sub}</p>
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

// ─── Payment Method Picker (reused by both tabs) ──────────────────────────────
function PaymentPicker({ label, usdPrice, requiredSol, priceLoading, userUuid, onSelect }) {
    return (
        <div className="space-y-3">
            <p className="text-center text-xs text-gray-500 uppercase tracking-wider font-semibold">Choose Payment Method</p>

            {/* Stripe */}
            <button
                onClick={() => onSelect('stripe')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-700/60 bg-gray-900/40 hover:border-blue-500/40 hover:bg-blue-900/10 transition-all group"
            >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow">
                    <CreditCard size={22} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                    <p className="text-white font-bold text-sm">Credit / Debit Card</p>
                    <p className="text-gray-500 text-xs mt-0.5">{label} · Via Stripe · Visa, Mastercard, AMEX</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Shield size={13} className="text-blue-400" />
                    <span className="text-blue-400 text-xs font-semibold">Secure</span>
                    <ChevronRight size={15} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
            </button>

            {/* Solana */}
            {userUuid ? (
                <button
                    onClick={() => onSelect('solana')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-purple-700/40 bg-gradient-to-r from-purple-950/50 to-indigo-950/50 hover:border-purple-400/60 hover:bg-purple-900/20 transition-all group shimmer-btn"
                >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(147,51,234,0.4)]">
                        <SolanaLogo />
                    </div>
                    <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                            <p className="text-white font-bold text-sm">Solana (SOL)</p>
                            <span className="text-[10px] font-black bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full uppercase border border-purple-500/30">Crypto</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                            {priceLoading
                                ? 'Fetching live SOL price...'
                                : requiredSol
                                    ? `${requiredSol} SOL = ${label} · Instant on-chain`
                                    : `${label} in SOL · Live rate`}
                        </p>
                    </div>
                    <ChevronRight size={15} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                </button>
            ) : (
                <div className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed">
                    <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center"><Zap size={20} className="text-gray-600" /></div>
                    <div>
                        <p className="text-gray-500 font-bold text-sm">Solana (SOL)</p>
                        <p className="text-gray-600 text-xs">Sign in to use crypto payment</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Stripe Placeholder Panel ─────────────────────────────────────────────────
function StripePanel({ price, onBack }) {
    return (
        <div className="bg-gray-900/60 border border-blue-500/20 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                    <ChevronDown size={16} className="rotate-90" />
                </button>
                <CreditCard size={18} className="text-blue-400" />
                <h3 className="text-white font-bold">Pay with Card</h3>
            </div>
            <div className="bg-blue-900/15 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={17} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="text-blue-300 font-semibold text-sm">Stripe Integration Coming Soon</p>
                    <p className="text-blue-400/70 text-xs mt-1">Card payments are being set up. Use Solana (SOL) for instant payment right now.</p>
                </div>
            </div>
            <div className="p-4 bg-gray-950/60 rounded-xl border border-gray-800 flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-xs mb-0.5">Total</p>
                    <p className="text-white font-black text-2xl">{price}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Secured via Stripe</p>
                </div>
                <Shield size={28} className="text-blue-500/40" />
            </div>
            <button disabled className="w-full py-3.5 rounded-xl bg-gray-800 text-gray-500 font-bold cursor-not-allowed flex items-center justify-center gap-2">
                <CreditCard size={16} />Card Payment (Coming Soon)
            </button>
            <button onClick={onBack} className="w-full py-2 text-gray-600 text-sm hover:text-gray-400 transition-colors">← Go back</button>
        </div>
    );
}

// ─── Solana Pay Panel (shared by Premium + Coins) ─────────────────────────────
function SolanaPayPanel({
    solAddress, addrLoading, solUsdPrice, priceLoading, requiredSol,
    addrCopied, copyAddr, payStatus, pollAttempt, pollMax,
    onStartWatch, onSimulate, onBack, badge, usdLabel, instructions,
}) {
    const isWaiting = payStatus === 'waiting' || payStatus === 'checking';
    const pct = pollMax > 0 ? Math.min((pollAttempt / pollMax) * 100, 100) : 0;

    return (
        <div className="bg-gray-900/60 border border-purple-500/20 rounded-2xl p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                {!isWaiting && (
                    <button onClick={onBack} className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <ChevronDown size={16} className="rotate-90" />
                    </button>
                )}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Zap size={12} className="text-white" fill="currentColor" />
                </div>
                <h3 className="text-white font-bold">Pay with Solana</h3>
                <span className="ml-auto text-xs font-semibold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">{badge}</span>
            </div>

            {/* Amount */}
            <div className="bg-gray-950/80 rounded-xl border border-purple-800/40 p-4">
                <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold text-center mb-2">Send Exactly</p>
                {priceLoading || !requiredSol ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                        <Loader2 size={18} className="text-purple-400 animate-spin" />
                        <span className="text-gray-400 text-sm">Fetching live SOL price...</span>
                    </div>
                ) : (
                    <>
                        <div className="flex items-baseline justify-center gap-2">
                            <span className="text-4xl font-black text-white">{requiredSol}</span>
                            <span className="text-purple-400 font-bold text-xl">SOL</span>
                        </div>
                        <div className="flex items-center justify-center gap-3 mt-1.5">
                            <span className="text-gray-500 text-xs">= {usdLabel} USD</span>
                            <span className="text-gray-700">·</span>
                            <span className="text-xs text-green-400/80 flex items-center gap-1">
                                <TrendingDown size={11} />
                                1 SOL = ${solUsdPrice?.toFixed(2)}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Address + QR */}
            {addrLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                    <Loader2 size={30} className="text-purple-400 animate-spin" />
                    <p className="text-gray-400 text-sm">Loading your payment address...</p>
                    <p className="text-gray-600 text-xs">Permanently linked to your account</p>
                </div>
            ) : solAddress ? (
                <div className="space-y-4">
                    {/* QR */}
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-2xl" style={{ animation: 'glow-pulse 3s ease-in-out infinite' }}>
                            <QRCodeSVG
                                value={requiredSol
                                    ? `solana:${solAddress}?amount=${requiredSol}&label=DreamAI`
                                    : solAddress}
                                size={160} level="M" includeMargin={false} fgColor="#1a0533"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="bg-gray-950/80 rounded-xl border border-gray-800 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Payment Address</p>
                            <span className="text-[10px] text-green-400/70 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                                Permanent · Your account
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="text-purple-300 text-xs font-mono flex-1 break-all leading-relaxed">{solAddress}</code>
                            <button
                                onClick={() => copyAddr(solAddress)}
                                className={`flex-shrink-0 p-2 rounded-lg transition-all ${addrCopied ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400 hover:bg-purple-800/40 hover:text-purple-300'}`}
                            >
                                {addrCopied ? <Check size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2">
                        <p className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle size={12} />How to Pay
                        </p>
                        <ol className="text-amber-300/80 text-xs space-y-1.5 pl-1">
                            {instructions.map((step, i) => (
                                <li key={i} dangerouslySetInnerHTML={{ __html: `${i + 1}. ${step}` }} />
                            ))}
                        </ol>
                    </div>

                    {/* Solscan */}
                    <a href={explorerUrl(solAddress)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-purple-400 transition-colors justify-center">
                        <ExternalLink size={11} />View address on Solscan
                    </a>

                    {/* CTA */}
                    {payStatus === 'idle' && requiredSol && (
                        <div className="space-y-2">
                            <button
                                onClick={onStartWatch}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-base hover:shadow-[0_0_35px_rgba(147,51,234,0.5)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={18} />
                                I've Sent Payment — Verify Now
                            </button>
                            <button
                                onClick={onSimulate}
                                className="w-full py-2 bg-gray-800 text-gray-400 text-xs font-bold rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                            >
                                [DEV] Simulate Payment Success
                            </button>
                        </div>
                    )}
                    {!requiredSol && payStatus === 'idle' && (
                        <p className="text-center text-yellow-400 text-xs animate-pulse">Fetching current SOL price...</p>
                    )}

                    {/* Waiting */}
                    {isWaiting && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-purple-900/20 border border-purple-500/20 rounded-xl p-4">
                                <RefreshCw size={22} className="text-purple-400 spin-slow flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-bold">Scanning Blockchain...</p>
                                    <p className="text-gray-400 text-xs mt-0.5">Every 15 s · Check {pollAttempt}/{pollMax}</p>
                                </div>
                                <p className="text-purple-300 text-xs font-mono">~{Math.max(0, Math.floor((pollMax - pollAttempt) * 15 / 60))}m left</p>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-center text-gray-600 text-xs flex items-center justify-center gap-1.5">
                                <Clock size={11} />Keep this window open until confirmed
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-center py-8 space-y-2">
                    <AlertCircle size={28} className="text-red-400 mx-auto" />
                    <p className="text-red-400 text-sm font-semibold">Could not load payment address</p>
                    <p className="text-gray-500 text-xs">Check your connection or try card payment.</p>
                </div>
            )}
        </div>
    );
}

// ─── Success Panel (reused by Premium + Coins) ────────────────────────────────
function SuccessPanel({ title, subtitle, txSig, perks, detailedPerks, perkColor = 'green', ctaLabel, onClose }) {
    const col = perkColor === 'purple'
        ? 'bg-purple-900/20 border-purple-500/20 text-purple-400'
        : 'bg-green-900/20 border-green-500/20 text-green-400';
    const btnClass = perkColor === 'purple'
        ? 'bg-purple-600 hover:bg-purple-700'
        : 'bg-green-600 hover:bg-green-700';
    const ringCol = perkColor === 'purple' ? 'bg-purple-500/20' : 'bg-green-500/20';
    const iconBg = perkColor === 'purple'
        ? 'bg-purple-500'
        : 'bg-green-500';

    return (
        <div className="text-center py-8 space-y-5">
            <div className="relative mx-auto w-24 h-24">
                <div className={`absolute inset-0 ${ringCol} rounded-full`} />
                <div className={`relative w-24 h-24 ${iconBg} rounded-full flex items-center justify-center`}>
                    <CheckCircle2 size={44} className="text-white" />
                </div>
            </div>
            <div>
                <h3 className="text-2xl font-black text-white mb-2">{title}</h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">{subtitle}</p>
            </div>
            {txSig && (
                <a
                    href={`https://solscan.io/tx/${txSig}${SOLANA_NETWORK === 'devnet' ? '?cluster=devnet' : ''}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-500/20"
                >
                    <ExternalLink size={11} />View transaction on Solscan
                </a>
            )}
            {detailedPerks ? (
                <div className="text-left bg-gray-950/50 border border-gray-800 rounded-xl p-4 max-w-sm mx-auto shadow-inner">
                    <p className="text-white font-bold text-sm mb-3 pb-2 border-b border-gray-800/80 text-center flex items-center justify-center gap-2">
                        <Crown size={16} className={perkColor === 'purple' ? 'text-purple-400' : 'text-green-400'} />
                        Your Premium Perks
                    </p>
                    <div className="flex flex-col gap-2.5 max-h-52 overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: perkColor === 'purple' ? '#a855f7 transparent' : '#22c55e transparent' }}>
                        {detailedPerks.map(p => (
                            <div key={p.title} className="flex items-start gap-2.5 group">
                                <div className={`mt-0.5 rounded-full p-0.5 flex-shrink-0 transition-colors ${perkColor === 'purple' ? 'bg-purple-900/40 text-purple-400 group-hover:bg-purple-500/20' : 'bg-green-900/40 text-green-400 group-hover:bg-green-500/20'}`}>
                                    <Check size={12} strokeWidth={3} />
                                </div>
                                <div className="leading-snug">
                                    <p className="text-gray-200 text-sm font-bold">{p.title}</p>
                                    {p.desc && <p className="text-gray-500 text-xs mt-0.5">{p.desc}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : perks ? (
                <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                    {perks.map(p => (
                        <div key={p} className={`border rounded-xl p-3 ${col}`}>
                            <p className="text-xs font-bold">{p}</p>
                        </div>
                    ))}
                </div>
            ) : null}
            <button onClick={onClose} className={`w-full py-3.5 rounded-xl text-white font-bold transition-colors ${btnClass}`}>
                {ctaLabel}
            </button>
        </div>
    );
}

// ─── Solana Logo SVG ──────────────────────────────────────────────────────────
function SolanaLogo() {
    return (
        <svg width="22" height="22" viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sla" x1="360.88" y1="35.15" x2="141.02" y2="310.41" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9945FF" /><stop offset=".91" stopColor="#14F195" />
                </linearGradient>
                <linearGradient id="slb" x1="264.56" y1="-11.18" x2="44.7" y2="263.08" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9945FF" /><stop offset=".91" stopColor="#14F195" />
                </linearGradient>
                <linearGradient id="slc" x1="312.55" y1="12.11" x2="92.69" y2="287.37" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9945FF" /><stop offset=".91" stopColor="#14F195" />
                </linearGradient>
            </defs>
            <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#sla)" />
            <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#slb)" />
            <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" fill="url(#slc)" />
        </svg>
    );
}
