import { SocksProxyAgent } from 'socks-proxy-agent';
export interface TorProcessManagerOptions {
    torBinaryPath?: string;
    torConfigPath?: string;
    bootstrapTimeoutMs?: number;
}
export declare class TorProcessManager {
    private readonly torBinaryPath;
    private readonly torConfigPath;
    private readonly bootstrapTimeoutMs;
    private torProcess;
    private isReady;
    private startupPromise;
    private readonly isWindows;
    constructor(options?: TorProcessManagerOptions);
    start(): Promise<void>;
    stop(): void;
    createAgent(proxyUrl: string): SocksProxyAgent;
    private resetState;
}
//# sourceMappingURL=TorProcessManager.d.ts.map