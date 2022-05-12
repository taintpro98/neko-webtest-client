import axios from "axios";
const axiosInstance = axios.create({
  baseURL: "http://13.212.107.173:8000",
  timeout: 1000,
});
export default axiosInstance;
