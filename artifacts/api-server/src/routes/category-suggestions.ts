import { Router, type IRouter } from "express";
import {
  CreateCategorySuggestionBody,
  ListCategorySuggestionsQueryParams,
  UpdateCategorySuggestionStatusBody,
  UpdateCategorySuggestionStatusParams,
} from "@workspace/api-zod";
import {
  createCategorySuggestion,
  listCategorySuggestions,
  updateCategorySuggestionStatus,
  type CategorySuggestionStatus,
} from "../lib/category-suggestions-store";
import type { LanguageCode } from "../lib/languages";

const router: IRouter = Router();

router.post("/category-suggestions", async (req, res): Promise<void> => {
  const parsed = CreateCategorySuggestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const input = {
    language: parsed.data.language as LanguageCode,
    label: parsed.data.label.trim(),
    leftLabel: parsed.data.leftLabel.trim(),
    rightLabel: parsed.data.rightLabel.trim(),
  };
  if (!input.label || !input.leftLabel || !input.rightLabel) {
    res.status(400).json({ error: "Suggestion fields must not be blank" });
    return;
  }

  try {
    const suggestion = await createCategorySuggestion(input);
    res.status(201).json(suggestion);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get("/category-suggestions", async (req, res): Promise<void> => {
  const parsed = ListCategorySuggestionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const suggestions = await listCategorySuggestions(
      parsed.data.status as CategorySuggestionStatus | undefined,
    );
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch("/category-suggestions/:suggestionId/status", async (req, res): Promise<void> => {
  const params = UpdateCategorySuggestionStatusParams.safeParse(req.params);
  const body = UpdateCategorySuggestionStatusBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Invalid suggestion status request" });
    return;
  }
  try {
    const suggestion = await updateCategorySuggestionStatus(
      params.data.suggestionId,
      body.data.status,
    );
    if (!suggestion) {
      res.status(404).json({ error: "Pending suggestion not found" });
      return;
    }
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
