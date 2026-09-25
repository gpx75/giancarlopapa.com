const zurichParts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Zurich',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

export function zurichDate(iso: string): {
  year: number;
  month: number;
  day: number;
} {
  const parts = Object.fromEntries(
    zurichParts.formatToParts(new Date(iso)).map((p) => [p.type, p.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day)
  };
}

export function zurichMonthKey(iso: string): string {
  const { year, month } = zurichDate(iso);
  return `${year}-${String(month).padStart(2, '0')}`;
}
