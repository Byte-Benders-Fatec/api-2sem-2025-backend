export function flatten(obj: any, prefix = "", res: any = {}): Record<string, any> {
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flatten(value, newKey, res);
    } else {
      res[newKey] = value;
    }
  }
  return res;
}
