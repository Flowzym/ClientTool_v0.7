export type Patch<T> = { id: string; changes: Partial<T> };

export function build<T>(id: string, delta: Partial<T>): Patch<T> {
  return { id, changes: { ...delta } };
}

export function merge<T>(...patches: Patch<T>[]): Patch<T> {
  if (!patches.length) throw new Error("merge requires at least one patch");
  const id = patches[0].id;
  const mergedChanges = Object.assign({}, ...patches.map(p => p.changes));
  return { id, changes: mergedChanges };
}
