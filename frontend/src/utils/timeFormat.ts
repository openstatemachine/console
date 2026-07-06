const TIMESTAMP_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
}

/** Locale timestamp with millisecond precision. */
export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, TIMESTAMP_OPTIONS)
}

/** Human-readable duration from milliseconds (ms precision). */
export function formatDurationMs(ms: number): string {
  const safeMs = Math.max(0, Math.round(ms))
  if (safeMs < 1000) return `${safeMs} ms`

  const totalSeconds = safeMs / 1000
  if (totalSeconds < 60) return `${totalSeconds.toFixed(3)} s`

  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes < 60) return `${minutes} m ${seconds.toFixed(3)} s`

  const hours = Math.floor(minutes / 60)
  const remMinutes = minutes % 60
  return `${hours} h ${remMinutes} m ${seconds.toFixed(3)} s`
}

/** Elapsed execution time from start to finish (or now if still running). */
export function executionDurationMs(
  startedAt: string,
  finishedAt?: string,
  now = Date.now(),
): number {
  const start = new Date(startedAt).getTime()
  const end = finishedAt ? new Date(finishedAt).getTime() : now
  return Math.max(0, end - start)
}

export function formatExecutionDuration(
  startedAt: string,
  finishedAt?: string,
  now = Date.now(),
): string {
  return formatDurationMs(executionDurationMs(startedAt, finishedAt, now))
}
