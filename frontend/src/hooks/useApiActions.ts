import api_url from "@/utils/api";
import { AxiosError } from "axios";

interface ChatResponse {
  answer?: string;
  source?: string;
  page?: string | null;
  error?: string;
}

interface ApiError {
  message?: string;
  error?: string;
}

export const useApiActions = () => {
  const handleGetFile = async () => {
    try {
      const response = await api_url.get("/files");
      const data = response.data;

      if (!data || data.length === 0) {
        return { error: "No files found. Please upload a file." };
      }

      return { data };
    } catch (error) {
      const err = error as AxiosError<ApiError | string>;
      let errorMessage = "Something went wrong while fetching files.";

      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }

      return { error: errorMessage };
    }
  };

  const handleDeleteFile = async (fileUId: string) => {
    try {
      const response = await api_url.delete(`/delete-file/${fileUId}`);
      return response.data;
    } catch (error) {
      const err = error as AxiosError<ApiError>;
      return { error: err.response?.data?.error || err.message };
    }
  };

  const handleUploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api_url.post("/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      return { data: response.data };
    } catch (error) {
      const err = error as AxiosError<ApiError | string>;
      let errorMessage = "Something went wrong while uploading the file.";

      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorMessage = err.response.data;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        }
      }

      return { error: errorMessage };
    }
  };

  const handleChat = async (
    question: string,
    file_uid: string,
    onMessage: (msg: string, source?: string, page?: string | null) => void,
    onDone?: () => void,
    onError?: (err: string) => void
  ) => {
    if (!question.trim()) {
      onError?.('Missing or empty "question" field');
      return;
    }
    if (!file_uid.trim()) {
      onError?.('Missing or empty "file_uid" field');
      return;
    }

    try {
      const response = await api_url.post("/chat", { question, file_uid });
      const { answer, source, page, error } = response.data as ChatResponse;

      if (error) {
        onError?.(error);
      } else if (answer) {
        onMessage(answer, source, page);
      } else {
        onError?.("No answer received from server");
      }

      onDone?.();
    } catch (error) {
      const err = error as AxiosError<ApiError>;
      onError?.(
        err.response?.data?.error ||
          err.message ||
          `Failed to process query for file_uid ${file_uid}`
      );
    }
  };

  return {
    handleGetFile,
    handleDeleteFile,
    handleUploadFile,
    handleChat,
  };
};
