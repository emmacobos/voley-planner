import { ExerciseEditor } from './components/ExerciseEditor';
import { ExerciseList } from './components/ExerciseList';
import { RosterPage } from './components/RosterPage';
import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const route = useHashRoute();

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/ejercicios">
          🏐 Voley Planner
        </a>
        <nav>
          <a className={route.name !== 'roster' ? 'active' : ''} href="#/ejercicios">
            Ejercicios
          </a>
          <a className={route.name === 'roster' ? 'active' : ''} href="#/plantel">
            Plantel
          </a>
        </nav>
      </header>
      <main>
        {route.name === 'roster' && <RosterPage />}
        {route.name === 'exercises' && <ExerciseList />}
        {route.name === 'exercise' && <ExerciseEditor id={route.id} />}
      </main>
    </div>
  );
}
