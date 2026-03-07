// proxiedFetch("https://api.ipify.org?format=json")
// .then((response) => response.json() as Promise<{ ip: string }>)
// .then((data: { ip: string }) => {
//     console.log("Your IP address is:", data.ip);
// })
// .catch((error) => {
//     console.error("Error fetching IP address:", error);
// });
import { proxiedFetch } from "..";
async function func() {
    const response = await proxiedFetch("https://api.ipify.org?format=json", { killTor: false });
    const data = await response.text();
    console.log("Your IP address is:", data);
}
async function test() {
    for (let i = 0; i < 5; i++) {
        await func();
    }
}
test().catch((error) => {
    console.error("Error in test:", error);
});
//# sourceMappingURL=test.js.map