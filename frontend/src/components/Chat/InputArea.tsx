"use client";

import { useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "../ui/button";

interface InputAreaProps {
  message: string;
  setMessage: (msg: string) => void;
  onSend: (msg: string) => void;
}

const InputArea = ({ message, setMessage, onSend }: InputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage("");
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "28px";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  return (
    <div className="flex justify-between items-end gap-3 border border-gray-200 rounded-2xl shadow-md px-3 py-2 w-full bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col-reverse flex-1 min-h-[28px]">
        <textarea
          ref={textareaRef}
          placeholder="Enter your query here..."
          value={message}
          onChange={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            setMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          className="resize-none text-sm placeholder:text-gray-400 outline-none text-gray-800 bg-transparent leading-[1.25rem] placeholder:leading-[1.25rem] overflow-hidden"
        />
      </div>

      <div className="border-l border-gray-200 pl-2 flex items-center">
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim()}
          className="rounded-full p-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-200 ease-in-out disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default InputArea;
