import axios from "axios";

const api_url = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}`,
});

export default api_url;
