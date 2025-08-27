import api_url from "@/utils/api";

export const useApiActions = () => {
  const handleGetFile = async () => {
    try {
      const response = await api_url.get("/files");
      const data = response.data;

      if (!data || data.length === 0) {
        return { error: "No files found. Please upload a file." };
      }

      return { data };
    } catch (error: any) {
      let errorMessage = "Something went wrong while fetching files.";

      if (error.response && error.response.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }

      return { error: errorMessage };
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

      return { error: errorMessage };
    }
  };

  const handleChat = async (
    question: string,
    file_uid: string,
    onMessage: (msg: string) => void,
    onDone?: () => void,
    onError?: (err: string) => void
  ) => {
    if (!question) {
      onError?.("Missing 'question' field");
      return;
    }
    if (!file_uid) {
      onError?.("Missing 'file_uid' field");
      return;
    }

    try {
      const response = await api_url.post(
        "/chat",
        { question, file_uid },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.data.answer) {
        onMessage(response.data.answer);
      } else if (response.data.error) {
        onError?.(response.data.error);
      }

      onDone?.();
    } catch (err: any) {
      onError?.(
        err?.response?.data?.error ||
          err.message ||
          "Something went wrong while sending the chat request."
      );
    }
  };
  
  return {
    handleGetFile,
    handleUploadFile,
    handleChat,
  };
};
