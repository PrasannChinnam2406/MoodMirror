import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:8080/api" });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const register = (data) => API.post("/auth/register", data);
export const login = (data) => API.post("/auth/login", data);
export const logMood = (rawInput) => API.post("/mood/log", { rawInput });
export const submitFeedback = (entryId, helped) =>
  API.post(`/mood/${entryId}/feedback`, { helped });
export const getMoodHistory = (limit = 20) =>
  API.get(`/mood/history?limit=${limit}`);
export const getPatterns = () => API.get("/mood/patterns");
export const getAnalytics = () => API.get("/mood/analytics");
export const checkNudge = () => API.get("/nudge");
