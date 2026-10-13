import { BannedWordEntity } from '../types';

export const DEFAULT_BANNED_WORDS_RAW: string[] = [
  'sex',
  'ch_ch',
  'ch-ch',
  'chịch',
  'chich',
  'địt',
  'dit',
  'lừa đảo',
  'lua dao',
  'cờ bạc',
  'co bac',
  'gái gọi',
  'gai goi',
  'bán dâm',
  'ban dam',
  'ma túy',
  'ma tuy',
  'vay nặng lãi',
  'vay nang lai',
  'tài xỉu',
  'tai xiu',
  'lô đề',
  'lo de',
  'đm',
  'dm',
  'vcl',
  'khiêu dâm',
  'khieu dam',
  'ch_ch dạo',
];

export const INITIAL_BANNED_WORDS: BannedWordEntity[] = DEFAULT_BANNED_WORDS_RAW.map((word, idx) => ({
  id: `bw_default_${idx + 1}`,
  word,
  createdAt: Date.now() - (idx * 60000),
  addedBy: 'Hệ thống Quản trị',
  enabled: true,
  hitCount: 0,
}));

/**
 * Remove Vietnamese accents/diacritics for normalization
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

/**
 * Helper to escape regex special characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects if a text contains any banned words from the list.
 * Supports:
 * - Direct substring and whole-word matching
 * - Separator variations (e.g., ch_ch, ch-ch, ch.ch, ch ch)
 * - Spaced/punctuated variations (e.g. s.e.x, s_e_x, s e x)
 * - Accent-insensitive comparison
 */
export function checkTextForBannedWords(
  text: string,
  bannedList: Array<string | BannedWordEntity> = INITIAL_BANNED_WORDS
): { isBlocked: boolean; matchedWord?: string } {
  if (!text || typeof text !== 'string') {
    return { isBlocked: false };
  }

  const rawLower = text.toLowerCase().trim();
  if (!rawLower) return { isBlocked: false };

  const unaccented = removeVietnameseAccents(rawLower);

  // Extract active word strings
  const activeWords: string[] = [];
  for (const item of bannedList) {
    if (typeof item === 'string') {
      const w = item.trim().toLowerCase();
      if (w) activeWords.push(w);
    } else if (item && item.enabled !== false) {
      const w = item.word.trim().toLowerCase();
      if (w) activeWords.push(w);
    }
  }

  for (const targetWord of activeWords) {
    const targetUnaccented = removeVietnameseAccents(targetWord);

    // 1. Exact or Substring match for phrases (2+ words or contains symbols like _ or -)
    if (targetWord.includes(' ') || targetWord.includes('_') || targetWord.includes('-')) {
      if (rawLower.includes(targetWord) || unaccented.includes(targetUnaccented)) {
        return { isBlocked: true, matchedWord: targetWord };
      }

      // Check variations of separator in phrases like "ch_ch", "ch-ch", "ch ch"
      const normalizedTargetPattern = targetWord.replace(/[_\s-]+/g, '[_\\s.-]+');
      try {
        const regex = new RegExp(`(^|\\W|_)${normalizedTargetPattern}($|\\W|_)`, 'i');
        if (regex.test(rawLower) || regex.test(unaccented)) {
          return { isBlocked: true, matchedWord: targetWord };
        }
      } catch {}
    }

    // 2. Specific check for "sex" and variations (s.e.x, s_e_x, s e x, \bsex\b)
    if (targetWord === 'sex') {
      const sexRegex = /(?:^|[\s_.,!?:;\-\/\\()\[\]{}'"`])s[\s_.\-*]*e[\s_.\-*]*x(?:$|[\s_.,!?:;\-\/\\()\[\]{}'"`])/i;
      if (sexRegex.test(rawLower)) {
        return { isBlocked: true, matchedWord: 'sex' };
      }
    }

    // 3. Word boundary or delimiter match for single words (e.g., "địt", "đm", "vcl")
    try {
      const escaped = escapeRegExp(targetWord);
      const escapedUnaccented = escapeRegExp(targetUnaccented);

      const wordRegex = new RegExp(`(?:^|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])${escaped}(?:$|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])`, 'i');
      const unaccentedWordRegex = new RegExp(`(?:^|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])${escapedUnaccented}(?:$|[\\s_.,!?:;\\-\\/\\\\()[\\]{}'\"\`])`, 'i');

      if (wordRegex.test(rawLower) || unaccentedWordRegex.test(unaccented)) {
        return { isBlocked: true, matchedWord: targetWord };
      }
    } catch {}

    // 4. Substring fallback for strict multi-syllable terms
    if (targetWord.length >= 4 && (rawLower.includes(targetWord) || unaccented.includes(targetUnaccented))) {
      return { isBlocked: true, matchedWord: targetWord };
    }
  }

  return { isBlocked: false };
}
