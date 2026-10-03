import { useEffect, useState } from 'react';

export type Route =
  | { name: 'exercises' }
  | { name: 'exercise'; id: string }
  | { name: 'roster' };

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'plantel') return { name: 'roster' };
  if (parts[0] === 'ejercicios' && parts[1]) return { name: 'exercise', id: parts[1] };
  return { name: 'exercises' };
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
