import { getDb } from "./db";
import { logger } from "./logger";

export interface Category {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

interface CategoryDocument extends Category {
  sortOrder: number;
  updatedAt: Date;
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
  { id: "qual_quant", label: "Qualität vs. Quantität", leftLabel: "Hauptsache viel", rightLabel: "Hauptsache gut" },
  { id: "emoji_text", label: "Schreibstil", leftLabel: "Nur Buchstaben", rightLabel: "Voller Emojis" },
];

let cache: Category[] = [...DEFAULT_CATEGORIES];

function documentToCategory(document: CategoryDocument): Category {
  return {
    id: document.id,
    label: document.label,
    leftLabel: document.leftLabel,
    rightLabel: document.rightLabel,
  };
}

async function getCategoriesCollection() {
  const db = await getDb();
  return db.collection<CategoryDocument>("categories");
}

function toCategoryDocument(category: Category, sortOrder: number): CategoryDocument {
  return {
    ...category,
    sortOrder,
    updatedAt: new Date(),
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
  const categories = await getCategoriesCollection();
  await categories.insertOne(toCategoryDocument(c, cache.length));
  await loadCategories();
  return c;
}

export async function updateCategory(id: string, patch: Partial<Omit<Category, "id">>): Promise<Category | null> {
  const existing = cache.find((c) => c.id === id);
  if (!existing) return null;
  const next = { ...existing, ...patch };

  const categories = await getCategoriesCollection();
  const result = await categories.updateOne(
    { id },
    {
      $set: {
        label: next.label,
        leftLabel: next.leftLabel,
        rightLabel: next.rightLabel,
        updatedAt: new Date(),
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
