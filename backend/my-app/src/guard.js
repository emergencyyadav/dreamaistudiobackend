/**
 * Content Guard System
 * Centralized list of forbidden terms and patterns to prevent T&C violations.
 */

export const FORBIDDEN_WORDS = [
    'rape',
    'sexual act with minors',
    'sexual act with minor',
    'child porn',
    'underage sex',
    'bestiality',
    'necrophilia',
    'snuff',
    'incest',
    'pedophile',
    'pedophilia',
    'molest',
    'non-consensual',
    'nonconsensual',
    'minor sex',
    'sex with minor',
    'sex with child'
];

/**
 * Checks if a string contains any forbidden patterns.
 * @param {string} text - The content to check.
 * @returns {string | null} - Returns the matched forbidden word, or null if safe.
 */
export const checkContentSafe = (text) => {
    if (!text) return null;
    const lowerText = text.toLowerCase();

    for (const word of FORBIDDEN_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            return word;
        }
    }

    // Pattern check for "sex with [age under 18]"
    const agePattern = /sex\s+with\s+(?:a\s+)?(\d+)\s*year\s*old/i;
    const match = lowerText.match(agePattern);
    if (match && parseInt(match[1]) < 18) {
        return `sexual act with a minor (${match[1]}yo)`;
    }

    return null;
};
