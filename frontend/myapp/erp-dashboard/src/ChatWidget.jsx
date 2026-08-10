import { useState } from "react";
import "./ChatWidget.css";

const chatbotIcon = "/chatbot-icon.png";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { sender: "ai", text: "Hi, I can help with your ERP questions." },
  ]);

  function sendMessage() {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      { sender: "user", text: trimmedInput },
      { sender: "ai", text: "This is a demo response" },
    ]);
    setInput("");
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  return (
    <>
      <button
        className="chat-toggle"
        type="button"
        aria-label="Toggle AI Assistant"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <img
          src={chatbotIcon}
          alt="AI Assistant"
          className="chat-toggle-img"
        />
      </button>

      <aside className={`chat-panel ${isOpen ? "chat-panel-open" : ""}`}>
        <header className="chat-header">
          <div className="chat-header-title">
            <img src={chatbotIcon} alt="" className="chat-header-icon" />
            <h2>AI Assistant</h2>
          </div>
          <button
            className="chat-close"
            type="button"
            aria-label="Close AI Assistant"
            onClick={() => setIsOpen(false)}
          >
            X
          </button>
        </header>

        <div className="chat-messages">
          {messages.map((message, index) => (
            <div
              className={`chat-message chat-message-${message.sender}`}
              key={`${message.sender}-${index}`}
            >
              {message.text}
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            value={input}
            placeholder="Type a message..."
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button type="button" onClick={sendMessage}>
            Send
          </button>
        </div>
      </aside>
    </>
  );
}
