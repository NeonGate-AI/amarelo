export const normalizeUnicodeText = (value: string): string =>
  value.normalize('NFKC').replace(/\s+/g, ' ').trim()
