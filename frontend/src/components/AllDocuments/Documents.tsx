"use client";

import { useState, useEffect, useCallback } from "react";
import FileUploadCard from "@/components/AllDocuments/FileUploadCard";
import { FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApiActions } from "@/hooks/useApiActions";

interface IFile {
  id: number;
  uid: string;
  name: string;
  status: string;
}

const Documents = () => {
  const [files, setFiles] = useState<IFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { handleGetFile } = useApiActions();
  const router = useRouter();

const fetchFiles = useCallback(async () => {
  try {
    const result = await handleGetFile();
    if (result.error) {
      setError(result.error);
      setFiles([]);
    } else if (result.data) {
      setFiles(result.data);
      setError(null);
    }
  } catch {
    setError("Failed to fetch files.");
    setFiles([]);
  }
}, [handleGetFile]);

useEffect(() => {
  fetchFiles();
  const intervalId = setInterval(fetchFiles, 10000);
  return () => clearInterval(intervalId);
}, []);

  const handleCardClick = (id: string) => {
    router.push(`/chat/${id}`);
  };

  return (
    <div className="w-full flex flex-wrap gap-4 h-[89vh] overflow-y-auto p-1">
      <FileUploadCard onUploadSuccess={fetchFiles} />

      {files.length > 0 &&
        files.map((file) => (
          <div
            key={file.id}
            onClick={() => handleCardClick(file.uid)}
            className="group bg-background-color rounded-3xl border-card-color cursor-pointer border-[2px] w-full max-w-[16rem] sm:max-w-[18rem] md:max-w-[20rem] lg:max-w-[24rem] aspect-square flex flex-col items-center justify-center text-center hover:shadow-2xl max-h-96 transition-transform duration-300 ease-in-out hover:-translate-y-0.5"
          >
            <div className="flex flex-col justify-center items-center flex-1 px-2 sm:px-4 w-full">
              <div className="my-6 sm:my-8 2xl:my-11 flex flex-col items-center w-full">
                <FileText className="w-20 sm:w-24 md:w-28 lg:w-32 h-20 sm:h-24 md:h-28 lg:h-32" />
                <p className="mt-2 text-sm sm:text-base truncate max-w-[98%]">
                  {file.name}
                </p>
              </div>
              <p
                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium 
              ${
                file.status === "Completed"
                  ? "bg-green-100 text-green-700"
                  : file.status === "Processing"
                  ? "bg-yellow-100 text-yellow-700 animate-pulse"
                  : file.status === "Failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-card-color"
              }`}
              >
                {file.status}
              </p>
            </div>

            <div
              className="w-full flex items-center justify-center h-8 sm:h-10 
                  bg-gradient-to-b from-background-color to-gradient-start 
                  text-primaryText text-center px-2 sm:px-3 
                  opacity-0 group-hover:opacity-100 rounded-b-3xl 
                  text-xs sm:text-sm transform translate-y-full 
                  group-hover:translate-y-0 
                  transition-all duration-500 ease-in-out delay-150 group-hover:delay-0"
            >
              Unlock T&C Insights – Click to Chat!
            </div>
          </div>
        ))}

      {error && (
        <p className="text-red-500 text-sm flex justify-center items-end px-96">
          {error}
        </p>
      )}
    </div>
  );
};

export default Documents;
