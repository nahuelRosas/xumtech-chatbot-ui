import { useState, useEffect, useRef, type FC } from "react";
import { useMastraChatContext } from "../../hooks/useMastraChat";
import { useAuth } from "../../hooks/useAuth";
import { useMastraChat } from "../../api/useMastraChat";
import { GiCookingPot } from "react-icons/gi";
import { AiOutlineRobot } from "react-icons/ai";
import { FiUser, FiTrash2, FiSend } from "react-icons/fi";
import type { AppUser } from "../../contexts/authContext";
import AdminPanel from "../admin/AdminPanel";
import { useGetQuests } from "../../api/useQuests";

interface Message {
  role: "user" | "system";
  content: string;
}

export default function Chat() {
  const { user } = useAuth();
  const { clearHistory } = useMastraChatContext();
  const [activeTab, setActiveTab] = useState<"chat" | "admin">("chat");

  return (
    <section className="flex justify-center w-full h-full bg-white py-6">
      <div className="w-full px-4 h-full flex flex-col">
        <header className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GiCookingPot className="text-orange-500 w-7 h-7" />
            Mastra Chat
          </h1>
          {activeTab === "chat" && (
            <button
              onClick={clearHistory}
              aria-label="Clear chat history"
              className="inline-flex items-center gap-2 px-3 py-1 border rounded-md border-gray-200 text-sm hover:bg-gray-50 cursor-pointer"
            >
              <FiTrash2 />
              <span>Clear</span>
            </button>
          )}
        </header>

        <div className="border-b border-gray-100 pb-2">
          <nav className="flex items-center gap-4">
            <TabButton
              label="Chat"
              isActive={activeTab === "chat"}
              onClick={() => setActiveTab("chat")}
            />
            {user?.role === "admin" && (
              <TabButton
                label="Admin"
                isActive={activeTab === "admin"}
                onClick={() => setActiveTab("admin")}
              />
            )}
          </nav>
        </div>

        <div className="flex-1 overflow-hidden mt-4 w-full">
          {activeTab === "chat" && <ChatPanel />}
          {activeTab === "admin" && (
            <div className="h-full w-full">
              <AdminPanel />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const ChatPanel: FC = () => {
  const { history, addMessage, conversationId } = useMastraChatContext();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const composingRef = useRef(false);
  const [pendingMessage, setPendingMessage] = useState("");

  const getQuests = useGetQuests();

  const { isLoading, data, error } = useMastraChat(
    pendingMessage,
    conversationId,
    {
      enabled: !!pendingMessage,
    }
  );

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading || composingRef.current) return;
    addMessage({ role: "user", content: text });
    setPendingMessage(text);
    setInput("");
  };

  useEffect(() => {
    if (data?.payload?.answer) {
      addMessage({ role: "system", content: data.payload.answer });
    }
    if (error) {
      addMessage({
        role: "system",
        content: "Sorry, something went wrong. Please try again.",
      });
    }
    if (data || error) {
      setPendingMessage("");
    }
  }, [data, error, addMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isLoading]);

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-xl shadow-sm overflow-hidden">
      <div
        role="log"
        aria-live="polite"
        className="flex-1 p-6 space-y-6 overflow-y-auto"
      >
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-orange-500">
            <GiCookingPot className="w-16 h-16 mb-4 text-orange-400" />
            <h2 className="text-lg font-medium text-gray-900">
              Welcome to Mastra!
            </h2>
            <p className="text-gray-500">
              Ask for a recipe, tip, or ingredient to get started.
            </p>
          </div>
        ) : (
          history.map((msg: Message, idx: number) => (
            <ChatMessage key={idx} message={msg} user={user} />
          ))
        )}
        {isLoading && <ChatLoader />}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        {history.length === 0 && getQuests.data?.payload?.length ? (
          <FloatingPrompts
            quests={getQuests.data.payload}
            onPrompt={(q) => {
              addMessage({ role: "user", content: q });
              setPendingMessage(q);
            }}
          />
        ) : null}

        <div className="flex gap-3 p-4 border-t border-gray-100 items-center">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Mastra anything..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onCompositionStart={() => (composingRef.current = true)}
            onCompositionEnd={() => (composingRef.current = false)}
            aria-label="Message input"
            className="flex-1 w-full px-4 py-2 text-gray-900 placeholder-gray-500 bg-white/90 transition-all duration-200 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
            className={`p-3 text-white rounded-lg shadow-sm transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              isLoading || !input.trim()
                ? "bg-gray-400"
                : "bg-gray-900 hover:scale-105"
            }`}
          >
            <FiSend className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const FloatingPrompts: FC<{
  quests: { uid: string; question: string }[];
  onPrompt: (q: string) => void;
}> = ({ quests, onPrompt }) => {
  const [visiblePrompts, setVisiblePrompts] = useState<string[]>([]);

  useEffect(() => {
    if (!quests || !quests.length) return;
    const max = Math.min(3, quests.length);
    const shuffled = [...quests].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, max).map((q) => q.question);
    setVisiblePrompts(picked);
  }, [quests]);

  if (!visiblePrompts.length) return null;

  return (
    <div className="pointer-events-none absolute left-0 right-0 bottom-20 flex justify-center gap-4 z-20 px-4">
      {visiblePrompts.map((p, idx) => (
        <button
          key={idx}
          onClick={() => onPrompt(p)}
          className="pointer-events-auto inline-flex items-center px-4 py-2 bg-white/95 text-sm text-gray-800 border border-gray-200 rounded-full shadow-sm hover:scale-105 transform transition-transform cursor-pointer"
        >
          {p}
        </button>
      ))}
    </div>
  );
};

