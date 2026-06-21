import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Markdown from "react-markdown";

type Message = { id: string; role: string; content: string };

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
};

// Custom Markdown renderer to handle <think>...</think>
function parseThinking(content: string) {
  const parts = [];
  let remaining = content;

  while (true) {
    const startIdx = remaining.indexOf("<think>");
    const endIdx = remaining.indexOf("</think>");

    if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
      if (startIdx > 0) {
        parts.push({ type: "text", content: remaining.slice(0, startIdx) });
      }
      parts.push({
        type: "think",
        content: remaining.slice(startIdx + 7, endIdx),
      });
      remaining = remaining.slice(endIdx + 8);
    } else {
      if (remaining) {
        parts.push({ type: "text", content: remaining });
      }
      break;
    }
  }
  return parts;
}

export function ChatSheet({ open, onClose, date }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMessages([]);
    fetch(`/api/chats/${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(console.error);
  }, [open, date]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    gsap.fromTo(
      panelRef.current,
      { x: "100%", opacity: 0 },
      { x: "0%", opacity: 1, duration: 0.4, ease: "power3.out" },
    );
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    const tempId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: msg },
    ]);
    setLoading(true);

    try {
      const res = await fetch(`/api/chats/${date}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");
      setMessages((prev) => [
        ...prev,
        { id: data.id, role: data.role, content: data.content },
      ]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-foreground/30 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        className="card-soft flex h-full w-full max-w-md flex-col overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-card p-4">
          <div>
            <h2 className="text-xl font-bold">NourishAI Chat</h2>
            <p className="text-xs text-muted-foreground">{date}</p>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-50">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <p className="text-sm font-medium">No chat history for {date}.</p>
              <p className="text-xs">
                Ask me anything about your diet or settings!
              </p>
            </div>
          )}
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-sm ${isUser ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"}`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <div className="markdown-chat">
                      {parseThinking(m.content).map((part, i) => {
                        if (part.type === "think") {
                          return (
                            <details
                              key={i}
                              className="mb-2 rounded-lg border border-border bg-card/50 px-3 py-2 text-xs"
                            >
                              <summary className="cursor-pointer font-bold text-muted-foreground outline-none">
                                Thinking Process
                              </summary>
                              <div className="mt-2 text-muted-foreground markdown-chat">
                                <Markdown>{part.content}</Markdown>
                              </div>
                            </details>
                          );
                        }
                        return <Markdown key={i}>{part.content}</Markdown>;
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted p-3 text-sm">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"></span>
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                  <span
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40"
                    style={{ animationDelay: "0.4s" }}
                  ></span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2 rounded-2xl border border-border bg-input p-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask NourishAI..."
              className="max-h-32 min-h-10 w-full resize-none bg-transparent px-3 py-2.5 text-sm focus:outline-none"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="m-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
