import { useEffect, useState } from 'react';

export type Route =
  | { name: 'sessions' }
  | { name: 'session'; id: string }
  | { name: 'session-print'; id: string }
  | { name: 'exercises' }
  | { name: 'exercise'; id: string }
  | { name: 'roster' }
  | { name: 'player'; id: string }
  | { name: 'calendar' }
  | { name: 'library' }
  | { name: 'data' }
  | { name: 'match'; id: string }
  | { name: 'match-stats'; id: string }
  | { name: 'shared-play'; code: string };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'ver' && parts[1]) return { name: 'shared-play', code: parts[1] };
  if (parts[0] === 'plantel') return parts[1] ? { name: 'player', id: parts[1] } : { name: 'roster' };
  if (parts[0] === 'calendario') return { name: 'calendar' };
  if (parts[0] === 'datos') return { name: 'data' };
  if (parts[0] === 'partidos' && parts[1]) {
    return parts[2] === 'estadisticas' ? { name: 'match-stats', id: parts[1] } : { name: 'match', id: parts[1] };
  }
  if (parts[0] === 'ejercicios' && parts[1] === 'modelos') return { name: 'library' };
  if (parts[0] === 'ejercicios') return parts[1] ? { name: 'exercise', id: parts[1] } : { name: 'exercises' };
  if (parts[0] === 'sesiones' && parts[1]) {
    return parts[2] === 'imprimir' ? { name: 'session-print', id: parts[1] } : { name: 'session', id: parts[1] };
  }
  return { name: 'sessions' };
}

export function navigate(path: string) {
  window.location.hash = path;
}

/** Ruteo mínimo por hash, compatible con GitHub Pages. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
