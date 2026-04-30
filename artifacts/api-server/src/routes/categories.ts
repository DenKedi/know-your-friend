import { Router, type IRouter } from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  resetToDefaults,
  getCategory,
} from "../lib/categories-store";
import type { CategoryTranslation } from "../lib/category-types";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "../lib/languages";

const router: IRouter = Router();

function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[a-z0-9_]{1,64}$/i.test(id);
}

function isValidString(s: unknown, max = 128): s is string {
  return typeof s === "string" && s.trim().length > 0 && s.trim().length <= max;
}

function parseTranslation(value: unknown): CategoryTranslation | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const translation = value as Record<string, unknown>;
  if (!isValidString(translation.label) || !isValidString(translation.leftLabel) || !isValidString(translation.rightLabel)) {
    return null;
  }

  return {
    label: translation.label.trim(),
    leftLabel: translation.leftLabel.trim(),
    rightLabel: translation.rightLabel.trim(),
  };
}

function parseCompleteTranslations(value: unknown): Record<LanguageCode, CategoryTranslation> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const translations = {} as Record<LanguageCode, CategoryTranslation>;

  for (const language of SUPPORTED_LANGUAGES) {
    const translation = parseTranslation(raw[language]);
    if (!translation) {
      return null;
    }
    translations[language] = translation;
  }

  return translations;
}

router.get("/categories", async (_req, res) => {
  res.json(getCategories());
});

router.post("/categories", async (req, res): Promise<void> => {
  const { id, translations } = req.body ?? {};
  const parsedTranslations = parseCompleteTranslations(translations);
  if (!isValidId(id) || !parsedTranslations) {
    res.status(400).json({ error: "Invalid payload. id [a-z0-9_] plus complete translations for en, de, fr, es, it, ru are required." });
    return;
  }
  if (getCategory(id)) {
    res.status(409).json({ error: "Category with this id already exists" });
    return;
  }
  try {
    const created = await createCategory({
      id: id.toLowerCase(),
      translations: parsedTranslations,
    });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put("/categories/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { translations } = req.body ?? {};
  if (!getCategory(id)) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  const parsedTranslations = parseCompleteTranslations(translations);
  if (!parsedTranslations) {
    res.status(400).json({ error: "translations must include non-empty label/leftLabel/rightLabel for en, de, fr, es, it, ru" });
    return;
  }
  try {
    const updated = await updateCategory(id, { translations: parsedTranslations });
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
