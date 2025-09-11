"use client";

import { useEffect, useState } from "react";
import { Info, Laptop2 } from "lucide-react";

export default function MobileBlocker() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkDevice();

    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-6">
        <Laptop2 className="w-16 h-16 mx-auto text-teal" />
        <p className="text-secondaryText">
          Go to desktop.
        </p>
      </div>
    </div>
  );
}
