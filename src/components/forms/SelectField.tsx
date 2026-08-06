import type { ChangeEvent } from 'react'

import './FormField.scss'

export type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  id: string
  label: string
  value: string
  options: SelectOption[]
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  onChange: (value: string) => void
}

export function SelectField({
  id,
  label,
  value,
  options,
  helperText,
  error,
  disabled = false,
  required = false,
  onChange,
}: SelectFieldProps) {
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    onChange(event.target.value)
  }

  return (
    <div className={`form-control ${error ? 'form-control--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="form-control__required">*</span>}
      </label>

      <select
        id={id}
        value={value}
        disabled={disabled}
        required={required}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <small className="form-control__error">{error}</small>
      ) : helperText ? (
        <small>{helperText}</small>
      ) : null}
    </div>
  )
}