'use client'

import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

const NavBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const hideBackButton = ["/", "/all-documents"].includes(pathname);

  return (
    <div className="flex justify-between items-center px-14 xl:py-2.5 2xl:py-4">
      <p className="font-semibold text-lg">TermTalk</p>
      {!hideBackButton && (
        <Button
          size="icon"
          variant="ghost"
          className="cursor-pointer transition-transform duration-300 ease-in-out hover:-translate-y-0.5"
          onClick={() => router.back()}
        >
          <ArrowLeft />
        </Button>
      )}
    </div>
  );
};

export default NavBar;
