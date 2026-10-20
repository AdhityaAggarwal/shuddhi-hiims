/* ==========================================
   SHUDDHI HIIMS — Pages Function: /api/update
   Accepts POST with full JSON payload,
   writes to Cloudflare KV as pending data.
   ========================================== */

export async function onRequestPost(context) {
  const { request, env } = context;

  // ─── Auth check ───
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token || token !== env.ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ success: false, message: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  // ─── Parse body ───
  let data;
  try {
    data = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ success: false, message: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // ─── Validate required keys ───
  const requiredKeys = ["carousel", "videos", "audio", "texts"];
  for (const key of requiredKeys) {
    if (!Array.isArray(data[key])) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Missing or invalid "${key}" array`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ─── Write to KV ───
  try {
    await env.PENDING_DATA.put("latest", JSON.stringify(data));
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "KV write failed: " + err.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true, message: "Saved to staging" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// Reject non-POST methods
export async function onRequest(context) {
  if (context.request.method === "POST") {
    return onRequestPost(context);
  }
  return new Response(
    JSON.stringify({ success: false, message: "Method not allowed" }),
    { status: 405, headers: { "Content-Type": "application/json" } },
  );
}
