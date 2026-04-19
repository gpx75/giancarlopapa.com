/**
 * Deterministic location scoring for job applications.
 * Candidate home: Elsau ZH, Switzerland (47.265°N, 8.677°E).
 * Scores are based on commute viability, not just distance.
 */

// Scored by commute practicality from Elsau ZH
const CITY_SCORES: Array<[pattern: RegExp, score: number]> = [
  // Exact Elsau area
  [/\belsau\b/i, 99],
  [/\bwiesendangen\b/i, 98],
  [/\bseuzach\b/i, 98],
  [/\bbrütten\b/i, 97],

  // Winterthur & immediate surroundings (<15 km) — excellent
  [/\bwinterthur\b/i, 97],
  [/\bwülflingen\b/i, 97],
  [/\btöss\b/i, 97],
  [/\bkempttal\b/i, 95],
  [/\bweisslingen\b/i, 96],
  [/\bpfäffikon.?zh\b/i, 93],
  [/\bkloten\b/i, 91],
  [/\bopfikon\b/i, 90],
  [/\beffretikon\b/i, 92],
  [/\bhegnau\b/i, 92],
  [/\bvolketswil\b/i, 91],
  [/\bbassersdorf\b/i, 93],

  // Frauenfeld / Thurgau area (~20 km)
  [/\bfrauenfeld\b/i, 93],
  [/\bweinfelden\b/i, 88],
  [/\bmünchenbuchsee\b/i, 62],
  [/\bkreuzlingen\b/i, 82],
  [/\bkonstanz\b/i, 80],

  // Andelfingen / Schaffhausen (~25–30 km)
  [/\bandelfingen\b/i, 93],
  [/\bschaffhausen\b/i, 88],
  [/\bneuhausen\b/i, 88],

  // Zurich city & ring (~25–35 km) — good
  [/\bzürich\b|\bzurich\b/i, 90],
  [/\bdübendorf\b/i, 89],
  [/\bregensdorf\b/i, 91],
  [/\bhönggerberg\b/i, 90],
  [/\bglattbrugg\b/i, 91],
  [/\bwallisellen\b/i, 90],
  [/\buster\b/i, 88],
  [/\brüti\b/i, 87],
  [/\bhorgen\b/i, 84],
  [/\bthalwil\b/i, 84],
  [/\brüschlikon\b/i, 84],
  [/\badliswil\b/i, 85],
  [/\bbirmensdorf\b/i, 87],
  [/\bspreitenbach\b/i, 85],
  [/\bbülach\b/i, 89],
  [/\beglisau\b/i, 90],
  [/\bbaden\b/i, 85],
  [/\bwettingen\b/i, 86],
  [/\bschlieren\b/i, 88],
  [/\bdietikon\b/i, 87],

  // Zurich Lake south / inner ZH (~40–55 km)
  [/\bwädenswil\b/i, 81],
  [/\bküsnacht\b/i, 83],
  [/\bmeilen\b/i, 82],
  [/\bstäfa\b/i, 80],
  [/\brapperswil\b/i, 80],
  [/\bjona\b/i, 80],

  // Zug (~50 km)
  [/\bzug\b/i, 82],
  [/\bbaar\b/i, 81],
  [/\brotkreuz\b/i, 79],

  // Aarau / Aargau (~55–65 km)
  [/\baarau\b/i, 80],
  [/\bolten\b/i, 76],
  [/\baarburg\b/i, 75],
  [/\bbrugg\b/i, 82],
  [/\bbaden\b/i, 85],

  // St. Gallen area (~60 km)
  [/\bst\.?\s*gallen\b/i, 80],
  [/\bherisau\b/i, 76],
  [/\bwil\s*sg\b|\bwil\b/i, 85],
  [/\bgossau\b/i, 80],

  // Lucerne (~70 km)
  [/\bluzern\b|\blucerne\b/i, 77],
  [/\brotenburg\b/i, 74],
  [/\bsursee\b/i, 73],
  [/\bhochdorf\b/i, 72],

  // Basel area (~80–90 km)
  [/\bbasel\b/i, 74],
  [/\bliestal\b/i, 73],
  [/\bmuttenz\b/i, 73],
  [/\bbirsfelden\b/i, 73],

  // Bern area (~125–135 km)
  [/\bbern\b|\bberne\b/i, 62],
  [/\bbiel\b|\bbienne\b/i, 59],
  [/\bthun\b/i, 57],
  [/\bburgdorf\b/i, 60],
  [/\blangenthal\b/i, 64],
  [/\bsolothurn\b/i, 69],

  // Western CH (~150–200 km)
  [/\bfribourg\b|\bfreiburg\b/i, 55],
  [/\bneuchâtel\b|\bneuenburg\b/i, 52],
  [/\bla.chaux.de.fonds\b/i, 49],
  [/\blausanne\b/i, 48],
  [/\bmontreux\b/i, 45],
  [/\bvevey\b/i, 45],
  [/\bsion\b|\bsitten\b/i, 43],

  // Southern CH (~180–220 km)
  [/\blugano\b/i, 40],
  [/\bbellinzona\b/i, 39],
  [/\blocarno\b/i, 38],

  // Geneva (~270 km)
  [/\bgenève\b|\bgenf\b|\bgeneva\b/i, 32],

  // Neighboring countries (cross-border commute possible)
  [/\bdeutschland\b|\bgermany\b|\bde\b/i, 28],
  [/\bösterreich\b|\baustria\b|\bat\b/i, 26],
  [/\bfrankreich\b|\bfrance\b|\bfr\b/i, 24],
  [/\bitalia\b|\bitaly\b|\bit\b/i, 20],

  // International / relocation
  [/\buk\b|\bengland\b|\blondon\b/i, 15],
  [/\bnl\b|\bnetherlands\b|\bamsterdam\b/i, 14],
  [/\busa\b|\bunited states\b|\bnew york\b/i, 8],
];

