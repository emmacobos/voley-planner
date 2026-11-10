import type { BestOf } from '../domain/types';

/** Partido al mejor de 3 o de 5 sets. */
export function BestOfPicker({ value, onChange }: { value: BestOf; onChange: (bestOf: BestOf) => void }) {
  return (
    <div className="segmented" role="group" aria-label="Cantidad de sets">
      {([5, 3] as BestOf[]).map((n) => (
        <button
          key={n}
          className={value === n ? 'active' : ''}
          aria-pressed={value === n}
          onClick={() => onChange(n)}
          title={n === 5 ? 'Gana quien gana 3 sets; el quinto, a 15' : 'Gana quien gana 2 sets; el tercero, a 15'}
        >
          A {n} sets
        </button>
      ))}
    </div>
  );
}
