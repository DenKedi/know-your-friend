import type { LanguageCode } from "./languages";

export interface CategoryTranslation {
  label: string;
  leftLabel: string;
  rightLabel: string;
}

export type CategoryTranslations = Partial<Record<LanguageCode, CategoryTranslation>>;

export interface Category {
  id: string;
  translations: CategoryTranslations;
}

export interface LocalizedCategory extends CategoryTranslation {
  id: string;
}