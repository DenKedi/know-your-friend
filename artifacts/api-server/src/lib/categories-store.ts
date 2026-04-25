import { pool } from "./db";
import { logger } from "./logger";

export interface Category {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "wildnis", label: "Wildnisüberleben", leftLabel: "Stadtmensch", rightLabel: "Survivalist" },
  { id: "gluecksspiel", label: "Glücksspiel", leftLabel: "Kein Interesse", rightLabel: "Immer dabei" },
  { id: "drogen", label: "Drogenaffinität", leftLabel: "Nüchtern", rightLabel: "Experimentierfreudig" },
  { id: "alkohol", label: "Alkohol", leftLabel: "Abstinent", rightLabel: "Partyprofi" },
  { id: "gruener_daumen", label: "Grüner Daumen", leftLabel: "Pflanzenmörder", rightLabel: "Gärtner-Guru" },
  { id: "reisen", label: "Reiselust", leftLabel: "Stubenhocker", rightLabel: "Weltenbummler" },
  { id: "essen", label: "Essgewohnheiten", leftLabel: "Schlicht & einfach", rightLabel: "Foodie" },
  { id: "kochen", label: "Kochkünste", leftLabel: "Tiefkühlprofi", rightLabel: "Sternekoch" },
  { id: "kultur", label: "Kulturliebe", leftLabel: "Kulturmuffel", rightLabel: "Kulturfanatiker" },
  { id: "natur", label: "Naturverbundenheit", leftLabel: "Stadtmensch", rightLabel: "Naturkind" },
  { id: "stadt_land", label: "Stadt oder Land", leftLabel: "Großstädter", rightLabel: "Landei" },
  { id: "fahrstil", label: "Fahrstil", leftLabel: "Vorsichtiger Fahrer", rightLabel: "Rennfahrer" },
  { id: "fast_food", label: "Fast Food", leftLabel: "Nie im Leben", rightLabel: "Fast täglich" },
  { id: "gesetzestreu", label: "Gesetzstreue", leftLabel: "Rebell", rightLabel: "Regelfreak" },
  { id: "tierlieb", label: "Tierliebe", leftLabel: "Tierphobisch", rightLabel: "Tiernarr" },
  { id: "diy", label: "Do it yourself", leftLabel: "Kaufe lieber fertig", rightLabel: "Bastler" },
  { id: "wasserratte", label: "Wasserverbundenheit", leftLabel: "Wasserphobisch", rightLabel: "Wasserratte" },
  { id: "strand_berge", label: "Urlaubstyp", leftLabel: "Strandlieger", rightLabel: "Bergsteiger" },
  { id: "streber", label: "Streber-Faktor", leftLabel: "Chillt gerne", rightLabel: "Vollstreber" },
  { id: "katzen_hunde", label: "Haustiertyp", leftLabel: "Katzenkind", rightLabel: "Hundemensch" },
  { id: "politik", label: "Politische Einstellung", leftLabel: "Links", rightLabel: "Rechts" },
  { id: "treue", label: "Treue", leftLabel: "Fremdgeher", rightLabel: "Absolut treu" },
  { id: "markenklamotten", label: "Markenbewusstsein", leftLabel: "Hauptsache günstig", rightLabel: "Labelqueen" },
  { id: "introvert_extrovert", label: "Introversion", leftLabel: "Introvertiert", rightLabel: "Extrovertiert" },
  { id: "hobbyhorsing", label: "Hobbyhorsing", leftLabel: "Was ist das?", rightLabel: "Vollprofi" },
  { id: "leichtglaeubig", label: "Leichtgläubigkeit", leftLabel: "Skeptiker", rightLabel: "Glaubt alles" },
  { id: "orientierung", label: "Orientierungssinn", leftLabel: "Verläuft sich ständig", rightLabel: "Menschliches GPS" },
  { id: "offline_online", label: "Online-Zeit", leftLabel: "Digital Detox", rightLabel: "Always Online" },
  { id: "fakt_gefuehl", label: "Entscheidungsstil", leftLabel: "Bauchgefühl", rightLabel: "Reine Fakten" },
  { id: "locker_ernst", label: "Grundhaltung", leftLabel: "Locker drauf", rightLabel: "Stockernst" },
  { id: "konservativ_progressiv", label: "Werte", leftLabel: "Konservativ", rightLabel: "Progressiv" },
  { id: "safe_sex_yolo", label: "Risiko im Bett", leftLabel: "Safe Sex", rightLabel: "YOLO" },
  { id: "kunstschaffen", label: "Kunstschaffend", leftLabel: "Konsument", rightLabel: "Künstler:in" },
  { id: "oeffis_auto", label: "Mobilität", leftLabel: "Öffis & Bahn", rightLabel: "Eigenes Auto" },
  { id: "maskulin_feminin", label: "Auftreten", leftLabel: "Feminin", rightLabel: "Maskulin" },
  { id: "horrorfilme", label: "Horrorfilme", leftLabel: "Bloß nicht!", rightLabel: "Hardcore-Fan" },
  { id: "romantik", label: "Romantik", leftLabel: "Pragmatiker", rightLabel: "Hopeless Romantic" },
  { id: "oeko", label: "Öko-Bewusstsein", leftLabel: "Egal", rightLabel: "Öko-Tante" },
  { id: "dinkel_klimasau", label: "Lebensstil", leftLabel: "Klima-Sau", rightLabel: "Dinkel-Dörte" },
  { id: "feuer_wasser", label: "Element", leftLabel: "Feuer", rightLabel: "Wasser" },
  { id: "tattoos", label: "Tattoos", leftLabel: "Niemals", rightLabel: "Vollgemalt" },
  { id: "kraft_cardio", label: "Sport", leftLabel: "Cardio", rightLabel: "Kraftsport" },
  { id: "nachrichten", label: "Nachrichten", leftLabel: "Komplett offline", rightLabel: "Stets informiert" },
  { id: "gross_denken", label: "Mindset", leftLabel: "Bodenständig", rightLabel: "Visionär" },
  { id: "fussball", label: "Fußball", leftLabel: "Komplett egal", rightLabel: "Hardcore-Fan" },
  { id: "hater_drache", label: "Stimmung", leftLabel: "Cheerleader", rightLabel: "Notorischer Hater" },
  { id: "berlin_hamburg", label: "Lieblingsstadt", leftLabel: "Berlin", rightLabel: "Hamburg" },
  { id: "aktivist", label: "Aktivismus", leftLabel: "Schweiger", rightLabel: "Aktivist:in" },
  { id: "risikofreudig", label: "Risikobereitschaft", leftLabel: "Sicherheitsbewusst", rightLabel: "Adrenalin-Junkie" },
  { id: "natural_op", label: "Schönheitsideal", leftLabel: "Natural Beauty", rightLabel: "Schönheits-OP" },
  { id: "intellekt", label: "Intellektualität", leftLabel: "Bauchmensch", rightLabel: "Kopfmensch" },
];

