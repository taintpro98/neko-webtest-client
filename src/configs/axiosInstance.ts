import axios from "axios";
const axiosInstance = axios.create({
  baseURL: "http://13.214.169.217:8000",
  timeout: 1000,
});
export default axiosInstance;
