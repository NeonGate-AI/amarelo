export const normalizeMemoryText = (value: string): string =>
  value.normalize('NFKC').replace(/\s+/g, ' ').trim()
