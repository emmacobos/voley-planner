import { Suspense, lazy } from 'react';
import { AccountMenu } from './components/AccountMenu';
import { BallLogo } from './components/BallLogo';
import { DemoBanner } from './components/DemoBanner';
import { SharedInviteBanner } from './components/SharedInviteBanner';
import { WorkspaceBanner } from './components/WorkspaceBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportDialog } from './components/ImportDialog';
import { SessionList } from './components/SessionList';
import { ThemeToggle } from './components/ThemeToggle';
import { useHashRoute } from './hooks/useHashRoute';

// Cada pantalla se descarga recién cuando se abre, así la app arranca más rápido.
const CalendarPage = lazy(() => import('./components/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const DataPage = lazy(() => import('./components/DataPage').then((m) => ({ default: m.DataPage })));
const ExerciseEditor = lazy(() => import('./components/ExerciseEditor').then((m) => ({ default: m.ExerciseEditor })));
const ExerciseList = lazy(() => import('./components/ExerciseList').then((m) => ({ default: m.ExerciseList })));
const LibraryPage = lazy(() => import('./components/LibraryPage').then((m) => ({ default: m.LibraryPage })));
const MatchPlanPage = lazy(() => import('./components/MatchPlanPage').then((m) => ({ default: m.MatchPlanPage })));
const RosterPage = lazy(() => import('./components/RosterPage').then((m) => ({ default: m.RosterPage })));
const SessionEditor = lazy(() => import('./components/SessionEditor').then((m) => ({ default: m.SessionEditor })));
const MatchStatsPage = lazy(() => import('./components/MatchStatsPage').then((m) => ({ default: m.MatchStatsPage })));
const PlayerPage = lazy(() => import('./components/PlayerPage').then((m) => ({ default: m.PlayerPage })));
const SharedPlayPage = lazy(() => import('./components/SharedPlayPage').then((m) => ({ default: m.SharedPlayPage })));
const SeasonPage = lazy(() => import('./components/SeasonPage').then((m) => ({ default: m.SeasonPage })));
const MatchesPage = lazy(() => import('./components/MatchesPage').then((m) => ({ default: m.MatchesPage })));
const SessionPrint = lazy(() => import('./components/SessionPrint').then((m) => ({ default: m.SessionPrint })));

export default function App() {
  const route = useHashRoute();

  // Jugada compartida por link: se muestra sola, sin el resto de la app.
  if (route.name === 'shared-play') {
    return (
      <Suspense fallback={<p className="muted page-loading">Cargando la jugada…</p>}>
        <SharedPlayPage code={route.code} />
      </Suspense>
    );
  }

  return (
    <div className={`app route-${route.name}`}>
      <aside className="sidebar">
        <a className="brand" href="#/sesiones" aria-label="Voley Planner, inicio">
          <BallLogo />
          <span className="brand-text">
            <span className="brand-top">Voley</span>
            <span className="brand-bottom">Planner</span>
          </span>
        </a>
        <nav aria-label="Principal">
          <a className={route.name.startsWith('session') ? 'active' : ''} href="#/sesiones">
            <NavIcon d="M9 3h6v3H9zM7 4.5H5.5A1.5 1.5 0 0 0 4 6v14a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 20V6a1.5 1.5 0 0 0-1.5-1.5H17M8 11h8M8 15h5" />
            Sesiones
          </a>
          <a className={route.name === 'calendar' ? 'active' : ''} href="#/calendario">
            <NavIcon d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 2v4M16 2v4M3 10h18M7.5 14h2M11 14h2M14.5 14h2M7.5 17.5h2M11 17.5h2" />
            Calendario
          </a>
          <a className={route.name.startsWith('match') ? 'active' : ''} href="#/partidos">
            <NavIcon d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 3c-2.5 3-3 6-2.5 9.5M3.6 8.5c3.4-.6 6.4.4 8.9 3.5M12.5 12c-1.5 3.5-4.2 5.6-7.6 6.3M12.5 12c3.8.2 6.4 1.6 8.2 4.3M12.5 12c2.1-3.2 4.8-5 8-5.2" />
            Partidos
          </a>
          <a className={route.name === 'season' ? 'active' : ''} href="#/temporada">
            <NavIcon d="M3 12h4l3-8 4 16 3-8h4" />
            Temporada
          </a>
          <a className={route.name.startsWith('exercise') || route.name === 'library' ? 'active' : ''} href="#/ejercicios">
            <NavIcon d="M3 5h18v14H3zM12 5v14M7 5v14M17 5v14" />
            Ejercicios
          </a>
          <a className={route.name === 'roster' || route.name === 'player' ? 'active' : ''} href="#/plantel">
            <NavIcon d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M17.5 11.5a2.5 2.5 0 1 0 0-5M17 14.6c2.3.3 3.9 2 4.5 4.9" />
            Planteles
          </a>
          <a className={route.name === 'data' ? 'active' : ''} href="#/datos">
            <NavIcon d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            Tus datos
          </a>
        </nav>
        <Credits />
      </aside>
      <ImportDialog />
      <div className="app-body">
        {/* Tema y cuenta, siempre a la vista arriba a la derecha. */}
        <header className="topbar">
          <ThemeToggle />
          <AccountMenu />
        </header>
        <main>
          <WorkspaceBanner />
          <SharedInviteBanner />
          <DemoBanner />
          {/* La key reinicia el error al navegar a otra pantalla. */}
          <ErrorBoundary key={window.location.hash}>
            <Suspense fallback={<p className="muted page-loading">Cargando…</p>}>
              {route.name === 'sessions' && <SessionList />}
              {route.name === 'session' && <SessionEditor id={route.id} />}
              {route.name === 'session-print' && <SessionPrint id={route.id} />}
              {route.name === 'roster' && <RosterPage />}
              {route.name === 'player' && <PlayerPage id={route.id} />}
              {route.name === 'calendar' && <CalendarPage />}
              {route.name === 'season' && <SeasonPage />}
              {route.name === 'library' && <LibraryPage />}
              {route.name === 'data' && <DataPage />}
              {route.name === 'matches' && <MatchesPage />}
              {route.name === 'match' && <MatchPlanPage id={route.id} />}
              {route.name === 'match-stats' && <MatchStatsPage id={route.id} />}
              {route.name === 'exercises' && <ExerciseList />}
              {route.name === 'exercise' && <ExerciseEditor id={route.id} />}
            </Suspense>
          </ErrorBoundary>
        </main>
        <Credits footer />
      </div>
    </div>
  );
}

/** Créditos de la autora: al pie del menú (y al final de la página en el celular). */
function Credits({ footer = false }: { footer?: boolean }) {
  return (
    <p className={footer ? 'credits credits-footer' : 'credits'}>
      <span className="credits-label">Creada por</span>
      <span className="credits-name">Emma Cobos</span>
    </p>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
