"use client";

import InputArea from "@/components/Chat/InputArea";
import ResponseCard from "@/components/Chat/ResponseCard";
import WelcomeChatScreen from "@/components/Chat/ChatWelcomeScreen";
import { useEffect, useRef, useState, useCallback } from "react";
import { useApiActions } from "@/hooks/useApiActions";
import { useParams } from "next/navigation";

interface Message {
  role: "user" | "ai" | "error";
  message: string;
  source?: string;
  page?: string | null;
}

export default function ChatPage() {
  const { handleChat } = useApiActions();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const file_uid = params.id as string;

  useEffect(() => {
    if (!file_uid || !/^[a-zA-Z0-9-]+$/.test(file_uid)) {
      setMessages((prev) => [
        ...prev,
        { role: "error", message: "Invalid or missing file UID" },
      ]);
    }
  }, [file_uid]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = useCallback(
    async (msg: string) => {
      const trimmedMsg = msg.trim();
      if (!trimmedMsg) return;

      setMessages((prev) => [...prev, { role: "user", message: trimmedMsg }]);
      setIsLoading(true);

      await handleChat(
        trimmedMsg,
        file_uid,
        (aiMsg, source, page) => {
          setMessages((prev) => [
            ...prev,
            { role: "ai", message: aiMsg, source, page },
          ]);
        },
        () => setIsLoading(false),
        (err) => {
          console.error(`Chat error for file_uid ${file_uid}: ${err}`);
          setMessages((prev) => [
            ...prev,
            { role: "error", message: `Error: ${err}` },
          ]);
        }
      );

      setIsLoading(false);
    },
    [file_uid, handleChat]
  );

  const handlePromptClick = useCallback((prompt: string) => {
    setMessage(prompt);
  }, []);

  return (
    <div className="flex flex-col h-[93vh] m-auto max-w-5xl py-3">
      <div className="flex-1 flex flex-col overflow-y-auto space-y-2 px-2">
        {messages.length === 0 && !isLoading ? (
          <WelcomeChatScreen onPromptClick={handlePromptClick} />
        ) : (
          <>
            {messages.map((m, i) => (
              <ResponseCard
                key={i}
                role={m.role}
                message={m.message}
                source={m.source}
                page={m.page}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>
      {isLoading && (
        <div className="flex justify-center items-center py-2">
          <div
            className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"
            role="status"
            aria-label="Loading"
          />
        </div>
      )}
      <div className="mt-2 px-2">
        <InputArea
          message={message}
          setMessage={setMessage}
          onSend={handleSend}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
