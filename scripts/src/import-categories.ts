import fs from "node:fs";
import path from "node:path";
import { MongoClient, ServerApiVersion } from "mongodb";

interface Category {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
  sortOrder?: number;
}

interface CategoryDocument extends Category {
  sortOrder: number;
  updatedAt: Date;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: "wildnis", label: "Wildnisüberleben", leftLabel: "Stadtmensch", rightLabel: "Survivalist", sortOrder: 0 },
  { id: "gluecksspiel", label: "Glücksspiel", leftLabel: "Kein Interesse", rightLabel: "Immer dabei", sortOrder: 1 },
  { id: "drogen", label: "Drogenaffinität", leftLabel: "Nüchtern", rightLabel: "Experimentierfreudig", sortOrder: 2 },
  { id: "alkohol", label: "Alkohol", leftLabel: "Abstinent", rightLabel: "Partyprofi", sortOrder: 3 },
  { id: "gruener_daumen", label: "Grüner Daumen", leftLabel: "Pflanzenmörder", rightLabel: "Gärtner-Guru", sortOrder: 4 },
  { id: "reisen", label: "Reiselust", leftLabel: "Stubenhocker", rightLabel: "Weltenbummler", sortOrder: 5 },
  { id: "essen", label: "Essgewohnheiten", leftLabel: "Schlicht & einfach", rightLabel: "Foodie", sortOrder: 6 },
  { id: "kochen", label: "Kochkünste", leftLabel: "Tiefkühlprofi", rightLabel: "Sternekoch", sortOrder: 7 },
  { id: "kultur", label: "Kulturliebe", leftLabel: "Kulturmuffel", rightLabel: "Kulturfanatiker", sortOrder: 8 },
  { id: "natur", label: "Naturverbundenheit", leftLabel: "Stadtmensch", rightLabel: "Naturkind", sortOrder: 9 },
  { id: "stadt_land", label: "Stadt oder Land", leftLabel: "Großstädter", rightLabel: "Landei", sortOrder: 10 },
  { id: "fahrstil", label: "Fahrstil", leftLabel: "Vorsichtiger Fahrer", rightLabel: "Rennfahrer", sortOrder: 11 },
  { id: "fast_food", label: "Fast Food", leftLabel: "Nie im Leben", rightLabel: "Fast täglich", sortOrder: 12 },
  { id: "gesetzestreu", label: "Gesetzestreue", leftLabel: "Rebell", rightLabel: "Regelfreak", sortOrder: 13 },
  { id: "tierlieb", label: "Tierliebe", leftLabel: "Tierphobisch", rightLabel: "Tiernarr", sortOrder: 14 },
  { id: "diy", label: "Do it yourself", leftLabel: "Kaufe lieber fertig", rightLabel: "Bastler", sortOrder: 15 },
  { id: "wasserratte", label: "Wasserverbundenheit", leftLabel: "Wasserphobisch", rightLabel: "Wasserratte", sortOrder: 16 },
  { id: "strand_berge", label: "Urlaubstyp", leftLabel: "Strandlieger", rightLabel: "Bergsteiger", sortOrder: 17 },
  { id: "streber", label: "Streber-Faktor", leftLabel: "Chillt gerne", rightLabel: "Vollstreber", sortOrder: 18 },
  { id: "katzen_hunde", label: "Haustiertyp", leftLabel: "Katzenkind", rightLabel: "Hundemensch", sortOrder: 19 },
  { id: "politik", label: "Politische Einstellung", leftLabel: "Links", rightLabel: "Rechts", sortOrder: 20 },
  { id: "treue", label: "Treue", leftLabel: "Fremdgeher", rightLabel: "Absolut treu", sortOrder: 21 },
  { id: "markenklamotten", label: "Markenbewusstsein", leftLabel: "Hauptsache günstig", rightLabel: "Labelqueen", sortOrder: 22 },
  { id: "introvert_extrovert", label: "Introversion", leftLabel: "Introvertiert", rightLabel: "Extrovertiert", sortOrder: 23 },
  { id: "hobbyhorsing", label: "Hobbyhorsing", leftLabel: "Was ist das?", rightLabel: "Vollprofi", sortOrder: 24 },
  { id: "leichtglaeubig", label: "Leichtgläubigkeit", leftLabel: "Skeptiker", rightLabel: "Glaubt alles", sortOrder: 25 },
  { id: "orientierung", label: "Orientierungssinn", leftLabel: "Verläuft sich ständig", rightLabel: "Menschliches GPS", sortOrder: 26 },
  { id: "offline_online", label: "Online-Zeit", leftLabel: "Digital Detox", rightLabel: "Always Online", sortOrder: 27 },
  { id: "fakt_gefuehl", label: "Entscheidungsstil", leftLabel: "Bauchgefühl", rightLabel: "Reine Fakten", sortOrder: 28 },
  { id: "locker_ernst", label: "Grundhaltung", leftLabel: "Locker drauf", rightLabel: "Stockernst", sortOrder: 29 },
  { id: "konservativ_progressiv", label: "Werte", leftLabel: "Konservativ", rightLabel: "Progressiv", sortOrder: 30 },
  { id: "safe_sex_yolo", label: "Risiko im Bett", leftLabel: "Safe Sex", rightLabel: "YOLO", sortOrder: 31 },
  { id: "kunstschaffen", label: "Kunstschaffend", leftLabel: "Konsument", rightLabel: "Künstler:in", sortOrder: 32 },
  { id: "oeffis_auto", label: "Mobilität", leftLabel: "Öffis & Bahn", rightLabel: "Eigenes Auto", sortOrder: 33 },
  { id: "maskulin_feminin", label: "Auftreten", leftLabel: "Feminin", rightLabel: "Maskulin", sortOrder: 34 },
  { id: "horrorfilme", label: "Horrorfilme", leftLabel: "Bloß nicht!", rightLabel: "Hardcore-Fan", sortOrder: 35 },
  { id: "romantik", label: "Romantik", leftLabel: "Pragmatiker", rightLabel: "Hopeless Romantic", sortOrder: 36 },
  { id: "oeko", label: "Öko-Bewusstsein", leftLabel: "Egal", rightLabel: "Öko-Tante", sortOrder: 37 },
  { id: "dinkel_klimasau", label: "Lebensstil", leftLabel: "Klima-Sau", rightLabel: "Dinkel-Dörte", sortOrder: 38 },
  { id: "feuer_wasser", label: "Element", leftLabel: "Feuer", rightLabel: "Wasser", sortOrder: 39 },
  { id: "tattoos", label: "Tattoos", leftLabel: "Niemals", rightLabel: "Vollgemalt", sortOrder: 40 },
  { id: "kraft_cardio", label: "Sport", leftLabel: "Cardio", rightLabel: "Kraftsport", sortOrder: 41 },
  { id: "nachrichten", label: "Nachrichten", leftLabel: "Komplett offline", rightLabel: "Stets informiert", sortOrder: 42 },
  { id: "gross_denken", label: "Mindset", leftLabel: "Bodenständig", rightLabel: "Visionär", sortOrder: 43 },
  { id: "fussball", label: "Fußball", leftLabel: "Komplett egal", rightLabel: "Hardcore-Fan", sortOrder: 44 },
  { id: "hater_drache", label: "Stimmung", leftLabel: "Cheerleader", rightLabel: "Notorischer Hater", sortOrder: 45 },
  { id: "berlin_hamburg", label: "Lieblingsstadt", leftLabel: "Berlin", rightLabel: "Hamburg", sortOrder: 46 },
  { id: "aktivist", label: "Aktivismus", leftLabel: "Schweiger", rightLabel: "Aktivist:in", sortOrder: 47 },
  { id: "risikofreudig", label: "Risikobereitschaft", leftLabel: "Sicherheitsbewusst", rightLabel: "Adrenalin-Junkie", sortOrder: 48 },
  { id: "natural_op", label: "Schönheitsideal", leftLabel: "Natural Beauty", rightLabel: "Schönheits-OP", sortOrder: 49 },
  { id: "intellekt", label: "Intellektualität", leftLabel: "Bauchmensch", rightLabel: "Kopfmensch", sortOrder: 50 },
  { id: "qual_quant", label: "Qualität vs. Quantität", leftLabel: "Hauptsache viel", rightLabel: "Hauptsache gut", sortOrder: 51 },
  { id: "emoji_text", label: "Schreibstil", leftLabel: "Nur Buchstaben", rightLabel: "Voller Emojis", sortOrder: 52 },
];

