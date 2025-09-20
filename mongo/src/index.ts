import express from "express";
import "dotenv/config";
import { connectMongo } from "./configs/db.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { corsMiddleware } from "./middlewares/cors.middleware.js";
import imoveisRoutes from "./routes/imoveis.routes.js";

async function main() {
  await connectMongo();
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/imoveis", imoveisRoutes);

  app.use(errorHandler);

  const port = Number(process.env.PORT || 3001);
  app.listen(port, () => console.log(`API up on http://localhost:${port}`));
}

main().catch((e) => {
  console.error("Boot error:", e);
  process.exit(1);
});
