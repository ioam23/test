import fetch from "node-fetch";

const PLACE_ID = "109983668079237";

// ===== DISCORD LOGGING =====
const WEBHOOK_URL =
  "https://discord.com/api/webhooks/1456482268339114206/qsg3Bw994eEbDNANQtzo_bstAJ9P8XBV-dzsvldyt2PWYFIorXWdwrx--nCTe8ab_s7D";

const ALERT_USER_ID = "1424221517159465071";

// ===== CONFIG =====
const CACHE_TTL = 20 * 1000;            // 20 seconds
const USED_RESET_TIME = 60 * 60 * 1000; // 1 hour
const MAX_PAGES = 1;

// ===== STATE =====
let cachedServers = [];
let lastFetchTime = 0;

let USED_SERVERS = new Set();
let lastUsedReset = Date.now();

// ===== DISCORD WEBHOOK SENDER =====
async function sendLog(content) {
    try {
        await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content })
        });
    } catch (_) {}
}

// ===== RESET USED SERVERS =====
function resetUsedServersIfNeeded() {
    if (Date.now() - lastUsedReset >= USED_RESET_TIME) {
        USED_SERVERS.clear();
        lastUsedReset = Date.now();
    }
}

// ===== FETCH + CACHE ROBLOX SERVERS =====
async function getCachedServers() {
    const now = Date.now();

    if (cachedServers.length > 0 && now - lastFetchTime < CACHE_TTL) {
        return cachedServers;
    }

    let servers = [];
    let cursor = null;
    let page = 0;

    while (page < MAX_PAGES) {
        let url =
          `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100&sortOrder=Asc`;
        if (cursor) url += `&cursor=${cursor}`;

        // LOG: Roblox API usage
        await sendLog(
            `📡 Roblox API request\nPlaceId: ${PLACE_ID}\nPage: ${page + 1}`
        );

        const res = await fetch(url);

        // RATE LIMIT ERROR
        if (res.status === 429) {
            await sendLog(
                `🚨 **ROBLOX RATE LIMITED**\n<@${ALERT_USER_ID}>\nResponse: Too many requests`
            );

            // fallback to cache
            if (cachedServers.length > 0) return cachedServers;
            break;
        }

        const data = await res.json();
        if (!data?.data) break;

        servers.push(...data.data);

        cursor = data.nextPageCursor;
        if (!cursor) break;
        page++;
    }

    cachedServers = servers;
    lastFetchTime = now;
    return servers;
}

// ===== API HANDLER =====
export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    resetUsedServersIfNeeded();

    const { action, serverId } = req.body;

    if (action === "clear") {
        USED_SERVERS.clear();
        return res.json({ status: "cleared" });
    }

    if (action === "confirm" || action === "failed") {
        if (serverId) USED_SERVERS.add(serverId);
        return res.json({ status: action });
    }

    if (action === "get") {
        try {
            const servers = await getCachedServers();

            for (const server of servers) {
                if (
                    server.playing < 7 &&
                    server.playing < server.maxPlayers &&
                    !USED_SERVERS.has(server.id)
                ) {
                    USED_SERVERS.add(server.id);
                    return res.json({ serverId: server.id });
                }
            }

            return res.status(404).json({ error: "No available servers" });

        } catch (err) {
            await sendLog(
                `❌ API ERROR\n<@${ALERT_USER_ID}>\n${String(err)}`
            );
            return res.status(500).json({ error: "Server error" });
        }
    }

    return res.status(400).json({ error: "Invalid action" });
}
