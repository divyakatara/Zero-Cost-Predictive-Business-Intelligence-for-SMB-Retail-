import { useEffect, useRef, useState } from "react";
import "./ChatWidget.css";
import { API_BASE_URL } from "./api";

const chatbotIcon = "/chatbot-icon.png";

const SUGGESTED_PROMPTS = [
  "What are my top-selling products?",
  "Which items need restocking?",
  "How are my suppliers performing?",
  "Show me total revenue this year.",
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hi! I'm your ERP assistant powered by Gemini AI. Ask me about your sales, inventory, suppliers, or reorder recommendations.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to the bottom whenever a new message arrives.
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Focus the input whenever the panel opens.
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  async function sendMessage(overrideText) {
    const trimmedInput = (overrideText ?? input).trim();
    if (!trimmedInput || isLoading) return;

    setMessages((prev) => [...prev, { sender: "user", text: trimmedInput }]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedInput }),
      });

      if (!response.ok) {
        let detail = `Server error (${response.status})`;
        try {
          const body = await response.json();
          if (body?.detail) detail = body.detail;
        } catch {
          // ignore JSON parse errors — keep generic message
        }
        throw new Error(detail);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { sender: "ai", text: data.reply }]);
    } catch (err) {
      const errorText =
        err.message && err.message !== "Failed to fetch"
          ? err.message
          : "Could not reach the ERP server. Please make sure the backend is running.";
      setError(errorText);
      setMessages((prev) => [
        ...prev,
        { sender: "ai", text: errorText, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleSuggestedPrompt(prompt) {
    sendMessage(prompt);
  }

  // Render text with newlines preserved and markdown asterisks stripped.
  function renderText(text) {
    const cleaned = text.replaceAll("**", "").replaceAll("* ", "• ").replaceAll("*", "");
    return cleaned.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < cleaned.split("\n").length - 1 && <br />}
      </span>
    ));
  }

  const showSuggestions =
    messages.length === 1 && !isLoading;

  return (
    <>
      {/* Floating toggle button */}
      <button
        className="chat-toggle"
        type="button"
        aria-label="Toggle AI Assistant"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <img
          src={chatbotIcon}
          alt="AI Assistant"
          className="chat-toggle-img"
        />
      </button>

      {/* Chat panel */}
      <aside className={`chat-panel ${isOpen ? "chat-panel-open" : ""}`} aria-live="polite">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-title">
            <img src={chatbotIcon} alt="" className="chat-header-icon" />
            <div>
              <h2>ERP AI Assistant</h2>
              <span className="chat-header-sub">Powered by Gemini</span>
            </div>
          </div>
          <button
            className="chat-close"
            type="button"
            aria-label="Close AI Assistant"
            onClick={() => setIsOpen(false)}
          >
            ✕
          </button>
        </header>

        {/* Messages */}
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              className={`chat-message chat-message-${message.sender}${message.isError ? " chat-message-error" : ""}`}
              key={`${message.sender}-${index}`}
            >
              {message.sender === "ai" && (
                <span className="chat-message-label">AI</span>
              )}
              <div className="chat-message-text">{renderText(message.text)}</div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="chat-message chat-message-ai">
              <span className="chat-message-label">AI</span>
              <div className="chat-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {/* Suggested prompts — shown only at start */}
          {showSuggestions && (
            <div className="chat-suggestions">
              <p className="chat-suggestions-label">Try asking:</p>
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="chat-suggestion-btn"
                  type="button"
                  onClick={() => handleSuggestedPrompt(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input row */}
        <div className="chat-input-row">
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            value={input}
            placeholder={isLoading ? "Thinking…" : "Ask about your ERP data…"}
            disabled={isLoading}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          <button
            id="chat-send-btn"
            type="button"
            disabled={isLoading || !input.trim()}
            onClick={() => sendMessage()}
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="chat-send-spinner" />
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
