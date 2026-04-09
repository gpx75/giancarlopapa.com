export function useDateFormatting() {
  function formatDate(dateStr: string) {
    return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr))
  }

  /**
   * Inbox-style relative date: time of day if today, `dd MMM` otherwise.
   * Locale: en-CH.
   */
  function formatInboxDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    if (isToday) {
      return date.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('en-CH', { day: '2-digit', month: 'short' })
  }

  /**
   * Full weekday + date + time, en-CH locale. Used in mail detail headers.
   */
  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-CH', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return { formatDate, formatInboxDate, formatDateTime }
}