const TabButton: FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => (
  <button
    role="tab"
    aria-selected={isActive}
    onClick={onClick}
    className={`px-3 py-2 rounded-md text-sm cursor-pointer ${
      isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
    }`}
  >
    {label}
  </button>
);

const ChatMessage: FC<{ message: Message; user: AppUser | null }> = ({
  message,
}) => {
  const isUser = message.role === "user";

  if (message.role === "system") {
    return (
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center">
          <AiOutlineRobot className="w-7 h-7 text-amber-500" />
        </div>
        <div className="rounded-2xl px-4 py-3 max-w-[78%] bg-amber-50 border border-amber-200 text-amber-900 text-sm shadow-sm">
          <div className="text-xs font-semibold text-amber-700 mb-1">
            Mastra
          </div>
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-end gap-3 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isUser && (
        <div className="flex items-center justify-center">
          <AiOutlineRobot className="w-7 h-7 text-amber-500" />
        </div>
      )}

      <div
        className={`rounded-2xl px-4 py-3 max-w-[78%] break-words ${
          isUser
            ? "bg-indigo-900 text-white shadow-md"
            : "bg-white text-gray-900 shadow-sm border border-gray-100"
        }`}
      >
        <div
          className={`text-xs font-semibold mb-1 ${
            isUser ? "text-white/80 text-right" : "text-amber-700"
          }`}
        >
          {isUser ? "You" : "Mastra"}
        </div>
        <div className="whitespace-pre-wrap text-sm">{message.content}</div>
      </div>

      {isUser && (
        <div className="flex items-center justify-center">
          <FiUser className="w-7 h-7 text-indigo-800" />
        </div>
      )}
    </div>
  );
};

const ChatLoader: FC = () => (
  <div className="flex items-end gap-3 justify-start">
    <div className="flex items-center justify-center w-8 h-8 text-amber-600 bg-amber-100 rounded-full flex-shrink-0">
      <AiOutlineRobot className="w-4 h-4 text-amber-600" />
    </div>
    <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-2xl rounded-bl-lg border border-amber-200 shadow-sm">
      <span className="w-2.5 h-2.5 bg-amber-300 rounded-full animate-pulse" />
      <span
        className="w-2.5 h-2.5 bg-amber-300 rounded-full animate-pulse"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2.5 h-2.5 bg-amber-300 rounded-full animate-pulse"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  </div>
);
