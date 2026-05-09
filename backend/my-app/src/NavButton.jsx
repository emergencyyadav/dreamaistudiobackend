import React from 'react';

export default function NavButton({
    icon: Icon,
    label,
    active = false,
    accent = false,
    variant = 'default', // 'default', 'upgrade', 'bottom', or 'mobile'
    sidebarOpen = true,
    onClick
}) {
    if (variant === 'upgrade') {
        return (
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/40 hover:scale-105 active:scale-95 ${!sidebarOpen ? 'justify-center' : ''}`}
            >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{label}</span>}
            </button>
        );
    }

    if (variant === 'bottom') {
        return (
            <button
                onClick={onClick}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-purple-900/20 hover:text-purple-300 transition-all duration-200 ${!sidebarOpen ? 'justify-center' : ''}`}
            >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && (
                    <span className="text-sm font-medium">{label}</span>
                )}
            </button>
        );
    }

    if (variant === 'mobile') {
        return (
            <button
                onClick={onClick}
                className="relative flex flex-col items-center justify-end gap-1 p-1 group w-16 h-12"
            >
                <Icon size={22} className={`transition-all duration-300 ${active ? 'text-purple-400 -translate-y-1' : 'text-gray-500 group-hover:text-purple-300 group-hover:-translate-y-1'}`} />
                <span className={`text-[10px] font-semibold transition-colors tracking-wide ${active ? 'text-purple-300' : 'text-gray-500 group-hover:text-purple-300'}`}>
                    {label}
                </span>
                {active && (
                    <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></div>
                )}
            </button>
        );
    }

    // default variant for main sidebar items
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
        ${active
                    ? 'bg-purple-600/20 text-purple-300 shadow-lg shadow-purple-500/10'
                    : accent
                        ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-purple-300 hover:from-purple-600/30 hover:to-pink-600/30'
                        : 'text-gray-400 hover:bg-purple-900/20 hover:text-purple-300'
                } ${!sidebarOpen ? 'justify-center' : ''}`}
        >
            <Icon
                size={22}
                className={`flex-shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-purple-400' : ''}`}
            />
            {sidebarOpen && (
                <span className="text-sm font-medium">{label}</span>
            )}
            {active && sidebarOpen && (
                <div className="ml-auto w-2 h-2 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50"></div>
            )}
        </button>
    );
}
