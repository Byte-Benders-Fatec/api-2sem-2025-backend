import cors from "cors";

export const corsMiddleware = cors({
  origin: [
    "http://localhost:19006", // Expo web
    "http://localhost:3000",
    "exp://127.0.0.1:19000"
  ],
  credentials: false
});
