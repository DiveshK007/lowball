// House-side copy of the drop id encoding. Mirrors contract/src/drop-id.ts
// (kept local so ops/ typechecks without reaching across the package root —
// `rootDir` is src). If the encoding changes, update both.

export const DROP_ID_BYTES = 32

export class DropIdTooLongError extends Error {}

/** Encode a drop slug as its 32-byte ledger key. */
export const dropIdBytes = (slug: string): Uint8Array => {
  const utf8 = new TextEncoder().encode(slug)
  if (utf8.length > DROP_ID_BYTES) {
    throw new DropIdTooLongError(
      `Drop id "${slug}" is ${utf8.length} bytes; the ledger key holds ${DROP_ID_BYTES}.`,
    )
  }
  const key = new Uint8Array(DROP_ID_BYTES)
  key.set(utf8)
  return key
}
