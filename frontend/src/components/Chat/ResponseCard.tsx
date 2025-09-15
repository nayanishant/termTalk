import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Components } from "react-markdown";
import "highlight.js/styles/github.css";

interface ResponseCardProps {
  role: "user" | "ai" | "error";
  message: string;
  source?: string;
  page?: string | null;
}

const ResponseCard = ({ role, message, source, page }: ResponseCardProps) => {
  const isUser = role === "user";
  const isError = role === "error";

  const components: Components = {
    a: (props) => (
      <a {...props} className="text-blue-500 underline" target="_blank" />
    ),
    code: ({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) =>
      !inline ? (
        <pre className="bg-gray-900 text-gray-100 p-2 rounded-md overflow-x-auto text-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      ) : (
        <code className="bg-gray-200 text-red-600 px-1 py-0.5 rounded text-sm">
          {children}
        </code>
      ),
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl mb-3 
        max-w-[80%] sm:max-w-[70%] md:max-w-[60%] 
        break-words shadow-sm
        ${
          isUser
            ? "bg-white text-card-color ml-auto border border-gray-200"
            : isError
            ? "bg-red-100 text-red-800 mr-auto border border-red-300"
            : "bg-card-color text-card-text-color mr-auto"
        }`}
    >
      <div className="prose prose-sm sm:prose-base max-w-none leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={components}
        >
          {message}
        </ReactMarkdown>

        {source && page && !isUser && !isError && (
          <div className="text-xs text-gray-500 mt-1">
            📄 Source: {source}, Page: {page ?? "N/A"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseCard;
