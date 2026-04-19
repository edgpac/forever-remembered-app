export function generateMemorialId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `FH-${year}-${rand}`;
}

export function formatYears(birth?: string | null, passing?: string | null): string {
  const b = birth?.split("-")[0];
  const p = passing?.split("-")[0];
  return [b, p].filter(Boolean).join(" — ");
}
