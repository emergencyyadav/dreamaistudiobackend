import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, FileText, Lock, Shield } from 'lucide-react';

const POLICY_CONTENT = {
    terms: {
        label: 'Terms',
        icon: FileText,
        updated: 'March 31, 2026',
        title: 'Terms of Service',
        intro: 'These terms explain the rules for using DreamAI, including account eligibility, acceptable use, and how platform features are provided.',
        sections: [
            {
                heading: 'Who can use DreamAI',
                body: 'You must be legally allowed to use this service in your region and you are responsible for keeping your account access secure. After login, age verification is required before you can continue into the full experience.'
            },
            {
                heading: 'Acceptable use',
                body: 'You may not use DreamAI to generate or promote illegal content, exploitation, harassment, or attempts to bypass safety protections. Severe violations can lead to immediate suspension or permanent removal.'
            },
            {
                heading: 'Service behavior',
                body: 'AI output can be imperfect, fictional, or unexpected. You remain responsible for how you use prompts, generated media, and conversations created through the platform.'
            },
            {
                heading: 'Accounts and access',
                body: 'We may limit, suspend, or terminate access when we detect abuse, fraud, safety violations, or attempts to interfere with the app or other users.'
            }
        ]
    },
    privacy: {
        label: 'Privacy',
        icon: Lock,
        updated: 'March 31, 2026',
        title: 'Privacy Policy',
        intro: 'This page explains what DreamAI stores, how account and app data are used, and the principles behind data handling in the product.',
        sections: [
            {
                heading: 'What we collect',
                body: 'We collect account details, app activity needed to provide features, and the content you create or save, such as chats, prompts, and character settings.'
            },
            {
                heading: 'How data is used',
                body: 'Your data is used to run the service, protect accounts, improve reliability, and deliver features like saved chats, generated images, and premium access.'
            },
            {
                heading: 'What we do not do',
                body: 'We do not sell your private chat history or account data as a product. Protected actions and provider keys stay on the backend rather than being exposed in the browser.'
            },
            {
                heading: 'Deletion and control',
                body: 'You can request removal of account data through account deletion flows. Some records may be retained only where required for fraud prevention, abuse handling, or legal compliance.'
            }
        ]
    },
    cookies: {
        label: 'Cookies',
        icon: Shield,
        updated: 'March 31, 2026',
        title: 'Cookie Policy',
        intro: 'This page covers how cookies and similar storage are used to keep sessions working, remember settings, and support analytics or performance preferences.',
        sections: [
            {
                heading: 'Essential cookies',
                body: 'These are required for login state, session integrity, security checks, and core product behavior. Without them, the app cannot function correctly.'
            },
            {
                heading: 'Preference cookies',
                body: 'These remember choices such as accepted cookie settings, interface preferences, and other quality-of-life options that personalize your experience.'
            },
            {
                heading: 'Performance and analytics',
                body: 'These help us understand how the app is used so we can improve speed, reliability, and usability. They are separate from essential functionality.'
            },
            {
                heading: 'Your choices',
                body: 'You can accept all cookies, keep only essential cookies, or manage preferences from the banner. Browser controls may also let you block or remove stored cookies.'
            }
        ]
    }
};

export default function PolicyModal({ isOpen, initialSection = 'terms', onClose }) {
    const [activeSection, setActiveSection] = useState(initialSection);

    useEffect(() => {
        if (isOpen) {
            setActiveSection(initialSection || 'terms');
        }
    }, [initialSection, isOpen]);

    const content = useMemo(() => POLICY_CONTENT[activeSection] || POLICY_CONTENT.terms, [activeSection]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xl">
            <div className="absolute inset-0" onClick={onClose} />

            <div className="relative flex h-[min(92vh,860px)] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0a0a12] shadow-[0_30px_120px_rgba(0,0,0,0.72)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.08),transparent_32%)]" />

                <aside className="relative hidden w-64 flex-col justify-between border-r border-white/8 bg-white/[0.02] p-6 md:flex">
                    <div>
                        <button
                            onClick={onClose}
                            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/60 transition-colors hover:text-white"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>

                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-fuchsia-200/70">DreamAI Legal</p>
                        <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white">Policies</h2>
                        <p className="text-sm leading-relaxed text-white/50">
                            Clean, readable pages for the terms that matter while using the platform.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {Object.entries(POLICY_CONTENT).map(([key, item]) => {
                            const Icon = item.icon;
                            const active = key === activeSection;

                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveSection(key)}
                                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                                        active
                                            ? 'border-fuchsia-400/25 bg-fuchsia-500/10 text-white'
                                            : 'border-white/6 bg-transparent text-white/55 hover:border-white/12 hover:bg-white/[0.03] hover:text-white'
                                    }`}
                                >
                                    <Icon size={16} className={active ? 'text-fuchsia-300' : 'text-white/40'} />
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className="relative flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-8">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10">
                                <content.icon size={18} className="text-fuchsia-300" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-xl font-semibold tracking-tight text-white">{content.title}</h3>
                                <p className="text-xs uppercase tracking-[0.24em] text-white/35">Updated {content.updated}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:hidden">
                            {Object.entries(POLICY_CONTENT).map(([key, item]) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveSection(key)}
                                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                                        key === activeSection ? 'bg-white text-black' : 'bg-white/5 text-white/55'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
                        <div className="mx-auto max-w-3xl">
                            <p className="mb-10 max-w-2xl text-base leading-relaxed text-white/62">
                                {content.intro}
                            </p>

                            <div className="space-y-6">
                                {content.sections.map((section) => (
                                    <section
                                        key={section.heading}
                                        className="rounded-3xl border border-white/8 bg-white/[0.03] p-6 transition-colors"
                                    >
                                        <h4 className="mb-3 text-lg font-semibold tracking-tight text-white">
                                            {section.heading}
                                        </h4>
                                        <p className="text-sm leading-7 text-white/58">
                                            {section.body}
                                        </p>
                                    </section>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
