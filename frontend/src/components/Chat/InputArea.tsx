"use client";

import { useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "../ui/button";

interface InputAreaProps {
  message: string;
  setMessage: (msg: string) => void;
  onSend: (msg: string) => void;
  disabled?: boolean;
}

const InputArea = ({
  message,
  setMessage,
  onSend,
  disabled,
}: InputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    const trimmedMsg = message.trim();
    if (!trimmedMsg || disabled) return;
    onSend(trimmedMsg);
    setMessage("");
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <div className="flex items-center gap-3 border border-gray-200 rounded-2xl shadow-md px-3 py-2 w-full bg-white/70 backdrop-blur-sm">
      <div className="flex-1">
        <textarea
          ref={textareaRef}
          name="TextArea"
          placeholder="Enter your query here..."
          value={message}
          onChange={(e) => {
            const textarea = e.target;
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
            setMessage(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !disabled) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled}
          rows={1}
          className={`resize-none text-sm placeholder:text-gray-400 outline-none text-gray-800 bg-transparent leading-5 min-h-7 pt-1.5 w-full ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
      </div>
      <div className="border-l border-gray-200 pl-2 flex items-center">
        <Button
          size="icon"
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          className="rounded-full p-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-200 ease-in-out disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
};

export default InputArea;
