/**
 * Custom Synthflow chat widget (UI only in browser; API calls go through a proxy).
 * @see https://docs.synthflow.ai/api-reference/platform-api/chat/create-chat
 * @see https://docs.synthflow.ai/api-reference/platform-api/chat/send-chat-message
 */
(function () {
  "use strict";

  var cfg =
    window.__SYNTHFLOW_WIDGET__ ||
    window.SYNTHFLOW_WIDGET_CONFIG ||
    {};

  var MODEL_ID = cfg.modelId || "88b8b323-cced-49a1-87c0-c7f8ff89c526";
  var AGENT_NAME = cfg.agentDisplayName || "Sofia";
  /** Same-origin proxy (see netlify/functions or api/). Do not put API keys in this file. */
  var PROXY_URL =
    cfg.proxyUrl || "/api/synthflow-chat";

  var PURPLE = "#4B2164";
  var TEAL_DOT = "#008080";

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k.slice(0, 2) === "on" && typeof attrs[k] === "function")
          node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] !== undefined && attrs[k] !== null)
          node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (typeof c === "string") node.appendChild(document.createTextNode(c));
      else if (c) node.appendChild(c);
    });
    return node;
  }

  function formatTime(d) {
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(d);
    } catch (e) {
      return "";
    }
  }

  function formatDateSeparator(d) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    } catch (e) {
      return "";
    }
  }

  function injectStyles() {
    if (document.getElementById("synthflow-custom-widget-styles")) return;
    var style = el("style", { id: "synthflow-custom-widget-styles" });
    style.textContent =
      "#sf-chat-root{--sf-purple:" +
      PURPLE +
      ";--sf-teal:" +
      TEAL_DOT +
      ";font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif;}" +
      "#sf-chat-launcher{position:fixed;right:20px;bottom:20px;z-index:99998;border:0;cursor:pointer;" +
      "background:" +
      PURPLE +
      ";color:#fff;border-radius:999px;padding:12px 22px 12px 20px;display:flex;align-items:center;gap:10px;" +
      "font-size:16px;font-weight:600;box-shadow:0 4px 18px rgba(0,0,0,.25);}" +
      "#sf-chat-launcher:hover{filter:brightness(1.06);}" +
      "#sf-chat-launcher .sf-launcher-icon{width:22px;height:22px;flex-shrink:0;}" +
      "#sf-chat-launcher-wrap{position:fixed;right:20px;bottom:20px;z-index:99998;}" +
      "#sf-chat-launcher-wrap::before{content:'';position:absolute;top:-2px;left:-2px;width:12px;height:12px;" +
      "background:var(--sf-teal);border-radius:50%;border:2px solid #fff;box-sizing:border-box;}" +
      "#sf-chat-panel{position:fixed;right:20px;bottom:88px;z-index:99999;width:min(400px,calc(100vw - 32px));" +
      "max-height:min(560px,calc(100dvh - 120px));background:#fff;border-radius:12px 12px 0 0;" +
      "box-shadow:0 12px 40px rgba(0,0,0,.28);display:none;flex-direction:column;overflow:hidden;" +
      "border:1px solid rgba(0,0,0,.08);}" +
      "#sf-chat-panel.sf-open{display:flex;}" +
      ".sf-chat-header{background:var(--sf-purple);color:#fff;padding:14px 16px;display:flex;" +
      "align-items:center;justify-content:space-between;gap:12px;}" +
      ".sf-chat-header h2{margin:0;font-size:17px;font-weight:600;}" +
      ".sf-chat-header-actions{display:flex;gap:4px;}" +
      ".sf-icon-btn{background:transparent;border:0;color:#fff;cursor:pointer;padding:8px;border-radius:8px;" +
      "display:grid;place-items:center;line-height:0;}" +
      ".sf-icon-btn:hover{background:rgba(255,255,255,.12);}" +
      ".sf-chat-messages{flex:1;overflow-y:auto;padding:16px;background:#fff;min-height:200px;}" +
      ".sf-date-sep{text-align:center;font-size:12px;color:#9ca3af;margin:8px 0 16px;}" +
      ".sf-msg-row{display:flex;flex-direction:column;margin-bottom:14px;max-width:100%;}" +
      ".sf-msg-row.user{align-items:flex-end;}" +
      ".sf-msg-row.agent{align-items:flex-start;}" +
      ".sf-msg-bubble-agent-wrap{display:flex;align-items:flex-start;gap:10px;max-width:100%;}" +
      ".sf-avatar{width:32px;height:32px;border-radius:50%;background:#e5e7eb;flex-shrink:0;" +
      "display:grid;place-items:center;}" +
      ".sf-avatar svg{width:16px;height:16px;opacity:.7;}" +
      ".sf-bubble-user{background:var(--sf-purple);color:#fff;padding:10px 14px;border-radius:12px;" +
      "max-width:85%;word-break:break-word;font-size:14px;}" +
      ".sf-bubble-agent{background:#e5e7eb;color:#111827;padding:10px 14px;border-radius:12px;" +
      "max-width:calc(85% - 42px);word-break:break-word;font-size:14px;}" +
      ".sf-msg-meta{font-size:11px;color:#9ca3af;margin-top:4px;padding-inline:4px;}" +
      ".sf-msg-row.user .sf-msg-meta{text-align:right;padding-right:0;}" +
      ".sf-chat-input-wrap{border-top:1px solid #e5e7eb;padding:10px 12px;background:#fff;}" +
      ".sf-chat-input-inner{display:flex;align-items:center;gap:8px;}" +
      ".sf-input-icon{background:transparent;border:0;padding:6px;cursor:pointer;color:#6b7280;border-radius:8px;}" +
      ".sf-input-icon:hover{background:#f3f4f6;color:#374151;}" +
      ".sf-chat-input{flex:1;border:0;outline:0;font-size:14px;padding:8px 4px;color:#111827;}" +
      ".sf-chat-input::placeholder{color:#9ca3af;}" +
      ".sf-status{font-size:12px;color:#6b7280;padding:8px 16px;border-top:1px solid #f3f4f6;min-height:20px;}" +
      ".sf-status.sf-err{color:#b91c1c;}";
    document.head.appendChild(style);
  }

  function svgTrash() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/></svg>';
  }
  function svgMinus() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/></svg>';
  }
  function svgSend() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>';
  }
  function svgImage() {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
  }
  function svgDoc() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>';
  }
  function svgBubble() {
    return '<svg class="sf-launcher-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8.5z"/></svg>';
  }

  async function proxyRequest(payload) {
    var res = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    var text = await res.text();
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(text || "Invalid response from proxy");
    }
    if (!res.ok) {
      var errMsg =
        (data && (data.error || data.message)) || text || "Request failed";
      throw new Error(errMsg);
    }
    return data;
  }

  function mount() {
    injectStyles();

    var root = el("div", { id: "sf-chat-root" });
    var launcherWrap = el("div", { id: "sf-chat-launcher-wrap" });
    var launcher = el("button", {
      type: "button",
      id: "sf-chat-launcher",
      "aria-expanded": "false",
      "aria-controls": "sf-chat-panel",
    });
    launcher.innerHTML = svgBubble() + "<span>Chat</span>";

    var panel = el("div", {
      id: "sf-chat-panel",
      role: "dialog",
      "aria-label": "Message us chat",
    });

    var header = el("div", { class: "sf-chat-header" });
    header.appendChild(el("h2", {}, ["Message Us"]));
    var actions = el("div", { class: "sf-chat-header-actions" });
    var btnClear = el("button", {
      type: "button",
      class: "sf-icon-btn",
      "aria-label": "Clear chat",
      title: "Clear chat",
      html: svgTrash(),
    });
    var btnMin = el("button", {
      type: "button",
      class: "sf-icon-btn",
      "aria-label": "Minimize",
      title: "Minimize",
      html: svgMinus(),
    });
    actions.appendChild(btnClear);
    actions.appendChild(btnMin);
    header.appendChild(actions);

    var messagesEl = el("div", { class: "sf-chat-messages", id: "sf-chat-messages" });

    var inputWrap = el("div", { class: "sf-chat-input-wrap" });
    var inputInner = el("div", { class: "sf-chat-input-inner" });
    var btnImg = el("button", {
      type: "button",
      class: "sf-input-icon",
      "aria-label": "Attach image",
      title: "Attachments not sent via API in this demo",
      html: svgImage(),
    });
    var input = el("input", {
      type: "text",
      class: "sf-chat-input",
      id: "sf-chat-input-field",
      placeholder: "Type your message here",
      autocomplete: "off",
    });
    var btnSend = el("button", {
      type: "button",
      class: "sf-input-icon",
      "aria-label": "Send message",
      html: svgSend(),
    });
    inputInner.appendChild(btnImg);
    inputInner.appendChild(input);
    inputInner.appendChild(btnSend);
    inputWrap.appendChild(inputInner);

    var statusEl = el("div", { class: "sf-status", id: "sf-chat-status" });

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(inputWrap);
    panel.appendChild(statusEl);

    launcherWrap.appendChild(launcher);
    root.appendChild(panel);
    root.appendChild(launcherWrap);
    document.body.appendChild(root);

    var chatId = null;
    var busy = false;

    function setStatus(t, isErr) {
      statusEl.textContent = t || "";
      statusEl.classList.toggle("sf-err", !!isErr);
    }

    function scrollToBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function clearMessagesDom() {
      messagesEl.innerHTML = "";
    }

    function addDateSeparator() {
      messagesEl.appendChild(
        el("div", { class: "sf-date-sep" }, [formatDateSeparator(new Date())])
      );
    }

    function addUserBubble(text) {
      var row = el("div", { class: "sf-msg-row user" });
      row.appendChild(el("div", { class: "sf-bubble-user" }, [text]));
      row.appendChild(
        el("div", { class: "sf-msg-meta" }, [
          "You · " + formatTime(new Date()),
        ])
      );
      messagesEl.appendChild(row);
      scrollToBottom();
    }

    function addAgentBubble(text) {
      var row = el("div", { class: "sf-msg-row agent" });
      var wrap = el("div", { class: "sf-msg-bubble-agent-wrap" });
      var av = el("div", { class: "sf-avatar" });
      av.innerHTML = svgDoc();
      wrap.appendChild(av);
      wrap.appendChild(el("div", { class: "sf-bubble-agent" }, [text]));
      row.appendChild(wrap);
      row.appendChild(
        el("div", { class: "sf-msg-meta" }, [
          AGENT_NAME + " · " + formatTime(new Date()),
        ])
      );
      messagesEl.appendChild(row);
      scrollToBottom();
    }

    function renderHistory(history, initialMessage) {
      clearMessagesDom();
      addDateSeparator();
      if (history && history.length) {
        history.forEach(function (m) {
          if (!m || m.message == null || m.message === "") return;
          if (m.agent_id === "user") addUserBubble(m.message);
          else addAgentBubble(m.message);
        });
      } else if (
        initialMessage &&
        initialMessage.agent_message
      ) {
        addAgentBubble(initialMessage.agent_message);
      }
      scrollToBottom();
    }

    async function startSession() {
      setStatus("");
      busy = true;
      chatId = crypto.randomUUID();
      try {
        var json = await proxyRequest({
          operation: "create_chat",
          chat_id: chatId,
          model_id: MODEL_ID,
        });
        if (json.status !== "ok" || !json.response) {
          throw new Error(json.error || "Could not start chat");
        }
        var r = json.response;
        renderHistory(r.conversation_history, r.initial_message);
      } catch (e) {
        chatId = null;
        clearMessagesDom();
        setStatus(
          e.message ||
            "Could not reach Synthflow. Set proxyUrl and deploy the proxy with SYNTHFLOW_API_KEY.",
          true
        );
      } finally {
        busy = false;
      }
    }

    async function sendMessage(text) {
      if (!text || !chatId || busy) return;
      busy = true;
      setStatus("Sending…");
      addUserBubble(text);
      try {
        var json = await proxyRequest({
          operation: "send_message",
          chat_id: chatId,
          message: text,
        });
        if (json.status !== "ok" || !json.response) {
          throw new Error(json.error || "No reply");
        }
        addAgentBubble(json.response.agent_message || "");
        setStatus("");
      } catch (e) {
        setStatus(e.message || "Send failed", true);
      } finally {
        busy = false;
      }
    }

    function openPanel() {
      panel.classList.add("sf-open");
      launcher.setAttribute("aria-expanded", "true");
      if (!chatId) startSession();
      setTimeout(function () {
        input.focus();
      }, 100);
    }

    function closePanel() {
      panel.classList.remove("sf-open");
      launcher.setAttribute("aria-expanded", "false");
    }

    launcher.addEventListener("click", function () {
      if (panel.classList.contains("sf-open")) closePanel();
      else openPanel();
    });
    btnMin.addEventListener("click", closePanel);
    btnClear.addEventListener("click", function () {
      if (busy) return;
      startSession();
    });

    function submitInput() {
      var v = (input.value || "").trim();
      if (!v) return;
      input.value = "";
      sendMessage(v);
    }
    btnSend.addEventListener("click", submitInput);
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        submitInput();
      }
    });
    btnImg.addEventListener("click", function () {
      setStatus("File attachments require a storage integration; type a message for now.", false);
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && panel.classList.contains("sf-open"))
        closePanel();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
