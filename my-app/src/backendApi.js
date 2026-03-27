const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export const BACKEND_URL = trimTrailingSlash(
    import.meta.env.VITE_BACKEND_URL || ''
);

export const hasBackend = Boolean(BACKEND_URL);

export const buildBackendUrl = (path) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${BACKEND_URL}${normalizedPath}`;
};

export async function backendFetch(path, { sessionInfo, headers = {}, body, ...options } = {}) {
    if (!hasBackend) {
        throw new Error('Backend is not configured. Set VITE_BACKEND_URL.');
    }

    const finalHeaders = { ...headers };
    const token =
        sessionInfo?.access_token ||
        sessionInfo?.session?.access_token ||
        sessionInfo?.currentSession?.access_token ||
        null;

    if (token && !finalHeaders.Authorization) {
        finalHeaders.Authorization = `Bearer ${token}`;
    }

    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isFormData && !finalHeaders['Content-Type']) {
        finalHeaders['Content-Type'] = 'application/json';
    }

    return fetch(buildBackendUrl(path), {
        ...options,
        headers: finalHeaders,
        body: body === undefined || isFormData || typeof body === 'string'
            ? body
            : JSON.stringify(body),
    });
}

export async function backendJson(path, options = {}) {
    const response = await backendFetch(path, options);
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text();

    if (!response.ok) {
        const message =
            (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
            `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return payload;
}
