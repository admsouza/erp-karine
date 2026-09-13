import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export function Select({ label, options, error, id, className = '', ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className={className}>
      <label className="field-label" htmlFor={selectId}>
        {label}
      </label>
      <select {...props} id={selectId} className="field-input">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
