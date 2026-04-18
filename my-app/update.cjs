const fs = require('fs');
let content = fs.readFileSync('src/UpgradeModal.jsx', 'utf8');

const newBenefits = `const BENEFITS = [
    { icon: '💬', title: 'Unlimited Messages', desc: 'Up to 5,000 msgs/month to avoid abuse.' },
    { icon: '🖼️', title: '100 Image Generations', desc: 'Create stunning visuals for your chats.' },
    { icon: '🎬', title: 'Video Generation', desc: 'Text-to-Video & Img-to-Video (10/month).' },
    { icon: '🎭', title: 'More Characters', desc: 'Plus ability to make characters Private/Public.' },
    { icon: '👑', title: 'Leaderboard Push', desc: 'Boost your created characters in rankings.' },
    { icon: '⚡', title: '1000 FREE Tokens', desc: 'Instantly loaded to spend on extras.' },
    { icon: '🎙️', title: 'Voice & Speech', desc: 'Listen to messages + Custom speech.' },
    { icon: '🔓', title: 'Full NSFW Access', desc: 'No restrictions on explicit content.' },
    { icon: '🚀', title: 'Faster Generation', desc: 'VIP priority queue for instant replies.' },
];`;

content = content.replace(/const BENEFITS = \[[\s\S]*?\];/, newBenefits);

const newPlans = `function PlanSelector({ selectedPlan, setSelectedPlan }) {
    const plans = [
        { id: 'monthly', title: '1 Month', price: '$8', sub: 'Billed monthly', activeBorder: 'border-purple-500', inactiveBorder: 'border-purple-500/50', bg: 'bg-purple-900/20' },
        { id: 'quarterly', title: '3 Months', price: '$20', sub: '≈ $6.67/mo', activeBorder: 'border-purple-400', inactiveBorder: 'border-purple-400/50', bg: 'bg-purple-900/30', badge: 'Popular 🔥' },
        { id: 'yearly', title: '12 Months', price: '$60', sub: '≈ $5.00/mo', activeBorder: 'border-amber-400', inactiveBorder: 'border-amber-500/50', bg: 'bg-amber-900/20', badge: 'Best Value ⭐', glow: true },
    ];

    return (
        <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-red-500/20 via-purple-500/20 to-red-500/20 border border-red-500/30 p-2 text-center">
                <div className="absolute inset-0 shimmer-btn opacity-30 pointer-events-none"></div>
                <p className="text-red-400 text-xs font-black uppercase tracking-widest animate-pulse">
                    ⏳ Launch offer ends soon! Prices rising in 48 hours.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map(p => {
                    const active = selectedPlan === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setSelectedPlan(p.id)}
                            className={\`relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-300 active:scale-95 \${
                                active 
                                    ? \`\${p.activeBorder} \${p.bg} shadow-[0_0_25px_rgba(147,51,234,\${p.glow ? '0.4' : '0.2'})]\`
                                    : \`\${p.inactiveBorder} bg-gray-900/40 hover:border-gray-500/60\`
                            }\`}
                        >
                            {p.badge && (
                                <div className={\`absolute -top-3 left-1/2 -translate-x-1/2 \${p.id === 'yearly' ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'} text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-lg whitespace-nowrap\`}>
                                    {p.badge}
                                </div>
                            )}
                            {active && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center shadow">
                                    <Check size={12} className="text-white" />
                                </div>
                            )}
                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1 text-center">{p.title}</p>
                            <div className="flex items-baseline justify-center gap-1 mt-auto">
                                <span className="text-3xl font-black text-white">{p.price}</span>
                            </div>
                            <p className="text-xs mt-1 font-medium text-purple-300/80 text-center">{p.sub}</p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}`;

content = content.replace(/function PlanSelector\(\{ selectedPlan, setSelectedPlan \}\) \{[\s\S]*?    \);\n\}/, newPlans);

// Also update hardcoded fallback prices in PaymentPicker and related components
content = content.replace(/'\$4\.99 \/ month' : '\$39\.99 \/ year'/g, `selectedPlan === 'monthly' ? '$8.00 / month' : selectedPlan === 'quarterly' ? '$20.00 / 3 months' : '$60.00 / year'`);
content = content.replace(/'\$4\.99\/month' : '\$39\.99\/year'/g, `selectedPlan === 'monthly' ? '$8.00/mo' : selectedPlan === 'quarterly' ? '$20.00/3mo' : '$60.00/yr'`);
content = content.replace(/badge=\{selectedPlan === 'monthly' \? 'Monthly' : 'Yearly · 33% OFF'\}/g, `badge={selectedPlan === 'monthly' ? 'Monthly' : selectedPlan === 'quarterly' ? 'Quarterly' : 'Yearly · 38% OFF'}`);

// Also fix PLANS references
content = content.replace(/const expires = selectedPlan === 'yearly'\s*\?\s*new Date\(Date.now\(\) \+ 365 \* 86400_000\)\.toISOString\(\)\s*:\s*new Date\(Date.now\(\) \+ 30 \* 86400_000\)\.toISOString\(\);/g, `const expires = selectedPlan === 'yearly'
                            ? new Date(Date.now() + 365 * 86400_000).toISOString()
                            : selectedPlan === 'quarterly'
                            ? new Date(Date.now() + 90 * 86400_000).toISOString()
                            : new Date(Date.now() + 30 * 86400_000).toISOString();`);

fs.writeFileSync('src/UpgradeModal.jsx', content);
console.log('Update Complete!');
