import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { SocksProxyAgent } from 'socks-proxy-agent';

import { EventEmitter } from 'events';
import fs from 'fs';

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

export class TorProcessManager extends EventEmitter {
    private readonly torBinaryPath: string;
    private readonly torConfigPath: string;
    private readonly bootstrapTimeoutMs: number;
    private readonly torArgs: string[];
    private readonly spawnOnNonWindows: boolean;
    private readonly logger: (...args: any[]) => void;

    private torProcess: ChildProcess | null = null;
    private isReady = false;
    private startupPromise: Promise<void> | null = null;
    private readonly isWindows = process.platform === 'win32';

    /**
     * Timestamp when the current Tor process was started, or `null` if none is
     * running.
     */
    public startedAt: Date | null = null;

    constructor(options?: TorProcessManagerOptions) {
        super();

        // __dirname is not available when this file is executed as an ES module, so compute
        // a replacement using import.meta.url.  TypeScript will transpile this without
        // rewriting to a CJS __dirname, and the resulting build will work in both module
        // types (the computed value is identical on CommonJS).  We intentionally use a
        // local variable so we don't accidentally shadow a pre-existing __dirname if the
        // file is ever used in a CJS context.
        const thisDirPath = path.dirname(new URL(import.meta.url).pathname);
        const thisDir = process.platform === 'win32' && thisDirPath.startsWith('/') ? thisDirPath.slice(1) : thisDirPath;

        this.torBinaryPath = options?.torBinaryPath ?? path.join(thisDir, '..', 'tor-expert-bundle', 'tor');
        this.torConfigPath = options?.torConfigPath ?? path.join(thisDir, '..', 'tor-expert-bundle', 'torrc');
        this.bootstrapTimeoutMs = options?.bootstrapTimeoutMs ?? 30_000;
        this.torArgs = options?.torArgs ?? [];
        this.spawnOnNonWindows = !!options?.spawnOnNonWindows;
        this.logger = options?.logger ?? (() => {});
    }


    /**
     * Returns `true` if the manager believes Tor is ready to accept connections.
     * On platforms where we don't spawn the binary this will simply reflect the
     * most recent call to `start()`.
     */
    get ready(): boolean {
        return this.isReady;
    }

    /**
     * `true` when a child process has been spawned and has not yet exited.
     */
    get running(): boolean {
        return !!this.torProcess && !this.torProcess.killed;
    }

    async start(): Promise<void> {
        const shouldSpawn = this.isWindows || this.spawnOnNonWindows;
        if (!shouldSpawn) {
            // On Linux/macOS we do not manage Tor ourselves by default.  Caller is
            // responsible for making sure it's running.  Mark as ready and emit an
            // event so people can react the same way as when we boot a binary.
            this.isReady = true;
            process.nextTick(() => this.emit('ready'));
            return;
        }

        if (this.isReady) {
            return;
        }

        if (this.startupPromise) {
            return this.startupPromise;
        }

        // make sure required files exist before attempting to spawn
        if (!fs.existsSync(this.torBinaryPath)) {
            throw new Error(`Tor binary not found at ${this.torBinaryPath}`);
        }
        if (!fs.existsSync(this.torConfigPath)) {
            throw new Error(`Tor config not found at ${this.torConfigPath}`);
        }

        this.startupPromise = new Promise<void>((resolve, reject) => {
            const args = ['-f', this.torConfigPath, ...this.torArgs];
            this.logger('spawning tor', this.torBinaryPath, args);
            const torProcess = spawn(this.torBinaryPath, args);
            this.torProcess = torProcess;
            this.startedAt = new Date();
            this.emit('started');

            let settled = false;
            let timeout: NodeJS.Timeout;

            const cleanup = () => {
                clearTimeout(timeout);
                torProcess.stdout?.removeListener('data', onStdout);
                torProcess.removeListener('error', onError);
                torProcess.removeListener('close', onClose);
            };

            const settle = (fn: () => void) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                fn();
            };

            const onStdout = (data: Buffer) => {
                this.emit('stdout', data);
                if (data.toString().includes('Bootstrapped 100%')) {
                    this.isReady = true;
                    this.emit('ready');
                    settle(() => resolve());
                }
            };

            const onError = (error: Error) => {
                this.logger('tor error', error);
                this.emit('error', error);
                this.resetState();
                settle(() => reject(error));
            };

            const onClose = (code: number | null) => {
                this.logger('tor exit', code);
                this.emit('exit', code);
                const exitedBeforeReady = !this.isReady;
                this.resetState();

                if (exitedBeforeReady) {
                    settle(() => reject(new Error(`Tor process exited before bootstrap completed (code: ${code ?? 'unknown'}).`)));
                }
            };

            timeout = setTimeout(() => {
                this.emit('timeout');
                this.stop();
                settle(() => reject(new Error(`Tor bootstrap timed out after ${this.bootstrapTimeoutMs} ms.`)));
            }, this.bootstrapTimeoutMs);

            torProcess.stdout?.on('data', onStdout);
            torProcess.on('error', onError);
            torProcess.on('close', onClose);
        }).finally(() => {
            this.startupPromise = null;
        });

        return this.startupPromise;
    }

    stop(): void {
        if (!this.isWindows && !this.spawnOnNonWindows) {
            // nothing to do; caller manages the process
            return;
        }

        if (!this.torProcess) {
            this.resetState();
            return;
        }

        if (!this.torProcess.killed) {
            this.torProcess.kill();
        }

        this.logger('tor process killed');
        this.emit('stopped');
        this.resetState();
    }

    createAgent(proxyUrl: string): SocksProxyAgent {
        return new SocksProxyAgent(proxyUrl);
    }

    /**
     * Stops any existing Tor process and starts a new one.
     */
    async restart(): Promise<void> {
        this.stop();
        await this.start();
    }

    private resetState(): void {
        this.torProcess = null;
        this.isReady = false;
        this.startedAt = null;
    }
}
