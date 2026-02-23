export function useDateFormatting() {
  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
  }

  return { formatDate }
}
