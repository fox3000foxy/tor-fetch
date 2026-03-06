"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TorProcessManager = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
class TorProcessManager {
    constructor(options) {
        this.torProcess = null;
        this.isReady = false;
        this.startupPromise = null;
        this.isWindows = process.platform === 'win32';
        this.torBinaryPath = options?.torBinaryPath ?? path_1.default.join(__dirname, '..', 'tor-expert-bundle', 'tor');
        this.torConfigPath = options?.torConfigPath ?? path_1.default.join(__dirname, '..', 'tor-expert-bundle', 'torrc');
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
            const torProcess = (0, child_process_1.spawn)(this.torBinaryPath, ['-f', this.torConfigPath]);
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
        return new socks_proxy_agent_1.SocksProxyAgent(proxyUrl);
    }
    resetState() {
        this.torProcess = null;
        this.isReady = false;
    }
}
exports.TorProcessManager = TorProcessManager;
//# sourceMappingURL=TorProcessManager.js.map