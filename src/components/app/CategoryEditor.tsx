import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Sparkles } from "lucide-react";
import {
  CATEGORY_COLOR_PRESETS,
  type CategoryRow,
  useAppData,
} from "@/lib/store";

type Mode =
  | { kind: "create" }
  | { kind: "edit"; row: CategoryRow };

const EMOJI_PRESETS = [
  "🍜","🍕","☕","🛒","🛍️","✈️","🚕","🎉","🎮","🎬","🏠","💡",
  "💊","💪","📺","📚","💻","🐶","🎁","💸","💼","✨","🔥","🌈",
];

export function CategoryEditor({
  open,
  mode,
  onOpenChange,
}: {
  open: boolean;
  mode: Mode;
  onOpenChange: (open: boolean) => void;
}) {
  const { categories, createCategory, updateCategory, deleteCategory } = useAppData();

  const initial = mode.kind === "edit" ? mode.row : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "✨");
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_PRESETS[0].value);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset whenever the dialog opens for a different target
  useEffect(() => {
    if (!open) return;
    if (mode.kind === "edit") {
      setName(mode.row.name);
      setEmoji(mode.row.emoji);
      setColor(mode.row.color);
    } else {
      setName("");
      setEmoji("✨");
      setColor(CATEGORY_COLOR_PRESETS[0].value);
    }
    setConfirmDelete(false);
  }, [open, mode]);

  const otherCategories = useMemo(
    () => categories.filter((c) => mode.kind !== "edit" || c.id !== mode.row.id),
    [categories, mode],
  );
  const nameTaken = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return false;
    return otherCategories.some((c) => c.name.toLowerCase() === trimmed);
  }, [name, otherCategories]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Give your category a name ✏️"); return; }
    if (nameTaken) { toast.error("That name's already taken"); return; }
    setSaving(true);
    try {
      if (mode.kind === "edit") {
        await updateCategory(mode.row.id, { name: trimmed, emoji, color });
        toast.success("Category updated 💅");
      } else {
        await createCategory({ name: trimmed, emoji, color });
        toast.success("Category added ✨");
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (mode.kind !== "edit") return;
    setSaving(true);
    try {
      await deleteCategory(mode.row.id, { reassignTo: null });
      toast("Category deleted — and its expenses too 🗑️");
      setConfirmDelete(false);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't delete");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {mode.kind === "edit" ? "Edit category" : "New category"}
            </DialogTitle>
            <DialogDescription>
              {mode.kind === "edit"
                ? "Rename it, swap the vibe, or yeet it entirely."
                : "Make it yours — pick an emoji and a color."}
            </DialogDescription>
          </DialogHeader>

          {/* Live preview */}
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: `color-mix(in oklab, ${color} 18%, transparent)` }}>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `color-mix(in oklab, ${color} 30%, transparent)` }}>
              {emoji}
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Preview</p>
              <p className="font-semibold truncate">{name.trim() || "Your category"}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              placeholder="e.g. Coffee"
              className="w-full glass rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            {nameTaken && (
              <p className="text-xs text-destructive">That name's already used by another category.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Emoji</label>
            <div className="flex items-center gap-2">
              <input
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                maxLength={4}
                className="w-16 glass rounded-2xl px-3 py-2.5 text-2xl text-center outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex-1 grid grid-cols-8 gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                {EMOJI_PRESETS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${emoji === e ? "bg-gradient-primary shadow-glow scale-110" : "glass hover:scale-105"}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLOR_PRESETS.map((p) => {
                const active = color === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setColor(p.value)}
                    className={`h-9 w-9 rounded-full border-2 transition-transform ${active ? "scale-110 border-foreground" : "border-transparent"}`}
                    style={{ background: p.value }}
                    aria-label={p.label}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
            {mode.kind === "edit" && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors mr-auto"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full glass px-4 py-2.5 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !name.trim() || nameTaken}
              className="rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow active:scale-95 transition-transform disabled:opacity-60"
            >
              {saving ? "Saving…" : mode.kind === "edit" ? "Save changes" : "Create category"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              {mode.kind === "edit" ? (
                <>
                  This also deletes every expense logged under{" "}
                  <span className="font-semibold">{mode.row.name}</span>. There's no undo.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}