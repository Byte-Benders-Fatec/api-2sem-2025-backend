// Transforma ?fields=a,b,c em { a: 1, b: 1, c: 1 }
export function parseFieldsToProjection(fields?: string): Record<string, 0 | 1> | undefined {
  if (!fields) return undefined;
  const proj: Record<string, 0 | 1> = {};
  for (const f of fields.split(",").map(s => s.trim()).filter(Boolean)) {
    proj[f] = 1;
  }
  return Object.keys(proj).length ? proj : undefined;
}
