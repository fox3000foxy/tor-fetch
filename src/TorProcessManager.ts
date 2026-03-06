import { ChildProcess, spawn } from 'child_process';
import path from 'path';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface TorProcessManagerOptions {
    torBinaryPath?: string;
    torConfigPath?: string;
    bootstrapTimeoutMs?: number;
}

export class TorProcessManager {
    private readonly torBinaryPath: string;
    private readonly torConfigPath: string;
    private readonly bootstrapTimeoutMs: number;

    private torProcess: ChildProcess | null = null;
    private isReady = false;
    private startupPromise: Promise<void> | null = null;
    private readonly isWindows = process.platform === 'win32';

    constructor(options?: TorProcessManagerOptions) {
        this.torBinaryPath = options?.torBinaryPath ?? path.join(__dirname, '..', 'tor-expert-bundle', 'tor');
        this.torConfigPath = options?.torConfigPath ?? path.join(__dirname, '..', 'tor-expert-bundle', 'torrc');
        this.bootstrapTimeoutMs = options?.bootstrapTimeoutMs ?? 30_000;
    }

    async start(): Promise<void> {
        if (!this.isWindows) {
            // On Linux/macOS, assume Tor is managed externally (service/container/etc.).
            this.isReady = true;
            return;
        }

        if (this.isReady) {
            return;
        }

        if (this.startupPromise) {
            return this.startupPromise;
        }

        this.startupPromise = new Promise<void>((resolve, reject) => {
            const torProcess = spawn(this.torBinaryPath, ['-f', this.torConfigPath]);
            this.torProcess = torProcess;

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
                if (data.toString().includes('Bootstrapped 100%')) {
                    this.isReady = true;
                    settle(() => resolve());
                }
            };

            const onError = (error: Error) => {
                this.resetState();
                settle(() => reject(error));
            };

            const onClose = (code: number | null) => {
                const exitedBeforeReady = !this.isReady;
                this.resetState();

                if (exitedBeforeReady) {
                    settle(() => reject(new Error(`Tor process exited before bootstrap completed (code: ${code ?? 'unknown'}).`)));
                }
            };

            timeout = setTimeout(() => {
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
        if (!this.isWindows) {
            return;
        }

        if (!this.torProcess) {
            this.resetState();
            return;
        }

        if (!this.torProcess.killed) {
            this.torProcess.kill();
        }

        this.resetState();
    }

    createAgent(proxyUrl: string): SocksProxyAgent {
        return new SocksProxyAgent(proxyUrl);
    }

    private resetState(): void {
        this.torProcess = null;
        this.isReady = false;
    }
}
