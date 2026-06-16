/**
 * Netlify Function — forwards chat requests to Synthflow with your API key (server-side only).
 * Env: SYNTHFLOW_API_KEY (required)
 * Env: SYNTHFLOW_API_BASE (optional, default https://api.synthflow.ai/v2)
 *
 * @see https://docs.synthflow.ai/authentication
 * @see https://docs.synthflow.ai/api-reference/platform-api/chat/create-chat
 * @see https://docs.synthflow.ai/api-reference/platform-api/chat/send-chat-message
 */

const DEFAULT_BASE = "https://api.synthflow.ai/v2";

exports.handler = async function (event) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.SYNTHFLOW_API_KEY;
  const base = (process.env.SYNTHFLOW_API_BASE || DEFAULT_BASE).replace(
    /\/$/,
    ""
  );

  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error:
          "Server missing SYNTHFLOW_API_KEY. Add it in Netlify Site settings → Environment variables.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { operation, chat_id, model_id, message } = body;

  try {
    if (operation === "create_chat") {
      if (!chat_id || !model_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "create_chat requires chat_id and model_id",
          }),
        };
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
      return {
        statusCode: res.status,
        headers,
        body: text,
      };
    }

    if (operation === "send_message") {
      if (!chat_id || message === undefined || message === null) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: "send_message requires chat_id and message",
          }),
        };
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
      return {
        statusCode: res.status,
        headers,
        body: text,
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: "Unknown operation. Use create_chat or send_message.",
      }),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: err.message || "Upstream request failed",
      }),
    };
  }
};
