import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Evita que un error deje la página en blanco: muestra un aviso y deja seguir. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-box">
        <h2>Algo salió mal</h2>
        <p className="muted">Tus datos están guardados. Probá volver a la pantalla anterior.</p>
        <p>
          <button onClick={() => this.setState({ error: null })}>Reintentar</button>{' '}
          <a href="#/ejercicios">Ir a la biblioteca</a>
        </p>
        <pre>{this.state.error.message}</pre>
      </div>
    );
  }
}
