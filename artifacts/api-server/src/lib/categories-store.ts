import { getDb } from "./db";
import { logger } from "./logger";
import { DEFAULT_CATEGORY_TRANSLATIONS } from "./default-category-translations";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type LanguageCode,
} from "./languages";
import type {
  Category,
  CategoryTranslation,
  CategoryTranslations,
  LocalizedCategory,
} from "./category-types";

export type {
  Category,
  CategoryTranslation,
  CategoryTranslations,
  LocalizedCategory,
};

interface CategoryDocument {
  id: string;
  translations?: CategoryTranslations;
  label?: string;
  leftLabel?: string;
  rightLabel?: string;
  sortOrder: number;
  updatedAt: Date;
}

export const DEFAULT_CATEGORIES: Category[] = Object.entries(DEFAULT_CATEGORY_TRANSLATIONS).map(
  ([id, translations]) => ({ id, translations }),
);

let cache: Category[] = DEFAULT_CATEGORIES.map(cloneCategory);

function cloneTranslations(translations: CategoryTranslations): CategoryTranslations {
  return Object.fromEntries(
    Object.entries(translations).map(([language, value]) => [language, value ? { ...value } : value]),
  ) as CategoryTranslations;
}

function cloneCategory(category: Category): Category {
  return {
    id: category.id,
    translations: cloneTranslations(category.translations),
  };
}

function normalizeTranslation(translation: CategoryTranslation): CategoryTranslation {
  return {
    label: translation.label.trim(),
    leftLabel: translation.leftLabel.trim(),
    rightLabel: translation.rightLabel.trim(),
  };
}

function getDefaultCategory(id: string): Category | undefined {
  return DEFAULT_CATEGORIES.find((category) => category.id === id);
}

function documentToCategory(document: CategoryDocument): Category {
  const defaultCategory = getDefaultCategory(document.id);
  const translations: CategoryTranslations = defaultCategory
    ? cloneTranslations(defaultCategory.translations)
    : {};

  if (document.translations) {
    for (const language of SUPPORTED_LANGUAGES) {
      const value = document.translations[language];
      if (value) {
        translations[language] = normalizeTranslation(value);
      }
    }
  }

  if (document.label && document.leftLabel && document.rightLabel) {
    translations.de = normalizeTranslation({
      label: document.label,
      leftLabel: document.leftLabel,
      rightLabel: document.rightLabel,
    });
  }

  return { id: document.id, translations };
}

async function getCategoriesCollection() {
  const db = await getDb();
  return db.collection<CategoryDocument>("categories");
}

function toCategoryDocument(category: Category, sortOrder: number): CategoryDocument {
  return {
    id: category.id,
    translations: cloneTranslations(category.translations),
    sortOrder,
    updatedAt: new Date(),
  };
}

function localizeCategory(category: Category, language: LanguageCode): LocalizedCategory | null {
  const translation = category.translations[language];
  if (!translation) {
    return null;
  }

  return {
    id: category.id,
    ...translation,
  };
}

async function seedDefaultsIfEmpty(): Promise<void> {
  const categories = await getCategoriesCollection();
  const count = await categories.countDocuments();

  if (count > 0) {
    return;
  }

  await categories.insertMany(
    DEFAULT_CATEGORIES.map((category, index) => toCategoryDocument(category, index)),
  );
}

export async function loadCategories(): Promise<void> {
  try {
    await seedDefaultsIfEmpty();

    const categories = await getCategoriesCollection();
    const documents = await categories.find({}, { sort: { sortOrder: 1, id: 1 } }).toArray();
    cache = documents.map(documentToCategory);
    if (cache.length === 0) {
      cache = DEFAULT_CATEGORIES.map(cloneCategory);
    }
    logger.info({ count: cache.length }, "Categories loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load categories – using defaults");
    cache = DEFAULT_CATEGORIES.map(cloneCategory);
  }
}

export function getCategories(): Category[] {
  return cache.map(cloneCategory);
}

export function getCategory(id: string): Category | undefined {
  const category = cache.find((c) => c.id === id);
  return category ? cloneCategory(category) : undefined;
}

export function getLocalizedCategories(language: LanguageCode): LocalizedCategory[] {
  return cache
    .map((category) => localizeCategory(category, language))
    .filter((category): category is LocalizedCategory => category !== null);
}

export function getLocalizedCategory(id: string, language: LanguageCode): LocalizedCategory | undefined {
  const category = cache.find((entry) => entry.id === id);
  if (!category) {
    return undefined;
  }

  return localizeCategory(category, language) ?? undefined;
}

export async function createCategory(c: Category): Promise<Category> {
  const normalized = cloneCategory(c);
  const categories = await getCategoriesCollection();
  await categories.insertOne(toCategoryDocument(normalized, cache.length));
  await loadCategories();
  return normalized;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, "id">>): Promise<Category | null> {
  const existing = cache.find((c) => c.id === id);
  if (!existing) return null;
  const next: Category = {
    id: existing.id,
    translations: patch.translations
      ? {
          ...cloneTranslations(existing.translations),
          ...cloneTranslations(patch.translations),
        }
      : cloneTranslations(existing.translations),
  };

  const categories = await getCategoriesCollection();
  const result = await categories.updateOne(
    { id },
    {
      $set: {
        translations: next.translations,
        updatedAt: new Date(),
      },
      $unset: {
        label: "",
        leftLabel: "",
        rightLabel: "",
      },
    },
  );

  if (result.matchedCount === 0) {
    return null;
  }

  await loadCategories();
  return next;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const categories = await getCategoriesCollection();
  const res = await categories.deleteOne({ id });
  await loadCategories();
  return res.deletedCount > 0;
}

export async function resetToDefaults(): Promise<void> {
  const categories = await getCategoriesCollection();
  await categories.deleteMany({});
  await categories.insertMany(
    DEFAULT_CATEGORIES.map((category, index) => toCategoryDocument(category, index)),
  );
  await loadCategories();
}
