import { PRESET_PATTERNS } from '../patterns';
import type { PatternType } from '../types/tile';

interface Props {
  value: PatternType;
  onChange: (type: PatternType) => void;
}

export default function PatternSelector({ value, onChange }: Props) {
  const entries = [
    ...PRESET_PATTERNS.map(({ id, label }) => ({ id, label })),
    { id: 'custom', label: 'オリジナル' },
  ];
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold tracking-widest">パターン</h2>
      <div className="grid grid-cols-2 gap-2">
        {entries.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`border border-black px-2 py-2 text-sm transition-colors ${
              value === id ? 'bg-black text-white' : 'bg-white text-black hover:bg-neutral-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
