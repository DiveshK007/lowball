// Browser copy of the drop id encoding. Mirrors contract/src/drop-id.ts and
// ops/src/drop-id.ts — kept local because this module deliberately has no
// dependencies, so the /drop/:dropId route can resolve a ledger key without
// pulling in the SDK tree. If the encoding changes, update all three.

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

/** Recover the slug from a 32-byte ledger key (trailing zero padding removed). */
export const dropIdSlug = (key: Uint8Array): string => {
  let end = key.length
  while (end > 0 && key[end - 1] === 0) end -= 1
  return new TextDecoder().decode(key.subarray(0, end))
}
