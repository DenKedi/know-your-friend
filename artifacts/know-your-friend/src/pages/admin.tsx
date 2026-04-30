import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-base";
import {
  LANGUAGE_OPTIONS,
  type LanguageCode,
  useI18n,
} from "@/lib/i18n";

interface TranslationFields {
  label: string;
  leftLabel: string;
  rightLabel: string;
}

type CategoryTranslations = Partial<Record<LanguageCode, TranslationFields>>;

interface Category {
  id: string;
  translations: CategoryTranslations;
}

const API_BASE = apiUrl("/api");

function createEmptyTranslation(): TranslationFields {
  return { label: "", leftLabel: "", rightLabel: "" };
}

function createEmptyTranslations(): Record<LanguageCode, TranslationFields> {
  return Object.fromEntries(
    LANGUAGE_OPTIONS.map((language) => [language.code, createEmptyTranslation()]),
  ) as Record<LanguageCode, TranslationFields>;
}

function normalizeTranslations(translations: CategoryTranslations | undefined) {
  const next = createEmptyTranslations();

  for (const option of LANGUAGE_OPTIONS) {
    const current = translations?.[option.code];
    if (current) {
      next[option.code] = {
        label: current.label ?? "",
        leftLabel: current.leftLabel ?? "",
        rightLabel: current.rightLabel ?? "",
      };
    }
  }

  return next;
}

function countCompletedLanguages(translations: CategoryTranslations) {
  return LANGUAGE_OPTIONS.filter((language) => {
    const entry = translations[language.code];
    return Boolean(entry?.label && entry.leftLabel && entry.rightLabel);
  }).length;
}

function missingLanguages(translations: CategoryTranslations) {
  return LANGUAGE_OPTIONS.filter((language) => {
    const entry = translations[language.code];
    return !(entry?.label && entry.leftLabel && entry.rightLabel);
  }).map((language) => language.code.toUpperCase());
}

function previewTranslation(translations: CategoryTranslations, language: LanguageCode) {
  return translations[language] ?? translations.de ?? translations.en ?? createEmptyTranslation();
}

