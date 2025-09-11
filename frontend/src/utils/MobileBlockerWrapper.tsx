"use client";

import { useEffect, useState } from "react";
import MobileBlocker from "@/components/MobileBlocker";

export default function MobileBlockerWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile) {
    return <MobileBlocker />;
  }

  return <>{children}</>;
}
