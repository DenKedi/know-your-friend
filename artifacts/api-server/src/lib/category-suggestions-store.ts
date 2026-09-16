import { ObjectId } from "mongodb";
import { getDb } from "./db";
import type { LanguageCode } from "./languages";

export type CategorySuggestionStatus = "pending" | "approved" | "rejected";

interface CategorySuggestionDocument {
  _id?: ObjectId;
  language: LanguageCode;
  label: string;
  leftLabel: string;
  rightLabel: string;
  status: CategorySuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategorySuggestion {
  id: string;
  language: LanguageCode;
  label: string;
  leftLabel: string;
  rightLabel: string;
  status: CategorySuggestionStatus;
  createdAt: Date;
  updatedAt: Date;
}

async function getSuggestionsCollection() {
  const db = await getDb();
  return db.collection<CategorySuggestionDocument>("category_suggestions");
}

function toSuggestion(document: CategorySuggestionDocument & { _id: ObjectId }): CategorySuggestion {
  return {
    id: document._id.toHexString(),
    language: document.language,
    label: document.label,
    leftLabel: document.leftLabel,
    rightLabel: document.rightLabel,
    status: document.status,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function createCategorySuggestion(
  input: Pick<CategorySuggestionDocument, "language" | "label" | "leftLabel" | "rightLabel">,
): Promise<CategorySuggestion> {
  const now = new Date();
  const document: CategorySuggestionDocument = {
    ...input,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const suggestions = await getSuggestionsCollection();
  const result = await suggestions.insertOne(document);
  return toSuggestion({ ...document, _id: result.insertedId });
}

export async function listCategorySuggestions(
  status?: CategorySuggestionStatus,
): Promise<CategorySuggestion[]> {
  const suggestions = await getSuggestionsCollection();
  const documents = await suggestions
    .find(status ? { status } : {}, { sort: { createdAt: -1 } })
    .toArray();
  return documents.map((document) => toSuggestion(document));
}

export async function updateCategorySuggestionStatus(
  id: string,
  status: Exclude<CategorySuggestionStatus, "pending">,
): Promise<CategorySuggestion | null> {
  if (!ObjectId.isValid(id)) return null;
  const suggestions = await getSuggestionsCollection();
  const document = await suggestions.findOneAndUpdate(
    { _id: new ObjectId(id), status: "pending" },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return document ? toSuggestion(document) : null;
}
