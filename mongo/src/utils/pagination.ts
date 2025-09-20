export function parsePagination(qs: any) {
  const page = Math.max(parseInt(qs?.page ?? "1", 10), 1);
  const pageSizeRaw = parseInt(qs?.pageSize ?? "20", 10);
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, limit: pageSize };
}
