const ITERATIONS = 310000;
const MODE = 'enc-v1';
const KEY_NS = 'dreamai_chat_master_key_v1';

let memoryCache = {
    userId: null,
    key: null,
};

function ensureCrypto() {
    const subtle = globalThis.crypto?.subtle;
    if (!subtle) {
        throw new Error('Secure browser crypto is not available in this environment.');
    }
    return subtle;
}

function keyStorageName(userId) {
    return `${KEY_NS}:${userId}`;
}

function toBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
}

function fromBase64(value) {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function userSalt(userId) {
    return new TextEncoder().encode(`dreamai-chat-master:${userId}:v1`);
}

async function deriveKeyFromPassphrase(passphrase, userId) {
    const subtle = ensureCrypto();
    const material = await subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: userSalt(userId),
            iterations: ITERATIONS,
            hash: 'SHA-256',
        },
        material,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

async function exportKey(key) {
    const subtle = ensureCrypto();
    const raw = await subtle.exportKey('raw', key);
    return toBase64(new Uint8Array(raw));
}

async function importKey(rawBase64) {
    const subtle = ensureCrypto();
    return subtle.importKey(
        'raw',
        fromBase64(rawBase64),
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
    );
}

async function getCachedKey(userId) {
    if (memoryCache.userId === userId && memoryCache.key) {
        return memoryCache.key;
    }

    const fromSession = sessionStorage.getItem(keyStorageName(userId));
    if (fromSession) {
        const key = await importKey(fromSession);
        memoryCache = { userId, key };
        return key;
    }

    const fromLocal = localStorage.getItem(keyStorageName(userId));
    if (fromLocal) {
        const key = await importKey(fromLocal);
        memoryCache = { userId, key };
        sessionStorage.setItem(keyStorageName(userId), fromLocal);
        return key;
    }

    return null;
}

export async function unlockChatKey({ userId, passphrase, remember = false }) {
    if (!userId) throw new Error('User id is required to unlock private chats.');
    if (!passphrase || passphrase.trim().length < 8) {
        throw new Error('Use at least 8 characters for your private chat key.');
    }

    const key = await deriveKeyFromPassphrase(passphrase.trim(), userId);
    const exported = await exportKey(key);
    memoryCache = { userId, key };
    sessionStorage.setItem(keyStorageName(userId), exported);
    if (remember) {
        localStorage.setItem(keyStorageName(userId), exported);
    } else {
        localStorage.removeItem(keyStorageName(userId));
    }
    return key;
}

export function clearChatKey(userId) {
    if (memoryCache.userId === userId) {
        memoryCache = { userId: null, key: null };
    }
    sessionStorage.removeItem(keyStorageName(userId));
    localStorage.removeItem(keyStorageName(userId));
}

export async function hasUnlockedChatKey(userId) {
    return Boolean(await getCachedKey(userId));
}

export function isEncryptedChatPayload(value) {
    return Boolean(
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        value.mode === MODE &&
        typeof value.iv === 'string' &&
        typeof value.ciphertext === 'string'
    );
}

export async function encryptChatMessages(messages, userId) {
    const subtle = ensureCrypto();
    const key = await getCachedKey(userId);
    if (!key) {
        throw new Error('Private chat key is locked.');
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(messages || []));
    const ciphertext = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext
    );

    return {
        mode: MODE,
        alg: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        salt_mode: 'user-uuid-v1',
        iterations: ITERATIONS,
        iv: toBase64(iv),
        ciphertext: toBase64(new Uint8Array(ciphertext)),
    };
}

export async function decryptChatMessages(payload, userId) {
    if (!isEncryptedChatPayload(payload)) {
        return Array.isArray(payload) ? payload : [];
    }

    const subtle = ensureCrypto();
    const key = await getCachedKey(userId);
    if (!key) {
        throw new Error('Private chat key is locked.');
    }

    const plaintext = await subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(payload.iv) },
        key,
        fromBase64(payload.ciphertext)
    );

    const text = new TextDecoder().decode(plaintext);
    const decoded = JSON.parse(text);
    return Array.isArray(decoded) ? decoded : [];
}
