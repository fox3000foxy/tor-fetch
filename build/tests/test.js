// proxiedFetch("https://api.ipify.org?format=json")
// .then((response) => response.json() as Promise<{ ip: string }>)
// .then((data: { ip: string }) => {
//     console.log("Your IP address is:", data.ip);
// })
// .catch((error) => {
//     console.error("Error fetching IP address:", error);
// });
import { proxiedFetch, TorProcessManager } from "..";
async function exampleFetch() {
    const response = await proxiedFetch("https://api.ipify.org?format=json", { killTor: false });
    const data = await response.text();
    console.log("Your IP address is:", data);
}
async function test() {
    const manager = new TorProcessManager({ spawnOnNonWindows: true });
    manager.on('started', () => console.log('tor process spawned'));
    manager.on('ready', () => console.log('tor bootstrap completed'));
    manager.on('exit', code => console.log('tor exited with', code));
    manager.on('error', err => console.error('tor error', err));
    await manager.start();
    await exampleFetch();
    // restarting to ensure the restart helper works
    await manager.restart();
    await exampleFetch();
    manager.stop();
}
test().catch((error) => {
    console.error("Error in test:", error);
});
//# sourceMappingURL=test.js.map