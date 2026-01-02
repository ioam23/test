import fetch from "node-fetch";

const USED_SERVERS = new Set();

// CHANGE THIS
const PLACE_ID = "109983668079237";
const MAX_PAGES = 5; // safety limit

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { action, serverId } = req.body;

    // CONFIRM SUCCESS
    if (action === "confirm") {
        if (serverId) USED_SERVERS.add(serverId);
        return res.json({ status: "confirmed" });
    }

    // FAILED SERVER
    if (action === "failed") {
        if (serverId) USED_SERVERS.add(serverId);
        return res.json({ status: "failed_logged" });
    }

    // GET NEW SERVER
    if (action === "get") {
        try {
            let cursor = null;
            let page = 0;

            while (page < MAX_PAGES) {
                let url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100&sortOrder=Asc`;
                if (cursor) url += `&cursor=${cursor}`;

                const response = await fetch(url);
                const data = await response.json();

                if (!data.data) break;

                for (const server of data.data) {
                    if (
                        server.playing < server.maxPlayers &&
                        !USED_SERVERS.has(server.id)
                    ) {
                        USED_SERVERS.add(server.id);
                        return res.json({ serverId: server.id });
                    }
                }

                cursor = data.nextPageCursor;
                if (!cursor) break;
                page++;
            }

            return res.status(404).json({ error: "No available servers" });

        } catch (err) {
            return res.status(500).json({ error: "Roblox API error" });
        }
    }

    return res.status(400).json({ error: "Invalid action" });
}
