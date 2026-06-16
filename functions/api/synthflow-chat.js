/**
 * Cloudflare Pages Function — handles POST /api/synthflow-chat
 *
 * In the dashboard: Workers & Pages → your Pages project → Settings → Variables and Secrets
 * Add SYNTHFLOW_API_KEY (encrypt as secret). Optional: SYNTHFLOW_API_BASE (e.g. https://api.us.synthflow.ai/v2)
 *
 * @see https://developers.cloudflare.com/pages/functions/
 * @see https://docs.synthflow.ai/authentication
 */

const DEFAULT_BASE = "https://api.synthflow.ai/v2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  const apiKey = env.SYNTHFLOW_API_KEY;
  const base = (env.SYNTHFLOW_API_BASE || DEFAULT_BASE).replace(/\/$/, "");

  if (!apiKey) {
    return Response.json(
      {
        error:
          "Missing SYNTHFLOW_API_KEY. In Cloudflare: Pages project → Settings → Variables and Secrets → add the key (Secret).",
      },
      { status: 500, headers: corsHeaders }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders }
    );
  }

  const { operation, chat_id, model_id, message } = body || {};

  try {
    if (operation === "create_chat") {
      if (!chat_id || !model_id) {
        return Response.json(
          { error: "create_chat requires chat_id and model_id" },
          { status: 400, headers: corsHeaders }
        );
      }
      const url = `${base}/chat/${chat_id}`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model_id }),
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (operation === "send_message") {
      if (!chat_id || message === undefined || message === null) {
        return Response.json(
          { error: "send_message requires chat_id and message" },
          { status: 400, headers: corsHeaders }
        );
      }
      const url = `${base}/chat/${chat_id}/messages`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ message: String(message) }),
      });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return Response.json(
      { error: "Unknown operation. Use create_chat or send_message." },
      { status: 400, headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { error: err.message || "Upstream request failed" },
      { status: 502, headers: corsHeaders }
    );
  }
}
