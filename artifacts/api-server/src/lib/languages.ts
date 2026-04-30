export const SUPPORTED_LANGUAGES = ["en", "de", "fr", "es", "it", "ru"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en";

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as LanguageCode);
}