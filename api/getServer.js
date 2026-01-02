import fetch from "node-fetch";

const PLACE_ID = "109983668079237";
const USED_SERVERS = new Set();
const MAX_PAGES = 10;

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

    // TELEPORT FAILED
    if (action === "failed") {
        if (serverId) USED_SERVERS.add(serverId);
        return res.json({ status: "failed_logged" });
    }

    // GET SERVER
    if (action === "get") {
        try {
            let cursor = null;
            let page = 0;
            let candidates = [];

            while (page < MAX_PAGES) {
                let url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?limit=100&sortOrder=Asc`;
                if (cursor) url += `&cursor=${cursor}`;

                const response = await fetch(url);
                const data = await response.json();

                if (!data?.data) break;

                for (const server of data.data) {
                    if (
                        server.playing < 7 &&                      // max players < 7
                        server.playing < server.maxPlayers &&
                        typeof server.ping === "number" &&
                        !USED_SERVERS.has(server.id)
                    ) {
                        candidates.push(server);
                    }
                }

                cursor = data.nextPageCursor;
                if (!cursor) break;
                page++;
            }

            if (candidates.length === 0) {
                return res.status(404).json({ error: "No suitable servers found" });
            }

            // PICK LOWEST PING SERVER
            candidates.sort((a, b) => a.ping - b.ping);
            const chosen = candidates[0];

            USED_SERVERS.add(chosen.id);

            return res.json({
                serverId: chosen.id,
                ping: chosen.ping,
                playing: chosen.playing
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Roblox API failure" });
        }
    }

    return res.status(400).json({ error: "Invalid action" });
}
