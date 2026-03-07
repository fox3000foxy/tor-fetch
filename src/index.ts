import originalFetch, { RequestInit, Response } from 'node-fetch';

import { TorProcessManager } from './TorProcessManager.js';

export interface ProxiedFetchOptions extends RequestInit {
    killTor?: boolean;
    proxyUrl?: string;
}

const torProcessManager = new TorProcessManager();

export async function proxiedFetch(url: string, options?: ProxiedFetchOptions): Promise<Response> {
    const {
        killTor = true,
        proxyUrl = 'socks5h://127.0.0.1:9050',
        ...fetchOptions
    } = options ?? {};

    await torProcessManager.start();

    try {
        return await originalFetch(url, {
            ...fetchOptions,
            agent: torProcessManager.createAgent(proxyUrl)
        });
    } catch (error) {
        console.error(`Error fetching ${url} through proxy ${proxyUrl}:`, error);
        throw error;
    } finally {
        if (killTor) {
            torProcessManager.stop();
        }
    }
}

export { proxiedFetch as fetch, TorProcessManager };

