/* ==========================================
   SHUDDHI HIIMS — Cron Worker (cron-updater)
   Runs every 2 hours via Cloudflare scheduled trigger.
   Reads pending data from KV → commits to GitHub.
   ========================================== */

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(handleScheduled(env));
  },
};

async function handleScheduled(env) {
  // ─── 1. Read pending data from KV ───
  const pendingRaw = await env.PENDING_DATA.get("latest");
  if (!pendingRaw) {
    console.log("No pending data. Skipping.");
    return;
  }

  let pendingData;
  try {
    pendingData = JSON.parse(pendingRaw);
  } catch {
    console.error("Invalid JSON in KV. Skipping.");
    return;
  }

  const { GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH } = env;
  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    console.error("Missing GITHUB_TOKEN or GITHUB_REPO env vars.");
    return;
  }

  const branch = GITHUB_BRANCH || "main";
  const filePath = "data/data.json";
  const apiBase = `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`;

  // ─── 2. Get current file SHA (required for updates) ───
  let currentSha = null;
  try {
    const getResp = await fetch(`${apiBase}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "shuddhi-cron-worker",
      },
    });

    if (getResp.ok) {
      const fileInfo = await getResp.json();
      currentSha = fileInfo.sha;
    } else if (getResp.status === 404) {
      // File doesn't exist yet — will be created
      console.log("data.json not found in repo; will create it.");
    } else {
      console.error(
        `GitHub GET failed: ${getResp.status} ${await getResp.text()}`,
      );
      return;
    }
  } catch (err) {
    console.error("GitHub GET error:", err.message);
    return;
  }

  // ─── 3. Commit updated data.json ───
  const newContent = JSON.stringify(pendingData, null, 2) + "\n";
  const contentBase64 = btoa(unescape(encodeURIComponent(newContent)));
  const timestamp = new Date().toISOString();

  const putBody = {
    message: `Scheduled update: ${timestamp}`,
    content: contentBase64,
    branch,
  };
  if (currentSha) {
    putBody.sha = currentSha;
  }

  try {
    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "shuddhi-cron-worker",
      },
      body: JSON.stringify(putBody),
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      console.error(`GitHub PUT failed: ${putResp.status} ${errText}`);
      return;
    }

    console.log(`Successfully committed data.json at ${timestamp}`);
  } catch (err) {
    console.error("GitHub PUT error:", err.message);
    return;
  }

  // ─── 4. Clear pending data from KV ───
  try {
    await env.PENDING_DATA.delete("latest");
    console.log("Cleared pending data from KV.");
  } catch (err) {
    console.error("KV delete error:", err.message);
  }
}
