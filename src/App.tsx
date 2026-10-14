import { AccountMenu } from './components/AccountMenu';
import { ExerciseEditor } from './components/ExerciseEditor';
import { ExerciseList } from './components/ExerciseList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportDialog } from './components/ImportDialog';
import { RosterPage } from './components/RosterPage';
import { SessionEditor } from './components/SessionEditor';
import { SessionList } from './components/SessionList';
import { SessionPrint } from './components/SessionPrint';
import { ThemeToggle } from './components/ThemeToggle';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const route = useHashRoute();

  return (
    <div className={`app route-${route.name}`}>
      <aside className="sidebar">
        <a className="brand" href="#/sesiones" aria-label="Voley Planner, inicio">
          <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
            <circle cx="17" cy="17" r="15" fill="#F5B82E" />
            <path
              d="M17 2c-3 6-3 14 2 20M4 11c7 1 13 5 15 11M30 12c-6 1-11 5-11 10M17 32c2-4 6-7 12-8"
              fill="none"
              stroke="#0E1A2B"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          <span className="brand-text">
            <span className="brand-top">Voley</span>
            <span className="brand-bottom">Planner</span>
          </span>
        </a>
        <nav aria-label="Principal">
          <a className={route.name.startsWith('session') ? 'active' : ''} href="#/sesiones">
            <NavIcon d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 2v4M16 2v4M3 10h18" />
            Sesiones
          </a>
          <a className={route.name.startsWith('exercise') ? 'active' : ''} href="#/ejercicios">
            <NavIcon d="M3 5h18v14H3zM12 5v14M7 5v14M17 5v14" />
            Ejercicios
          </a>
          <a className={route.name === 'roster' ? 'active' : ''} href="#/plantel">
            <NavIcon d="M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M17.5 11.5a2.5 2.5 0 1 0 0-5M17 14.6c2.3.3 3.9 2 4.5 4.9" />
            Planteles
          </a>
        </nav>
        <div className="sidebar-bottom">
          <ThemeToggle />
          <AccountMenu />
        </div>
      </aside>
      <ImportDialog />
      <main>
        {/* La key reinicia el error al navegar a otra pantalla. */}
        <ErrorBoundary key={window.location.hash}>
          {route.name === 'sessions' && <SessionList />}
          {route.name === 'session' && <SessionEditor id={route.id} />}
          {route.name === 'session-print' && <SessionPrint id={route.id} />}
          {route.name === 'roster' && <RosterPage />}
          {route.name === 'exercises' && <ExerciseList />}
          {route.name === 'exercise' && <ExerciseEditor id={route.id} />}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
