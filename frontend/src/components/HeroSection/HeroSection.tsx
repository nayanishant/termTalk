import { Button } from "../ui/button";
import Link from "next/link";

interface ICardData {
  primaryText: string;
  secondaryText: string;
}

const cardData: ICardData[] = [
  {
    primaryText: "Instant PDF Analysis",
    secondaryText:
      "Upload your Terms & Conditions PDF and get immediate insights with AI-powered processing.",
  },
  {
    primaryText: "Ask Anything",
    secondaryText:
      "Use natural language prompts to query specific clauses, obligations, or rights in seconds.",
  },
  {
    primaryText: "Accurate Responses",
    secondaryText:
      "Our RAG system retrieves relevant sections and generates clear, context-aware answers.",
  },
  {
    primaryText: "Summarize with Ease",
    secondaryText:
      "Get concise summaries of complex T&Cs, saving you time and effort.",
  },
  {
    primaryText: "Secure & Private",
    secondaryText:
      "Your uploaded documents are processed securely with strict data privacy measures.",
  },
  {
    primaryText: "User-Friendly Interface",
    secondaryText:
      "Simple drag-and-drop upload and intuitive query system for all users.",
  },
];

const HeroSection = () => {
  return (
    <div className="flex flex-col items-center overflow-hidden">
      <div className="text-card-color text-center flex flex-col gap-4 sm:gap-6 py-6 sm:py-8 md:py-12 lg:py-28 2xl:py-36 px-4 sm:px-6 md:px-8 lg:px-16 w-full max-w-7xl mx-auto">
        <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold">
          Demystify Terms & Conditions with AI-Powered Insights
        </p>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl px-0 sm:px-4 md:px-8 lg:px-16 2xl:px-20">
          Upload your PDF, ask any question, and let our RAG system deliver
          precise, context-aware answers in seconds—no more endless scrolling
          through legal jargon.
        </p>
      </div>
      <Button
        asChild
        className="bg-card-color text-card-text-color px-3 sm:px-4 py-2 sm:py-3 shadow-lg rounded-lg cursor-pointer transition-transform duration-300 ease-in-out hover:-translate-y-0.5 w-40 sm:w-48 md:w-60 z-10"
      >
        <Link href="/all-documents">Get Started</Link>
      </Button>
      <div className="marquee bg-background-color w-full h-24 px-8 sm:px-16 sm:h-32 md:h-40 lg:h-60 xl:h-[22.2rem] 2xl:h-[23.8rem] flex items-center overflow-hidden -mt-4">
        <div className="flex animate-marquee gap-6 whitespace-nowrap my-6.5">
          {[...cardData, ...cardData].map((item, index) => (
            <div
              key={`card-${index}`}
              className="bg-card-color text-card-text-color flex flex-col items-start py-3 sm:py-4 px-3 sm:px-4 text-left rounded-xl sm:rounded-2xl min-w-[180px] sm:min-w-[220px] md:min-w-[260px] lg:min-w-96 h-20 sm:h-24 md:h-28 lg:h-32 xl:h-36 overflow-hidden"
            >
              <p className="font-medium break-words whitespace-normal mb-3">
                {item.primaryText}
              </p>
              <p className="font-medium text-base break-words whitespace-normal">
                {item.secondaryText}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
