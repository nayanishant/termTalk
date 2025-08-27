"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button } from "../ui/button";
import api_url from "@/utils/api";
import { toast } from "sonner";

const FileUploadCard = ({
  onUploadSuccess,
}: {
  onUploadSuccess?: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleUploadFile = async (file: File) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api_url.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success(response.data.message);

      if (onUploadSuccess) onUploadSuccess();

      return { data: response.data };
    } catch (error: any) {
      let errorMessage = "Something went wrong while uploading the file.";

      if (error.response && error.response.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }

      toast.error(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadFile(file);
      e.target.value = "";
    }
  };

  return (
    <div className="rounded-3xl border-card-color border-dashed border-[2px] h-96 w-full max-w-[16rem] sm:max-w-[18rem] md:max-w-[20rem] lg:max-w-[24rem] aspect-square flex flex-col items-center justify-center text-center">
      <div className="flex flex-col gap-3 items-center">
        <UploadCloud className="h-40 w-40" />
        <p className="text-base text-card-color font-medium">
          Click button below to upload
        </p>
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <Button
          disabled={loading}
          className={`bg-card-color text-card-text-color px-3 py-4 shadow-[10px_10px_30px_rgba(0,_0,_0,_0.25)] text-center w-60 rounded-lg cursor-pointer transform transition-transform duration-300 ease-in-out hover:-translate-y-0.5 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          onClick={handleButtonClick}
        >
          {loading ? "Uploading..." : "Browse File"}
        </Button>
        <p className="text-xs text-card-color font-medium">
          Supported Format: PDF
        </p>
      </div>
    </div>
  );
};

export default FileUploadCard;
