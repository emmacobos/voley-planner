/** Edad cumplida a una fecha dada, o null si la fecha de nacimiento no es válida. */
export function ageOn(birthDate: string | undefined, on: Date = new Date()): number | null {
  if (!birthDate) return null;
  const [y, m, d] = birthDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
  return age >= 0 ? age : null;
}
