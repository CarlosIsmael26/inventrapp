import type { ChangeEvent } from 'react'

import './FormField.scss'

type TextFieldProps = {
  id: string
  label: string
  value: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel'
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  autoComplete?: string
  onChange: (value: string) => void
}

export function TextField({
  id,
  label,
  value,
  placeholder,
  type = 'text',
  helperText,
  error,
  disabled = false,
  required = false,
  autoComplete,
  onChange,
}: TextFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  return (
    <div className={`form-control ${error ? 'form-control--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="form-control__required">*</span>}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        onChange={handleChange}
      />

      {error ? (
        <small className="form-control__error">{error}</small>
      ) : helperText ? (
        <small>{helperText}</small>
      ) : null}
    </div>
  )
}