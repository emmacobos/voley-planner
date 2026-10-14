/** Fecha de la última copia de seguridad descargada en este navegador. */
const LAST_BACKUP_KEY = 'voley-planner-backup-at';

export function lastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function rememberBackup(iso: string) {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, iso);
  } catch {
    // Sin almacenamiento disponible: no se recuerda la fecha.
  }
}

/** ¿Conviene recordar hacer una copia? Nunca se hizo o pasó más de un mes. */
export function backupIsDue(now: Date = new Date()): boolean {
  const last = lastBackupAt();
  return !last || now.getTime() - new Date(last).getTime() > 30 * 86400000;
}
