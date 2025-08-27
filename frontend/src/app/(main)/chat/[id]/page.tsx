"use client";

import InputArea from "@/components/Chat/InputArea";
import ResponseCard from "@/components/Chat/ResponseCard";
import WelcomeChatScreen from "@/components/Chat/ChatWelcomeScreen";
import { useEffect, useRef, useState } from "react";
import { useApiActions } from "@/hooks/useApiActions";
import { useParams } from "next/navigation";

export default function ChatPage() {
  const { handleChat } = useApiActions();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "ai"; message: string }[]
  >([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const params = useParams();
  const file_uid = params.id as string;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (msg: string) => {
    setMessages((prev) => [...prev, { role: "user", message: msg }]);

    await handleChat(
      msg,
      file_uid,
      (aiMsg) => {
        setMessages((prev) => [...prev, { role: "ai", message: aiMsg }]);
      },
      () => {},
      (err) => {
        setMessages((prev) => [
          ...prev,
          { role: "ai", message: `Error: ${err}` },
        ]);
      }
    );
  };

  return (
    <div className="flex flex-col h-[93vh] m-auto max-w-5xl py-3">
      <div className="flex-1 flex flex-col overflow-y-auto space-y-2 px-2">
        {messages.length === 0 ? (
          <WelcomeChatScreen />
        ) : (
          messages.map((m, i) => (
            <ResponseCard key={i} role={m.role} message={m.message} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-2 px-2">
        <InputArea
          message={message}
          setMessage={setMessage}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
