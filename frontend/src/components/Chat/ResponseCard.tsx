"use client";

interface ResponseCardProps {
  role: "user" | "ai";
  message: string;
}

const ResponseCard = ({ role, message }: ResponseCardProps) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl mb-3 
        max-w-[80%] sm:max-w-[70%] md:max-w-[60%] 
        break-words shadow-sm
        ${
          isUser
            ? "bg-white text-card-color ml-auto border border-gray-200"
            : "bg-card-color text-card-text-color mr-auto"
        }`}
    >
      <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
        {message}
      </div>
    </div>
  );
};

export default ResponseCard;
