/**
 * One log line for an error, including its cause chain and error codes.
 * Node's fetch fails with just "fetch failed"; the real reason (DNS, refused,
 * TLS...) is in `cause`, so logging only `message` hides it.
 */
export function describeError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current !== undefined && current !== null && depth < 4; depth += 1) {
    if (!(current instanceof Error)) {
      parts.push(typeof current === 'string' ? current : JSON.stringify(current) ?? typeof current);
      break;
    }
    const { code } = current as Error & { code?: unknown };
    parts.push(typeof code === 'string' ? `${current.message} [${code}]` : current.message);
    current = current.cause;
  }
  return parts.join(' <- caused by: ');
}