function parseArgs(argv: string[]) {
  let source = "defaults";
  let replace = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--replace") {
      replace = true;
      continue;
    }

    if (arg === "--source") {
      const next = argv[index + 1];
      if (!next) {
        throw new Error("Missing value for --source");
      }
      source = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { source, replace };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const next = line[index + 1];
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeCategory(raw: Record<string, unknown>, fallbackSortOrder: number): Category {
  const id = typeof raw.id === "string" ? raw.id.trim().toLowerCase() : "";
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const leftLabelRaw = raw.leftLabel ?? raw.left_label;
  const rightLabelRaw = raw.rightLabel ?? raw.right_label;
  const sortOrderRaw = raw.sortOrder ?? raw.sort_order;

  const leftLabel = typeof leftLabelRaw === "string" ? leftLabelRaw.trim() : "";
  const rightLabel = typeof rightLabelRaw === "string" ? rightLabelRaw.trim() : "";
  const sortOrder =
    typeof sortOrderRaw === "number"
      ? sortOrderRaw
      : typeof sortOrderRaw === "string" && sortOrderRaw.trim() !== ""
        ? Number(sortOrderRaw)
        : fallbackSortOrder;

  if (!id || !/^[a-z0-9_]{1,64}$/i.test(id)) {
    throw new Error(`Invalid category id: ${String(raw.id ?? "")}`);
  }

  if (!label || !leftLabel || !rightLabel) {
    throw new Error(`Category ${id} is missing one of label, leftLabel, or rightLabel`);
  }

  return {
    id,
    label,
    leftLabel,
    rightLabel,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : fallbackSortOrder,
  };
}

function loadJson(filePath: string): Category[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;

  if (!Array.isArray(raw)) {
    throw new Error("JSON import source must contain an array of categories");
  }

  return raw.map((entry, index) => normalizeCategory(entry as Record<string, unknown>, index));
}

function loadCsv(filePath: string): Category[] {
  const content = fs.readFileSync(filePath, "utf8").trim();
  if (!content) {
    return [];
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const entry: Record<string, unknown> = {};

    for (let headerIndex = 0; headerIndex < headers.length; headerIndex += 1) {
      entry[headers[headerIndex]] = values[headerIndex] ?? "";
    }

    return normalizeCategory(entry, index);
  });
}

