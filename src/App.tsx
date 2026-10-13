import { ExerciseEditor } from './components/ExerciseEditor';
import { ExerciseList } from './components/ExerciseList';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RosterPage } from './components/RosterPage';
import { SessionEditor } from './components/SessionEditor';
import { SessionList } from './components/SessionList';
import { SessionPrint } from './components/SessionPrint';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const route = useHashRoute();

  return (
    <div className={`app route-${route.name}`}>
      <header className="topbar">
        <a className="brand" href="#/sesiones">
          🏐 Voley Planner
        </a>
        <nav>
          <a className={route.name.startsWith('session') ? 'active' : ''} href="#/sesiones">
            Sesiones
          </a>
          <a className={route.name.startsWith('exercise') ? 'active' : ''} href="#/ejercicios">
            Ejercicios
          </a>
          <a className={route.name === 'roster' ? 'active' : ''} href="#/plantel">
            Planteles
          </a>
        </nav>
      </header>
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
