'use client';

interface ResponseCardProps {
  role: "user" | "ai" | "error";
  message: string;
  source?: string;
  page?: string | null;
}

const ResponseCard = ({ role, message, source, page }: ResponseCardProps) => {
  const isUser = role === "user";
  const isError = role === "error";

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
      <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
        {message}
        {source && page && !isUser && !isError && (
          <div className="text-xs text-gray-500 mt-1">
            Source: {source}, Page: {page ?? "N/A"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseCard;
