import { useEffect, useRef, useState } from "react";
import "./ChatWidget.css";
import { API_BASE_URL } from "./api";

const BUSINESS_PROMPTS = [
  "What are my top-selling products?",
  "Which items need restocking?",
  "How are my suppliers performing?",
  "How to connect my business data?",
];

const ADMIN_PROMPTS = [
  "How many pending business approvals?",
  "List registered business owners",
  "Approval queue summary",
  "Admin platform guide",
];

export default function ChatWidget({ role = "business" }) {
  const isAdmin = role === "admin";
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: isAdmin
        ? "Hi! I'm your Smart ERP System Admin assistant. Ask me about registered businesses, pending approval queues, system status, or user roles."
        : "Hi! I'm your ERP assistant powered by Gemini AI. Ask me about sales, inventory, suppliers, or general retail guidance.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const suggestedPrompts = isAdmin ? ADMIN_PROMPTS : BUSINESS_PROMPTS;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, role }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
      } else {
        throw new Error("Server error");
      }
    } catch {
      const fallback = isAdmin
        ? "You can manage pending business registrations under the Business Approvals section. Approving a business unlocks full ERP access."
        : "I wasn't able to reach the server right now. If you haven't connected your business data yet, head to Settings → Data Connection to upload your Excel or CSV file.";
      setMessages((prev) => [...prev, { sender: "ai", text: fallback, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const headerBg = isAdmin ? "#2a2a2a" : "var(--chat-green)";
  const headerColor = "#ffffff";

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="chat-toggle"
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? "Close AI Assistant" : "Open AI Assistant"}
        style={{ background: isAdmin ? "#2a2a2a" : "var(--chat-card)" }}
      >
        <span style={{ fontSize: 26, lineHeight: 1 }}>🤖</span>
      </button>

      {/* Sliding chat panel */}
      <div className={`chat-panel${isOpen ? " chat-panel-open" : ""}`}>
        {/* Header */}
        <div
          className="chat-header"
          style={{ background: headerBg, borderBottom: "none" }}
        >
          <div className="chat-header-title">
            <span style={{ fontSize: 22 }}>🤖</span>
            <div>
              <h2 style={{ color: headerColor, margin: 0, fontSize: 14, fontWeight: 700 }}>
                {isAdmin ? "System Admin Assistant" : "Gemini ERP Assistant"}
              </h2>
              <div className="chat-header-sub" style={{ color: "rgba(255,255,255,0.75)" }}>
                {isAdmin ? "Admin Queue & Platform AI" : "AI-Powered Retail Guide"}
              </div>
            </div>
          </div>
          <button
            className="chat-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close chat"
            style={{ borderColor: "rgba(255,255,255,0.3)", color: headerColor }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-message ${msg.sender === "user" ? "chat-message-user" : "chat-message-ai"}${msg.isError ? " chat-message-error" : ""}`}
            >
              {msg.sender === "ai" && (
                <span className="chat-message-label">
                  {isAdmin ? "Admin AI" : "ERP Assistant"}
                </span>
              )}
              <div className="chat-message-text">{msg.text}</div>
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="chat-message chat-message-ai">
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested prompts — only show when no user messages yet */}
        {messages.length <= 1 && !isLoading && (
          <div style={{ padding: "0 14px 10px", background: "var(--chat-bg)" }}>
            <div className="chat-suggestions">
              <p className="chat-suggestions-label">Suggested</p>
              {suggestedPrompts.map((p) => (
                <button
                  key={p}
                  className="chat-suggestion-btn"
                  onClick={() => sendMessage(p)}
                  disabled={isLoading}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input row */}
        <div className="chat-input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder={isAdmin ? "Ask admin assistant..." : "Ask ERP assistant..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            aria-label="Chat input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="chat-send-spinner" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
