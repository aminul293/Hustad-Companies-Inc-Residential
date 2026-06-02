export const BLOCKED_WORDS = [
  "free",
  "covered",
  "guaranteed",
  "approved",
  "no cost",
  "insurance pays",
  "waive deductible",
  "pay your deductible",
  "deductible assistance"
];

export function containsBlockedLanguage(text: string): { hasBlocked: boolean; matchedWords: string[] } {
  if (!text) return { hasBlocked: false, matchedWords: [] };
  
  const lowerText = text.toLowerCase();
  const matchedWords: string[] = [];
  
  for (const word of BLOCKED_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      matchedWords.push(word);
    }
  }
  
  return {
    hasBlocked: matchedWords.length > 0,
    matchedWords
  };
}
