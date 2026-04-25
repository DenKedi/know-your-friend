import { Router, type IRouter } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  resetToDefaults,
  getCategory,
} from "../lib/categories-store";

const router: IRouter = Router();

function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9_]{1,64}$/i.test(id);
}

function isValidString(s: unknown, max = 128): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.trim().length <= max;
}

router.get("/categories", async (_req, res) => {
  res.json(getCategories());
});

router.post("/categories", async (req, res): Promise<void> => {
  const { id, label, leftLabel, rightLabel } = req.body ?? {};
  if (!isValidId(id) || !isValidString(label) || !isValidString(leftLabel) || !isValidString(rightLabel)) {
    res.status(400).json({ error: "Invalid payload. id [a-z0-9_], label/leftLabel/rightLabel non-empty (max 128 chars)." });
    return;
  }
  if (getCategory(id)) {
    res.status(409).json({ error: "Category with this id already exists" });
    return;
  }
  try {
    const created = await createCategory({
      id: id.toLowerCase(),
      label: label.trim(),
      leftLabel: leftLabel.trim(),
      rightLabel: rightLabel.trim(),
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/categories/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { label, leftLabel, rightLabel } = req.body ?? {};
  if (!getCategory(id)) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const patch: Record<string, string> = {};
  if (label !== undefined) {
    if (!isValidString(label)) {
      res.status(400).json({ error: "label must be a non-empty string ≤128 chars" });
      return;
    }
    patch["label"] = label.trim();
  }
  if (leftLabel !== undefined) {
    if (!isValidString(leftLabel)) {
      res.status(400).json({ error: "leftLabel must be a non-empty string ≤128 chars" });
      return;
    }
    patch["leftLabel"] = leftLabel.trim();
  }
  if (rightLabel !== undefined) {
    if (!isValidString(rightLabel)) {
      res.status(400).json({ error: "rightLabel must be a non-empty string ≤128 chars" });
      return;
    }
    patch["rightLabel"] = rightLabel.trim();
  }
  try {
    const updated = await updateCategory(id, patch);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  try {
    const ok = await deleteCategory(id);
    if (!ok) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post("/categories/reset", async (_req, res) => {
  await resetToDefaults();
  res.json({ ok: true, count: getCategories().length });
});

export default router;
