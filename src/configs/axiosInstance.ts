import axios from "axios";
const axiosInstance = axios.create({
  // baseURL: "http://13.214.169.217:8000",
  baseURL: "http://localhost:8000",
  // baseURL: "https://battle-api.nekoverse.net",
  timeout: 1000,
});
export default axiosInstance;