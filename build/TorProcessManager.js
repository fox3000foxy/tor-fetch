import { spawn } from 'child_process';
import path from 'path';
import { SocksProxyAgent } from 'socks-proxy-agent';
export class TorProcessManager {
    constructor(options) {
        this.torProcess = null;
        this.isReady = false;
        this.startupPromise = null;
        this.isWindows = process.platform === 'win32';
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
        this.bootstrapTimeoutMs = options?.bootstrapTimeoutMs ?? 30000;
    }
    async start() {
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
        this.startupPromise = new Promise((resolve, reject) => {
            const torProcess = spawn(this.torBinaryPath, ['-f', this.torConfigPath]);
            this.torProcess = torProcess;
            let settled = false;
            let timeout;
            const cleanup = () => {
                clearTimeout(timeout);
                torProcess.stdout?.removeListener('data', onStdout);
                torProcess.removeListener('error', onError);
                torProcess.removeListener('close', onClose);
            };
            const settle = (fn) => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                fn();
            };
            const onStdout = (data) => {
                if (data.toString().includes('Bootstrapped 100%')) {
                    this.isReady = true;
                    settle(() => resolve());
                }
            };
            const onError = (error) => {
                this.resetState();
                settle(() => reject(error));
            };
            const onClose = (code) => {
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
    stop() {
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
    createAgent(proxyUrl) {
        return new SocksProxyAgent(proxyUrl);
    }
    resetState() {
        this.torProcess = null;
        this.isReady = false;
    }
}
//# sourceMappingURL=TorProcessManager.js.map