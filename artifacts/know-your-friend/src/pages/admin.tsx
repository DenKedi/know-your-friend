import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Category {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

const API_BASE = `${import.meta.env.BASE_URL}api`;

export default function Admin() {
  const { toast } = useToast();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Category>({ id: "", label: "", leftLabel: "", rightLabel: "" });
  const [showNew, setShowNew] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/categories`);
      const data = (await res.json()) as Category[];
      setItems(data);
    } catch (e) {
      toast({ title: "Laden fehlgeschlagen", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function saveNew() {
    if (!draft.id || !draft.label || !draft.leftLabel || !draft.rightLabel) {
      toast({ title: "Bitte alle Felder ausfüllen", variant: "destructive" });
      return;
    }
    const res = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Speichern fehlgeschlagen", description: err.error, variant: "destructive" });
      return;
    }
    setShowNew(false);
    setDraft({ id: "", label: "", leftLabel: "", rightLabel: "" });
    toast({ title: "Kategorie hinzugefügt" });
    reload();
  }

  async function saveEdit(id: string, patch: Partial<Category>) {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast({ title: "Update fehlgeschlagen", description: err.error, variant: "destructive" });
      return;
    }
    toast({ title: "Gespeichert" });
    setEditingId(null);
    reload();
  }

  async function remove(id: string) {
    if (!confirm(`Kategorie "${id}" wirklich löschen?`)) return;
    const res = await fetch(`${API_BASE}/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast({ title: "Löschen fehlgeschlagen", variant: "destructive" });
      return;
    }
    toast({ title: "Gelöscht" });
    reload();
  }

  async function resetAll() {
    if (!confirm("Wirklich alle Kategorien auf die Standard-Liste zurücksetzen? Eigene Einträge gehen verloren.")) return;
    const res = await fetch(`${API_BASE}/categories/reset`, { method: "POST" });
    if (!res.ok) {
      toast({ title: "Reset fehlgeschlagen", variant: "destructive" });
      return;
    }
    toast({ title: "Auf Standard zurückgesetzt" });
    reload();
  }

  return (
    <div className="min-h-[100dvh] bg-background px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-primary">
              Kategorien
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} Einträge · Änderungen sind sofort live
            </p>
          </div>
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground">
            ← Zurück
          </Link>
        </header>

        <div className="flex gap-2 mb-4">
          <Button onClick={() => setShowNew((v) => !v)} className="font-bold">
            + Neue Kategorie
          </Button>
          <Button variant="outline" onClick={resetAll} className="font-bold ml-auto">
            Auf Standard zurücksetzen
          </Button>
        </div>

        {showNew && (
          <Card className="mb-4 border-2 border-primary">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-base">Neue Kategorie</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">ID (a-z, 0-9, _)</label>
                <Input
                  value={draft.id}
                  onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  placeholder="z.B. lieblings_eis"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground">Label</label>
                <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="z.B. Eissorten-Vorliebe" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Links</label>
                  <Input value={draft.leftLabel} onChange={(e) => setDraft({ ...draft, leftLabel: e.target.value })} placeholder="z.B. Vanille" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground">Rechts</label>
                  <Input value={draft.rightLabel} onChange={(e) => setDraft({ ...draft, rightLabel: e.target.value })} placeholder="z.B. Pistazie" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={saveNew} className="flex-1 font-bold">Speichern</Button>
                <Button variant="outline" onClick={() => setShowNew(false)}>Abbrechen</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Lade…</div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                editing={editingId === c.id}
                onStartEdit={() => setEditingId(c.id)}
                onCancel={() => setEditingId(null)}
                onSave={(patch) => saveEdit(c.id, patch)}
                onDelete={() => remove(c.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  category: Category;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<Category>) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(category.label);
  const [left, setLeft] = useState(category.leftLabel);
  const [right, setRight] = useState(category.rightLabel);

  useEffect(() => {
    setLabel(category.label);
    setLeft(category.leftLabel);
    setRight(category.rightLabel);
  }, [category, editing]);

  if (editing) {
    return (
      <Card className="border-2 border-primary">
        <CardContent className="p-3 space-y-2">
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Label</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Links</label>
              <Input value={left} onChange={(e) => setLeft(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Rechts</label>
              <Input value={right} onChange={(e) => setRight(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => onSave({ label, leftLabel: left, rightLabel: right })} className="flex-1 font-bold">
              Speichern
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>Abbrechen</Button>
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
          <div className="font-bold text-sm truncate">{category.label}</div>
          <div className="text-xs text-muted-foreground truncate">
            <span className="text-primary">{category.leftLabel}</span> ↔ <span className="text-secondary">{category.rightLabel}</span>
          </div>
          <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{category.id}</div>
        </div>
        <Button size="sm" variant="outline" onClick={onStartEdit}>Bearbeiten</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">×</Button>
      </CardContent>
    </Card>
  );
}
