import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-base";
import {
  LANGUAGE_OPTIONS,
  type LanguageCode,
  useI18n,
} from "@/lib/i18n";
import fireIcon from "@/assets/icons/Fire_1.png";

const SESSION_KEY = "kyf_admin_auth";
const ADMIN_USER = "admin";
const ADMIN_PASS = "haw-hamburg-2026";

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
  const { t } = useI18n();
  const [authenticated, setAuthenticated] = useState(() =>
    import.meta.env.DEV || sessionStorage.getItem(SESSION_KEY) === "1",
  );

  if (!authenticated) {
    return (
      <AdminLogin
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setAuthenticated(true);
        }}
      />
    );
  }

  return <AdminPanel />;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (username === ADMIN_USER && password === ADMIN_PASS) {
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  }

  return (
    <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl shadow-lg overflow-hidden">
            <img src={fireIcon} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="font-extrabold tracking-tight text-base">Know Your Friend</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-background/40 backdrop-blur-xl p-6 shadow-2xl space-y-5">
          <h1 className="text-lg font-black uppercase tracking-tight text-primary">
            {t("admin.login.title")}
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
                {t("admin.login.usernameLabel")}
              </label>
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
                {t("admin.login.passwordLabel")}
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-semibold">
                {t("admin.login.error")}
              </p>
            )}
            <button
              type="submit"
              className="w-full overflow-hidden rounded-full py-3 text-sm font-extrabold tracking-wide text-primary-foreground shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
            >
              {t("admin.login.submit")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AdminPanel() {
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
    <div className="relative z-10 min-h-[100dvh] flex flex-col">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/30 border-b border-white/10">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-lg overflow-hidden" aria-hidden>
              <img src={fireIcon} alt="" className="h-full w-full object-cover" />
            </span>
            <div className="flex items-baseline gap-2">
              <h1
                className="text-xl font-black uppercase tracking-tight bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
              >
                {t("admin.title")}
              </h1>
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-foreground/40">
                {t("admin.subtitle", { count: items.length })}
              </span>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-foreground/80 border border-white/15 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
          >
            ← {t("common.back")}
          </Link>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl w-full px-4 py-6 flex-1">
        {/* Requirement notice */}
        <div className="mb-4 rounded-xl border border-white/10 bg-background/30 backdrop-blur-md px-4 py-3 text-sm text-foreground/60">
          {t("admin.requirement")}
        </div>

        {/* Action bar */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowNew((value) => !value)}
            className="rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            {t("admin.newCategory")}
          </button>
          <button
            onClick={resetAll}
            className="ml-auto rounded-full px-5 py-2 text-sm font-bold text-foreground/70 border border-white/15 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
          >
            {t("admin.reset")}
          </button>
        </div>

        {/* New category form */}
        {showNew && (
          <div className="mb-4 rounded-2xl border-2 border-primary/60 bg-background/40 backdrop-blur-xl p-4 space-y-4 shadow-xl">
            <h2 className="text-sm font-black uppercase tracking-wide text-primary">{t("admin.newCategoryTitle")}</h2>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">{t("admin.idLabel")}</label>
              <Input
                value={draft.id}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    id: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  }))
                }
                placeholder="z.B. lieblings_eis"
                className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <TranslationEditor
              translations={draft.translations}
              onChange={(translations) => setDraft((current) => ({ ...current, translations }))}
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNew}
                className="flex-1 rounded-full py-2 text-sm font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
              >
                {t("common.save")}
              </button>
              <button
                onClick={() => setShowNew(false)}
                className="rounded-full px-5 py-2 text-sm font-bold text-foreground/70 border border-white/15 bg-white/5 transition-all hover:bg-white/10"
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16 text-foreground/40 font-bold animate-pulse">{t("common.loading")}</div>
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
      </main>
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
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/50">
        {t("admin.completeness", { count: countCompletedLanguages(normalized) })}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {LANGUAGE_OPTIONS.map((option) => (
          <div key={option.code} className="rounded-xl border border-white/10 p-3 space-y-2 bg-white/5">
            <div className="text-xs font-bold uppercase tracking-wide text-foreground/60">
              {t("admin.languageSection", { flag: option.flag, language: option.label })}
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">{t("admin.translationLabel")}</label>
              <Input
                value={normalized[option.code].label}
                onChange={(event) => updateField(option.code, "label", event.target.value)}
                className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">{t("admin.leftLabel")}</label>
                <Input
                  value={normalized[option.code].leftLabel}
                  onChange={(event) => updateField(option.code, "leftLabel", event.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-foreground/40">{t("admin.rightLabel")}</label>
                <Input
                  value={normalized[option.code].rightLabel}
                  onChange={(event) => updateField(option.code, "rightLabel", event.target.value)}
                  className="bg-white/5 border-white/10 focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
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
      <div className="rounded-2xl border-2 border-primary/60 bg-background/40 backdrop-blur-xl p-4 space-y-3 shadow-xl">
        <TranslationEditor translations={translations} onChange={setTranslations} />
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onSave(translations)}
            className="flex-1 rounded-full py-2 text-sm font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            {t("common.save")}
          </button>
          <button
            onClick={onCancel}
            className="rounded-full px-5 py-2 text-sm font-bold text-foreground/70 border border-white/15 bg-white/5 transition-all hover:bg-white/10"
          >
            {t("common.cancel")}
          </button>
        </div>
        <div className="text-[10px] text-foreground/30 font-mono">id: {category.id}</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-background/30 backdrop-blur-md hover:bg-background/40 transition-colors">
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{preview.label || category.id}</div>
          <div className="text-xs text-foreground/50 truncate">
            <span className="text-primary/80">{preview.leftLabel}</span>
            <span className="text-foreground/30 mx-1">↔</span>
            <span className="text-secondary/80">{preview.rightLabel}</span>
          </div>
          <div className="text-[10px] text-foreground/30 font-mono mt-0.5">{category.id}</div>
          <div className="text-[10px] text-foreground/40 mt-1">
            {t("admin.completeness", { count: countCompletedLanguages(category.translations) })}
            {missing.length > 0 ? (
              <span className="text-destructive/70"> · {t("admin.missing", { languages: missing.join(", ") })}</span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onStartEdit}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-foreground/70 border border-white/15 bg-white/5 transition-all hover:bg-white/10"
          >
            {t("admin.edit")}
          </button>
          <button
            onClick={onDelete}
            className="rounded-full px-3 py-1.5 text-xs font-bold text-destructive/70 border border-destructive/20 bg-destructive/5 transition-all hover:bg-destructive/10"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
