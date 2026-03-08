# fetch-tor-proxy

`fetch-tor-proxy` lets you perform HTTP(S) requests through a SOCKS proxy (Tor), using `node-fetch` and `socks-proxy-agent`.

## Installation

```bash
npm install fetch-tor-proxy
```

## Quick Start

```ts
import { proxiedFetch } from 'fetch-tor-proxy';

const response = await proxiedFetch('https://api.ipify.org?format=json');
const body = await response.text();
console.log(body);
```

Available alias:

```ts
import { fetch } from 'fetch-tor-proxy';
```

## Options

`proxiedFetch(url, options)` accepts `node-fetch` `RequestInit` options and adds:

- `proxyUrl?: string` (default: `socks5h://127.0.0.1:9050`)
- `killTor?: boolean` (default: `true`)

Example:

```ts
import { proxiedFetch } from 'fetch-tor-proxy';

const response = await proxiedFetch('https://httpbin.org/anything', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ hello: 'world' }),
  killTor: false,
});

console.log(await response.json());
```

## Tor Process Management

The library also exports `TorProcessManager` which now exposes a few
convenience helpers and events:

```ts
import { TorProcessManager } from 'fetch-tor-proxy';

const manager = new TorProcessManager({
  bootstrapTimeoutMs: 30_000,
  // custom logger or spawnOnNonWindows can be supplied here
});

// You can listen for lifecycle events if you need to know when Tor is ready
// or if it exits unexpectedly.
manager.on('ready', () => console.log('tor is bootstrapped')); 
manager.on('error', err => console.error('tor failed', err));
manager.on('exit', code => console.log('tor exited', code));

await manager.start();
// ... your network calls ...
await manager.restart(); // convenience helper that stops then starts again
manager.stop();
```

The constructor accepts additional options:

- `torArgs?: string[]` – extra command‑line arguments for the tor binary.
- `spawnOnNonWindows?: boolean` – opt into spawning Tor on Linux/macOS too.
- `logger?: (...args) => void` – custom debug/logger function.

## Platform Behavior

- Windows (`win32`): the library starts `tor` using `tor-expert-bundle/tor` and waits for `Bootstrapped 100%`.
- Linux/macOS: the library does not spawn a Tor process. Tor must already be available (system service, container, etc.).

## Development

```bash
pnpm build
```

The TypeScript build output is generated in the `build/` folder.
