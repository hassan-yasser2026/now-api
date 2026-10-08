export const API_BASE_URL =
  process.env.NOW_API_URL?.trim().replace(/\/+$/, "") ||
  "https://api.now-eg.com/api";
