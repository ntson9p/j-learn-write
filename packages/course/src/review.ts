import { contentHash } from './hash.ts';
import type { ReviewStatus } from './types.ts';

/**
 * Review status that counts: an approval whose hash no longer matches the
 * content (the item changed after the review) is back to "draft".
 */
export function effectiveStatus(item: { review?: { status: ReviewStatus; hash?: string } }): ReviewStatus {
  const r = item.review;
  if (!r) return 'draft';
  if (r.status === 'approved' && r.hash !== contentHash(item)) return 'draft';
  return r.status;
}
