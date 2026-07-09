// Basic Hijri -> Gregorian conversion (approximate). Uses date-fns-jalali as a
// helper but Hijri specifically: use a simple algorithm.
// For accuracy, use Intl.DateTimeFormat with 'islamic-umalqura'.

export function hijriToGregorian(hy: number, hm: number, hd: number): Date {
  // Approximate: 1 Hijri year ≈ 354.367 days. Reference: 1 Muharram 1 AH = 622-07-19 Julian
  // Use islamic-umalqura via Temporal? Not available. Use approximation.
  const jd =
    Math.floor((11 * hy + 3) / 30) +
    354 * hy +
    30 * hm -
    Math.floor((hm - 1) / 2) +
    hd +
    1948440 -
    385;
  // Convert Julian Day to Gregorian
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = 100 * b + d - 4800 + Math.floor(m / 10);
  return new Date(year, month - 1, day);
}

export function calculateAge(birthDate: Date): number {
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}