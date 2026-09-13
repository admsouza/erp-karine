import { useId, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

/** Campo de texto padrão dos formulários (label + erro + dica). */
export function Input({ label, error, hint, id, className = '', ...props }: InputProps) {
  // useId garante id estável e label ligado ao campo mesmo sem `name`/`id`.
  const gerado = useId();
  const inputId = id ?? props.name ?? gerado;

  return (
    <div className={className}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...props}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`field-input ${error ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-100' : ''}`.trim()}
      />
      {hint && !error ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
