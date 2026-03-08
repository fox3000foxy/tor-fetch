import { SocksProxyAgent } from 'socks-proxy-agent';
import { EventEmitter } from 'events';
export interface TorProcessManagerOptions {
    torBinaryPath?: string;
    torConfigPath?: string;
    bootstrapTimeoutMs?: number;
    /**
     * Additional command‑line arguments to pass to the Tor binary when spawning.
     * Useful for changing log level, data directory, etc.
     */
    torArgs?: string[];
    /**
     * When `true` the manager will attempt to spawn Tor on every platform.  By
     * default the library only spawns on Windows and assumes an external Tor
     * instance is managed by the caller on Linux/macOS.
     */
    spawnOnNonWindows?: boolean;
    /**
     * Optional logger function; defaults to a no‑op.  Receives the same arguments
     * as `console.debug` so it can be wired up to any logging framework.
     */
    logger?: (...args: any[]) => void;
}
export declare class TorProcessManager extends EventEmitter {
    private readonly torBinaryPath;
    private readonly torConfigPath;
    private readonly bootstrapTimeoutMs;
    private readonly torArgs;
    private readonly spawnOnNonWindows;
    private readonly logger;
    private torProcess;
    private isReady;
    private startupPromise;
    private readonly isWindows;
    /**
     * Timestamp when the current Tor process was started, or `null` if none is
     * running.
     */
    startedAt: Date | null;
    constructor(options?: TorProcessManagerOptions);
    /**
     * Returns `true` if the manager believes Tor is ready to accept connections.
     * On platforms where we don't spawn the binary this will simply reflect the
     * most recent call to `start()`.
     */
    get ready(): boolean;
    /**
     * `true` when a child process has been spawned and has not yet exited.
     */
    get running(): boolean;
    start(): Promise<void>;
    stop(): void;
    createAgent(proxyUrl: string): SocksProxyAgent;
    /**
     * Stops any existing Tor process and starts a new one.
     */
    restart(): Promise<void>;
    private resetState;
}
//# sourceMappingURL=TorProcessManager.d.ts.map