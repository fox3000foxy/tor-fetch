import { RequestInit, Response } from 'node-fetch';
import { TorProcessManager } from './TorProcessManager';
export interface ProxiedFetchOptions extends RequestInit {
    killTor?: boolean;
    proxyUrl?: string;
}
export declare function proxiedFetch(url: string, options?: ProxiedFetchOptions): Promise<Response>;
export { proxiedFetch as fetch, TorProcessManager };
//# sourceMappingURL=index.d.ts.map