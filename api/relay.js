export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1450954970525466705/rGvblHYrpMHEXNIC1C7iEw1gp9R0GP1dIMR3irbFbA_s0wILFKppf7NoJd06OcgpnNKL';

    const payload = req.body;

    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to relay message' });
  }
}
