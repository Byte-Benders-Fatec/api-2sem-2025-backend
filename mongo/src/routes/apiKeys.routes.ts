import { Router } from "express";
import { createApiKey } from "../services/apiKey.service.js";
import { getCollection } from "../configs/db.js";

const router = Router();
const MASTER = process.env.MASTER_KEY!;

function requireMaster(req: any, res: any, next: any) {
  if (req.header("x-master-key") !== MASTER) {
    return res.status(401).json({ error: "MASTER key required" });
  }
  next();
}

/** criar API key */
router.post("/", requireMaster, async (req, res, next) => {
  try {
    const { name, role = "public", scopes = [], expiresAt } = req.body || {};
    const created = await createApiKey({ name, role, scopes, expiresAt });
    res.status(201).json(created); // mostra o segredo 1x
  } catch (e) { next(e); }
});

/** listar (sem segredo) */
router.get("/", requireMaster, async (_req, res, next) => {
  try {
    const col = getCollection("api_keys");
    const items = await col.find({}, { projection: { hash: 0, salt: 0 } }).toArray();
    res.json(items);
  } catch (e) { next(e); }
});

// GET uma chave específica (sem hash/salt)
router.get("/:keyId", requireMaster, async (req, res, next) => {
  try {
    const col = getCollection("api_keys");
    const doc = await col.findOne(
      { keyId: req.params.keyId },
      { projection: { hash: 0, salt: 0 } }
    );
    if (!doc) return res.status(404).json({ error: "Key not found" });
    res.json(doc);
  } catch (e) { next(e); }
});

/** revogar */
router.post("/:keyId/revoke", requireMaster, async (req, res, next) => {
  try {
    const col = getCollection("api_keys");
    await col.updateOne({ keyId: req.params.keyId }, { $set: { status: "revoked" } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 1) REATIVAR chave revogada
router.post("/:keyId/activate", requireMaster, async (req, res, next) => {
  try {
    const col = getCollection("api_keys");
    const r = await col.updateOne(
      { keyId: req.params.keyId, status: "revoked" },
      { $set: { status: "active" } }
    );
    if (r.matchedCount === 0) return res.status(404).json({ error: "Key not found or not revoked" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 2) DELETAR chave do banco
router.delete("/:keyId", requireMaster, async (req, res, next) => {
  try {
    const col = getCollection("api_keys");
    const r = await col.deleteOne({ keyId: req.params.keyId });
    if (r.deletedCount === 0) return res.status(404).json({ error: "Key not found" });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
