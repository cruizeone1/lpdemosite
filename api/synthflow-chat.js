/**
 * Vercel Serverless — same contract as netlify/functions/synthflow-chat.js
 * Env: SYNTHFLOW_API_KEY, optional SYNTHFLOW_API_BASE
 */

const DEFAULT_BASE = "https://api.synthflow.ai/v2";

async function forward(base, apiKey, pathSuffix, jsonBody) {
  const url = `${base.replace(/\/$/, "")}${pathSuffix}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(jsonBody),
  });
  return { status: res.status, text: await res.text() };
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.SYNTHFLOW_API_KEY;
  const base = process.env.SYNTHFLOW_API_BASE || DEFAULT_BASE;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "Missing SYNTHFLOW_API_KEY in Vercel project environment variables.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON body" });
    }
  }
  if (!body || typeof body !== "object") body = {};

  const { operation, chat_id, model_id, message } = body;

  try {
    if (operation === "create_chat") {
      if (!chat_id || !model_id) {
        return res
          .status(400)
          .json({ error: "create_chat requires chat_id and model_id" });
      }
      const { status, text } = await forward(base, apiKey, `/chat/${chat_id}`, {
        model_id,
      });
      res.status(status);
      res.setHeader("Content-Type", "application/json");
      return res.send(text);
    }
    if (operation === "send_message") {
      if (!chat_id || message === undefined || message === null) {
        return res
          .status(400)
          .json({ error: "send_message requires chat_id and message" });
      }
      const { status, text } = await forward(
        base,
        apiKey,
        `/chat/${chat_id}/messages`,
        { message: String(message) }
      );
      res.status(status);
      res.setHeader("Content-Type", "application/json");
      return res.send(text);
    }
    return res.status(400).json({
      error: "Unknown operation. Use create_chat or send_message.",
    });
  } catch (err) {
    return res.status(502).json({
      error: err.message || "Upstream request failed",
    });
  }
};