// Canton name/abbrev → fallback score (used when no city matched)
const CANTON_SCORES: Record<string, number> = {
  zh: 90, zuerich: 90, zürich: 90, zurich: 90,
  tg: 88, thurgau: 88,
  sh: 88, schaffhausen: 88,
  ag: 80, aargau: 80,
  sg: 80, stgallen: 80,
  zg: 82, zug: 82,
  lu: 77, luzern: 77, lucerne: 77,
  sz: 79, schwyz: 79,
  gl: 72, glarus: 72,
  gr: 68, graubünden: 68, graubunden: 68,
  so: 72, solothurn: 72,
  bl: 73, bl: 73,
  bs: 74, basel: 74,
  ar: 73, ai: 70,
  be: 62, bern: 62, berne: 62,
  fr: 55, fribourg: 55,
  ne: 52, neuenburg: 52,
  vd: 48, vaud: 48,
  vs: 43, valais: 43, wallis: 43,
  ti: 40, tessin: 40, ticino: 40,
  ge: 32, genf: 32, genève: 32, geneva: 32,
  ju: 54, jura: 54,
  nw: 77, ow: 75, ur: 66,
};

/**
 * Compute a location score (0–100) for a job based on its location string.
 * Higher = easier commute / better fit for candidate in Elsau ZH.
 */
export function scoreLocation(locationStr: string | null | undefined): number {
  if (!locationStr) return 50;

  const s = locationStr.toLowerCase().trim();

  // Remote — best case
  if (/\bfully?\s+remote\b|^remote$|100\s*%\s*remote|telearbeit\s*100|home.?office\s*only/i.test(s)) return 98;
  if (/\bhome.?office\b|\btelearbeit\b|remote.?first/i.test(s)) return 95;

  // Hybrid — check if combined with known location
  const isHybrid = /\bhybrid\b/i.test(s);
  if (isHybrid && !/[a-z]/.test(s.replace(/hybrid/i, '').trim())) {
    // Just "hybrid" with no city context
    return 87;
  }

  // City / pattern matching
  for (const [pattern, score] of CITY_SCORES) {
    if (pattern.test(s)) return isHybrid ? Math.min(98, score + 5) : score;
  }

  // Canton fallback
  for (const [canton, score] of Object.entries(CANTON_SCORES)) {
    if (new RegExp(`\\b${canton}\\b`, 'i').test(s)) {
      return isHybrid ? Math.min(98, score + 5) : score;
    }
  }

  // Generic Switzerland without known city
  if (/\bschweiz\b|\bswitzerland\b|\bsuisse\b|\bsvizzera\b/i.test(s)) {
    return isHybrid ? 85 : 72;
  }

  return 50; // unknown
}
