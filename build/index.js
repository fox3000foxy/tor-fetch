"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TorProcessManager = void 0;
exports.proxiedFetch = proxiedFetch;
exports.fetch = proxiedFetch;
const node_fetch_1 = __importDefault(require("node-fetch"));
const TorProcessManager_1 = require("./TorProcessManager");
Object.defineProperty(exports, "TorProcessManager", { enumerable: true, get: function () { return TorProcessManager_1.TorProcessManager; } });
const torProcessManager = new TorProcessManager_1.TorProcessManager();
async function proxiedFetch(url, options) {
    const { killTor = true, proxyUrl = 'socks5h://127.0.0.1:9050', ...fetchOptions } = options ?? {};
    await torProcessManager.start();
    try {
        return await (0, node_fetch_1.default)(url, {
            ...fetchOptions,
            agent: torProcessManager.createAgent(proxyUrl)
        });
    }
    catch (error) {
        console.error(`Error fetching ${url} through proxy ${proxyUrl}:`, error);
        throw error;
    }
    finally {
        if (killTor) {
            torProcessManager.stop();
        }
    }
}
//# sourceMappingURL=index.js.map