import { AccountMenu } from './components/AccountMenu';
import { BallLogo } from './components/BallLogo';
import { CalendarPage } from './components/CalendarPage';
import { DataPage } from './components/DataPage';
import { DemoBanner } from './components/DemoBanner';
import { ExerciseEditor } from './components/ExerciseEditor';
import { ExerciseList } from './components/ExerciseList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ImportDialog } from './components/ImportDialog';
import { LibraryPage } from './components/LibraryPage';
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
          <a className={route.name.startsWith('exercise') || route.name === 'library' ? 'active' : ''} href="#/ejercicios">
            <NavIcon d="M3 5h18v14H3zM12 5v14M7 5v14M17 5v14" />
            Ejercicios
          </a>
          <a className={route.name === 'roster' ? 'active' : ''} href="#/plantel">
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
          <DemoBanner />
          {/* La key reinicia el error al navegar a otra pantalla. */}
          <ErrorBoundary key={window.location.hash}>
            {route.name === 'sessions' && <SessionList />}
            {route.name === 'session' && <SessionEditor id={route.id} />}
            {route.name === 'session-print' && <SessionPrint id={route.id} />}
            {route.name === 'roster' && <RosterPage />}
            {route.name === 'calendar' && <CalendarPage />}
            {route.name === 'library' && <LibraryPage />}
            {route.name === 'data' && <DataPage />}
            {route.name === 'exercises' && <ExerciseList />}
            {route.name === 'exercise' && <ExerciseEditor id={route.id} />}
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
