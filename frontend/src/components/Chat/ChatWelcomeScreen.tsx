"use client";

interface WelcomeChatScreenProps {
  onPromptClick: (prompt: string) => void;
}

const promptExampleData: Array<{ heading: string; prompt: string }> = [
  {
    heading: "Extract and Explain Specific Clause",
    prompt:
      "Please extract the section of the Terms and Conditions related to user data privacy and explain in simple language what it means for me as a user. Include any specific obligations I have to protect my data.",
  },
  {
    heading: "Compare and Analyze Termination Terms",
    prompt:
      "Compare the termination clauses in this T&C with standard industry practices for online services. Highlight any unusual terms and explain their implications for me as a user.",
  },
];

const WelcomeChatScreen = ({ onPromptClick }: WelcomeChatScreenProps) => {
  return (
    <div className="max-w-full sm:max-w-2xl lg:max-w-4xl 2xl:max-w-5xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-36 2xl:py-44 m-auto">
      <div className="flex flex-col justify-center items-center gap-10 w-full">
        <div className="flex flex-col justify-center items-center gap-2 text-center">
          <p className="text-2xl sm:text-3xl text-card-color font-bold">
            Welcome,
          </p>
          <p className="text-base sm:text-lg font-bold text-card-color">
            Unlock Your Terms with Ease
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {promptExampleData.map((item, index) => (
            <div
              key={index}
              className="flex flex-col bg-card-color text-card-text-color rounded-xl p-4 sm:p-6 text-sm sm:text-base gap-2 w-full transition-transform duration-300 ease-in-out hover:-translate-y-0.5 shadow-xl cursor-pointer"
              onClick={() => onPromptClick(item.prompt)}
              role="button"
              aria-label={`Select prompt: ${item.prompt}`}
            >
              <p className="font-bold">{item.heading}</p>
              <p className="text-xs sm:text-sm md:text-base line-clamp-4 sm:line-clamp-none">
                {item.prompt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeChatScreen;