export default function Admin() {
  const { toast } = useToast();
  const { language, t } = useI18n();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ id: string; translations: Record<LanguageCode, TranslationFields> }>({
    id: "",
    translations: createEmptyTranslations(),
  });
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = (await res.json()) as Category[];
      setItems(data);
    } catch {
      toast({ title: t("admin.loadingFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function saveNew() {
    if (!draft.id || countCompletedLanguages(draft.translations) !== LANGUAGE_OPTIONS.length) {
      toast({ title: t("admin.fillAll"), variant: "destructive" });
      return;
    }

    const res = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: t("admin.saveFailed"), description: err.error, variant: "destructive" });
      return;
    }
    setShowNew(false);
    setDraft({ id: "", translations: createEmptyTranslations() });
    toast({ title: t("admin.added") });
    reload();
  }

  async function saveEdit(id: string, translations: Record<LanguageCode, TranslationFields>) {
    if (countCompletedLanguages(translations) !== LANGUAGE_OPTIONS.length) {
      toast({ title: t("admin.fillAll"), variant: "destructive" });
      return;
    }

    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translations }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: t("admin.updateFailed"), description: err.error, variant: "destructive" });
      return;
    }
    toast({ title: t("admin.saved") });
    setEditingId(null);
    reload();
  }

  async function remove(id: string) {
    if (!confirm(t("admin.confirmDelete", { id }))) return;
    const res = await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: t("admin.deleteFailed"), variant: "destructive" });
      return;
    }
    toast({ title: t("admin.deleted") });
    reload();
  }

  async function resetAll() {
    if (!confirm(t("admin.confirmReset"))) return;
    const res = await fetch(`${API_BASE}/categories/reset`, { method: "POST" });
    if (!res.ok) {
      toast({ title: t("admin.resetFailed"), variant: "destructive" });
      return;
    }
    toast({ title: t("admin.resetDone") });
    reload();
  }

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6 gap-3">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-primary">
              {t("admin.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("admin.subtitle", { count: items.length })}
            </p>
          </div>
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground">
            ← {t("common.back")}
          </Link>
        </header>

        <Card className="mb-4 border border-border bg-card/60">
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t("admin.requirement")}
          </CardContent>
        </Card>

        <div className="flex gap-2 mb-4">
          <Button onClick={() => setShowNew((value) => !value)} className="font-bold">
            {t("admin.newCategory")}
          </Button>
          <Button variant="outline" onClick={resetAll} className="font-bold ml-auto">
            {t("admin.reset")}
          </Button>
        </div>

        {showNew && (
          <Card className="mb-4 border-2 border-primary">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base">{t("admin.newCategoryTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">{t("admin.idLabel")}</label>
                <Input
                  value={draft.id}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      id: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    }))
                  }
                  placeholder="z.B. lieblings_eis"
                />
              </div>

              <TranslationEditor
                translations={draft.translations}
                onChange={(translations) => setDraft((current) => ({ ...current, translations }))}
              />

              <div className="flex gap-2 pt-2">
                <Button onClick={saveNew} className="flex-1 font-bold">{t("common.save")}</Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>{t("common.cancel")}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">{t("common.loading")}</div>
        ) : (
          <div className="space-y-2">
            {items.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                language={language}
                editing={editingId === category.id}
                onStartEdit={() => setEditingId(category.id)}
                onCancel={() => setEditingId(null)}
                onSave={(translations) => saveEdit(category.id, translations)}
                onDelete={() => remove(category.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TranslationEditor({
  translations,
  onChange,
}: {
  translations: CategoryTranslations;
  onChange: (translations: Record<LanguageCode, TranslationFields>) => void;
}) {
  const { t } = useI18n();
  const normalized = normalizeTranslations(translations);

  function updateField(language: LanguageCode, field: keyof TranslationFields, value: string) {
    onChange({
      ...normalized,
      [language]: {
        ...normalized[language],
        [field]: value,
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground font-bold">
        {t("admin.completeness", { count: countCompletedLanguages(normalized) })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {LANGUAGE_OPTIONS.map((option) => (
          <div key={option.code} className="rounded-xl border border-border p-3 space-y-2 bg-input/40">
            <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("admin.languageSection", { flag: option.flag, language: option.label })}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("admin.translationLabel")}</label>
              <Input
                value={normalized[option.code].label}
                onChange={(event) => updateField(option.code, "label", event.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("admin.leftLabel")}</label>
                <Input
                  value={normalized[option.code].leftLabel}
                  onChange={(event) => updateField(option.code, "leftLabel", event.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">{t("admin.rightLabel")}</label>
                <Input
                  value={normalized[option.code].rightLabel}
                  onChange={(event) => updateField(option.code, "rightLabel", event.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  language,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  category: Category;
  language: LanguageCode;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (translations: Record<LanguageCode, TranslationFields>) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [translations, setTranslations] = useState<Record<LanguageCode, TranslationFields>>(
    normalizeTranslations(category.translations),
  );

  useEffect(() => {
    setTranslations(normalizeTranslations(category.translations));
  }, [category, editing]);

  const preview = previewTranslation(category.translations, language);
  const missing = missingLanguages(category.translations);

  if (editing) {
    return (
      <Card className="border-2 border-primary">
        <CardContent className="p-3 space-y-3">
          <TranslationEditor translations={translations} onChange={setTranslations} />
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onSave(translations)} className="flex-1 font-bold">
              {t("common.save")}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>{t("common.cancel")}</Button>
          </div>
          <div className="text-[10px] text-muted-foreground">id: {category.id}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{preview.label || category.id}</div>
          <div className="text-xs text-muted-foreground truncate">
            <span className="text-primary">{preview.leftLabel}</span> ↔ <span className="text-secondary">{preview.rightLabel}</span>
          </div>
          <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{category.id}</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {t("admin.completeness", { count: countCompletedLanguages(category.translations) })}
            {missing.length > 0 ? ` · ${t("admin.missing", { languages: missing.join(", ") })}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onStartEdit}>{t("admin.edit")}</Button>
          <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">×</Button>
        </div>
      </CardContent>
    </Card>
  );
}