function loadCategories(source: string): Category[] {
  if (source === "defaults") {
    return DEFAULT_CATEGORIES;
  }

  const filePath = path.resolve(source);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Import source not found: ${filePath}`);
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".json") {
    return loadJson(filePath);
  }

  if (extension === ".csv") {
    return loadCsv(filePath);
  }

  throw new Error("Unsupported import source. Use defaults, a .json file, or a .csv file.");
}

function resolveDatabaseName(connectionString: string): string {
  try {
    const { pathname } = new URL(connectionString);
    const parsed = pathname.replace(/^\//, "").trim();
    return process.env.DATABASE_NAME ?? (parsed || "know-your-friend");
  } catch {
    return process.env.DATABASE_NAME ?? "know-your-friend";
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const { source, replace } = parseArgs(process.argv.slice(2));
  const categories = loadCategories(source);
  const databaseName = resolveDatabaseName(databaseUrl);

  const client = new MongoClient(databaseUrl, {
    serverApi: ServerApiVersion.v1,
  });

  try {
    await client.connect();

    const db = client.db(databaseName);
    const collection = db.collection<CategoryDocument>("categories");
    await collection.createIndex({ id: 1 }, { unique: true });

    if (replace) {
      await collection.deleteMany({});
    }

    let inserted = 0;
    let updated = 0;
    const updatedAt = new Date();

    for (let index = 0; index < categories.length; index += 1) {
      const category = categories[index];
      const result = await collection.updateOne(
        { id: category.id },
        {
          $set: {
            id: category.id,
            label: category.label,
            leftLabel: category.leftLabel,
            rightLabel: category.rightLabel,
            sortOrder: category.sortOrder ?? index,
            updatedAt,
          },
        },
        { upsert: true },
      );

      if (result.upsertedCount > 0) {
        inserted += 1;
      } else if (result.modifiedCount > 0) {
        updated += 1;
      }
    }

    const finalCount = await collection.countDocuments();

    console.log(`source=${source}`);
    console.log(`replace=${replace}`);
    console.log(`database=${databaseName}`);
    console.log(`inserted=${inserted}`);
    console.log(`updated=${updated}`);
    console.log(`finalCount=${finalCount}`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});