let cache: Category[] = [...DEFAULT_CATEGORIES];

function rowToCategory(row: { id: string; label: string; left_label: string; right_label: string }): Category {
  return {
    id: row.id,
    label: row.label,
    leftLabel: row.left_label,
    rightLabel: row.right_label,
  };
}

export async function loadCategories(): Promise<void> {
  try {
    const res = await pool.query<{ id: string; label: string; left_label: string; right_label: string }>(
      "SELECT id, label, left_label, right_label FROM categories ORDER BY sort_order ASC"
    );
    cache = res.rows.map(rowToCategory);
    if (cache.length === 0) {
      cache = [...DEFAULT_CATEGORIES];
    }
    logger.info({ count: cache.length }, "Categories loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load categories – using defaults");
    cache = [...DEFAULT_CATEGORIES];
  }
}

export function getCategories(): Category[] {
  return cache;
}

export function getCategory(id: string): Category | undefined {
  return cache.find((c) => c.id === id);
}

export async function createCategory(c: Category): Promise<Category> {
  await pool.query(
    "INSERT INTO categories (id, label, left_label, right_label) VALUES ($1, $2, $3, $4)",
    [c.id, c.label, c.leftLabel, c.rightLabel]
  );
  await loadCategories();
  return c;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, "id">>): Promise<Category | null> {
  const existing = cache.find((c) => c.id === id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  await pool.query(
    "UPDATE categories SET label = $1, left_label = $2, right_label = $3, updated_at = NOW() WHERE id = $4",
    [next.label, next.leftLabel, next.rightLabel, id]
  );
  await loadCategories();
  return next;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const res = await pool.query("DELETE FROM categories WHERE id = $1", [id]);
  await loadCategories();
  return (res.rowCount ?? 0) > 0;
}

export async function resetToDefaults(): Promise<void> {
  await pool.query("DELETE FROM categories");
  for (const c of DEFAULT_CATEGORIES) {
    await pool.query(
      "INSERT INTO categories (id, label, left_label, right_label) VALUES ($1, $2, $3, $4)",
      [c.id, c.label, c.leftLabel, c.rightLabel]
    );
  }
  await loadCategories();
}
