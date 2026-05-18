export type SourceCategory = "fact-checker" | "mainstream" | "government" | "international";

export interface TrustedSource {
  name: string;
  url: string;
  searchUrl: (q: string) => string;
  category: SourceCategory;
  country: "PH" | "INT";
  description: string;
}

export const PH_TRUSTED_SOURCES: TrustedSource[] = [
  // Dedicated PH Fact-checkers
  {
    name: "VERA Files Fact Check",
    url: "https://verafiles.org/specials/vera-files-fact-check",
    searchUrl: (q) => `https://verafiles.org/?s=${encodeURIComponent(q)}`,
    category: "fact-checker",
    country: "PH",
    description: "Independent Philippine fact-checking organization, IFCN-verified.",
  },
  {
    name: "Tsek.ph",
    url: "https://www.tsek.ph",
    searchUrl: (q) => `https://www.tsek.ph/?s=${encodeURIComponent(q)}`,
    category: "fact-checker",
    country: "PH",
    description: "Collaborative PH fact-checking initiative.",
  },
  {
    name: "Rappler Fact Check",
    url: "https://www.rappler.com/newsbreak/fact-check/",
    searchUrl: (q) => `https://www.rappler.com/?s=${encodeURIComponent(q)}`,
    category: "fact-checker",
    country: "PH",
    description: "Rappler's dedicated fact-checking section.",
  },
  {
    name: "PCIJ",
    url: "https://pcij.org",
    searchUrl: (q) => `https://pcij.org/?s=${encodeURIComponent(q)}`,
    category: "fact-checker",
    country: "PH",
    description: "Philippine Center for Investigative Journalism.",
  },
  // Mainstream PH news
  {
    name: "Rappler",
    url: "https://www.rappler.com",
    searchUrl: (q) => `https://www.rappler.com/?s=${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "Digital-first PH news organization.",
  },
  {
    name: "Inquirer.net",
    url: "https://www.inquirer.net",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Ainquirer.net+${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "Philippine Daily Inquirer online.",
  },
  {
    name: "ABS-CBN News",
    url: "https://news.abs-cbn.com",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Anews.abs-cbn.com+${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "ABS-CBN News and Current Affairs.",
  },
  {
    name: "GMA News Online",
    url: "https://www.gmanetwork.com/news/",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Agmanetwork.com+${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "GMA Network news portal.",
  },
  {
    name: "Philstar",
    url: "https://www.philstar.com",
    searchUrl: (q) => `https://www.philstar.com/search?q=${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "The Philippine Star online.",
  },
  {
    name: "Manila Bulletin",
    url: "https://mb.com.ph",
    searchUrl: (q) => `https://mb.com.ph/?s=${encodeURIComponent(q)}`,
    category: "mainstream",
    country: "PH",
    description: "Manila Bulletin newspaper.",
  },
  // Government / official PH
  {
    name: "Philippine News Agency (PNA)",
    url: "https://www.pna.gov.ph",
    searchUrl: (q) => `https://www.pna.gov.ph/search?q=${encodeURIComponent(q)}`,
    category: "government",
    country: "PH",
    description: "Official state news agency.",
  },
  {
    name: "Presidential Communications Office",
    url: "https://pco.gov.ph",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Apco.gov.ph+${encodeURIComponent(q)}`,
    category: "government",
    country: "PH",
    description: "Official statements from the Office of the President.",
  },
  {
    name: "Department of Health (DOH)",
    url: "https://doh.gov.ph",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Adoh.gov.ph+${encodeURIComponent(q)}`,
    category: "government",
    country: "PH",
    description: "Verify health-related claims.",
  },
  {
    name: "Comelec",
    url: "https://comelec.gov.ph",
    searchUrl: (q) => `https://www.google.com/search?q=site%3Acomelec.gov.ph+${encodeURIComponent(q)}`,
    category: "government",
    country: "PH",
    description: "Commission on Elections — election-related claims.",
  },
  // International fact-checkers
  {
    name: "AFP Fact Check (PH)",
    url: "https://factcheck.afp.com/list/all/all/52821/0",
    searchUrl: (q) => `https://factcheck.afp.com/search?keys=${encodeURIComponent(q)}`,
    category: "international",
    country: "INT",
    description: "Agence France-Presse fact-checking, Philippines desk.",
  },
  {
    name: "Reuters Fact Check",
    url: "https://www.reuters.com/fact-check/",
    searchUrl: (q) => `https://www.reuters.com/site-search/?query=${encodeURIComponent(q)}`,
    category: "international",
    country: "INT",
    description: "Reuters fact-checking team.",
  },
  {
    name: "Snopes",
    url: "https://www.snopes.com",
    searchUrl: (q) => `https://www.snopes.com/?s=${encodeURIComponent(q)}`,
    category: "international",
    country: "INT",
    description: "Long-running fact-checking site.",
  },
];

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  "fact-checker": "Fact-checkers",
  mainstream: "Mainstream PH news",
  government: "Government / Official",
  international: "International fact-checkers",
};
