// Vercel serverless function.
// Lives at /api/scores. Holds the football-data.org token server-side
// (set as an environment variable in Vercel — NEVER in the code) and
// forwards the request. This is what makes the API reachable from the
// browser, sidestepping CORS, and keeps the token out of shared code.

export default async function handler(req, res) {
  const token = process.env.FOOTBALL_DATA_TOKEN;

  if (!token) {
    return res
      .status(500)
      .json({ error: "Server token not configured. Set FOOTBALL_DATA_TOKEN in Vercel." });
  }

  try {
    const r = await fetch(
      "https://api.football-data.org/v4/competitions/WC/matches",
      { headers: { "X-Auth-Token": token } }
    );

    if (!r.ok) {
      return res.status(r.status).json({
        error:
          r.status === 403
            ? "Token rejected by football-data.org (403). Check the token value in Vercel."
            : r.status === 429
            ? "Rate limit hit (429). Wait a minute and retry."
            : `football-data.org request failed (${r.status}).`,
      });
    }

    const data = await r.json();
    // Cache at the edge for 60s so rapid refreshes don't burn the rate limit.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
  } catch (e) {
    return res
      .status(502)
      .json({ error: "Could not reach football-data.org. " + (e.message || "") });
  }
}
