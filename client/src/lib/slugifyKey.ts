/** Identificador estable para `catalog_implementacion_items.key` / `implementaciones.checkKey`. */
export function slugifyForKey(input: string): string {
  const s = input
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return (s || "item").slice(0, 80);
}

export function uniqueKeyFromBase(base: string, existing: Set<string>): string {
  const root = base || "item";
  let key = root;
  let n = 2;
  while (existing.has(key)) {
    key = `${root}_${n}`;
    n++;
  }
  return key;
}
