// Client-side lightweight NLP feature extraction for the analysis dashboard.

const STOPWORDS = new Set([
  "the","a","an","and","or","but","if","then","else","of","at","by","for","with","about","against","between","into",
  "through","during","before","after","above","below","to","from","up","down","in","out","on","off","over","under",
  "again","further","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would",
  "shall","should","can","could","may","might","must","this","that","these","those","i","you","he","she","it","we",
  "they","them","their","his","her","its","our","your","my","me","us","as","not","no","so","than","too","very",
  "just","also","ng","sa","ang","mga","na","ay","at","si","kay","ko","mo","ka","po","yung","pero","kasi"
]);

const SENSATIONAL_WORDS = [
  "shocking","unbelievable","you won't believe","exposed","revealed","secret","hidden","truth","wake up","they don't want",
  "breaking","urgent","must read","must share","banned","conspiracy","cover up","destroyed","slammed","obliterated",
  "miracle","cure","scam","share now","share this","viral","insane","crazy","outrageous","bombshell","jaw-dropping",
  "discover","believe","mind blown","unreal","mainstream media","fake media","wake","truth bomb"
];

const POSITIVE = ["good","great","positive","success","win","achievement","growth","safe","verified","official","peer-reviewed","study","research","data","evidence","confirmed","approved"];
const NEGATIVE = ["bad","terrible","horrible","fail","failure","corrupt","scam","fraud","hoax","fake","lie","liar","shocking","disaster","crisis","destroy","attack","banned","exposed","hidden","conspiracy"];

export interface BehavioralIndicators {
  clickbait: number;       // 0-100
  sentiment: number;       // -1 to 1 (display as |value|*100 magnitude)
  capitalization: number;  // 0-100 (% of fully-uppercase words longer than 1 char)
  punctuation: number;     // 0-100 normalized
}

export interface NlpFeatures {
  totalWords: number;
  uniqueWords: number;
  sentences: number;
  avgWordLength: number;
  exclamations: number;
  questions: number;
  sentiment: number;        // -1 .. 1
  vocabularyDiversity: number; // 0..1
  topTokens: { token: string; count: number }[];
  indicators: BehavioralIndicators;
}

export function extractFeatures(text: string): NlpFeatures {
  const cleaned = text.trim();
  const lower = cleaned.toLowerCase();

  const wordMatches = cleaned.match(/\b[\p{L}'-]+\b/gu) ?? [];
  const totalWords = wordMatches.length || 1;
  const uniqueSet = new Set(wordMatches.map((w) => w.toLowerCase()));
  const uniqueWords = uniqueSet.size;

  const sentenceParts = cleaned.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);
  const sentences = Math.max(sentenceParts.length, 1);

  const avgWordLength =
    wordMatches.reduce((a, w) => a + w.length, 0) / totalWords;

  const exclamations = (cleaned.match(/!/g) ?? []).length;
  const questions = (cleaned.match(/\?/g) ?? []).length;

  // Sentiment (very light lexicon)
  let score = 0;
  for (const w of wordMatches) {
    const wl = w.toLowerCase();
    if (POSITIVE.includes(wl)) score += 1;
    if (NEGATIVE.includes(wl)) score -= 1;
  }
  const sentiment = Math.max(-1, Math.min(1, score / Math.sqrt(totalWords)));

  // Top tokens (excluding stopwords / short words)
  const counts = new Map<string, number>();
  for (const w of wordMatches) {
    const wl = w.toLowerCase();
    if (wl.length < 4) continue;
    if (STOPWORDS.has(wl)) continue;
    counts.set(wl, (counts.get(wl) ?? 0) + 1);
  }
  const topTokens = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token, count]) => ({ token, count }));

  // Behavioral indicators
  let clickbaitHits = 0;
  for (const phrase of SENSATIONAL_WORDS) {
    if (lower.includes(phrase)) clickbaitHits += 1;
  }
  const clickbait = Math.min(100, Math.round((clickbaitHits / 6) * 100));

  const allCapsWords = wordMatches.filter((w) => w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)).length;
  const capitalization = Math.min(100, Math.round((allCapsWords / totalWords) * 100 * 4));

  const punctuationRaw = (exclamations + questions) / sentences;
  const punctuation = Math.min(100, Math.round(punctuationRaw * 25));

  return {
    totalWords,
    uniqueWords,
    sentences,
    avgWordLength: Math.round(avgWordLength * 10) / 10,
    exclamations,
    questions,
    sentiment: Math.round(sentiment * 100) / 100,
    vocabularyDiversity: Math.round((uniqueWords / totalWords) * 1000) / 10, // %
    topTokens,
    indicators: {
      clickbait,
      sentiment: Math.round(Math.abs(sentiment) * 100),
      capitalization,
      punctuation,
    },
  };
}

export const EXAMPLE_FAKE = `SHOCKING!!! You won't BELIEVE what the mainstream media is hiding from you!!! A secret cure for diabetes has been EXPOSED and Big Pharma doesn't want you to discover the truth!!! Doctors are SLAMMED after this hidden remedy went viral. The government has been covering this up for YEARS. Share this before they delete it!!! Wake up Philippines!!! The truth is finally revealed and you need to know NOW. Thousands have already been cured but the news refuses to report it. This shocking discovery will change everything you believe about modern medicine.`;

export const EXAMPLE_GENUINE = `According to a peer-reviewed study published in Nature Medicine, researchers at Stanford University have identified a potential new treatment pathway for Alzheimer's disease. The study, which followed 500 patients over three years, showed promising results in early-stage trials. Dr. Sarah Johnson, lead researcher, stated that further investigation is needed before clinical applications can be considered. The research was funded by the National Institutes of Health and the findings have been submitted for independent replication.`;
