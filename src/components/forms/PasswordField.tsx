import { Eye, EyeOff } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'

import './FormField.scss'

type PasswordFieldProps = {
  id: string
  label: string
  value: string
  placeholder?: string
  helperText?: string
  error?: string
  disabled?: boolean
  required?: boolean
  autoComplete?: string
  onChange: (value: string) => void
}

export function PasswordField({
  id,
  label,
  value,
  placeholder,
  helperText,
  error,
  disabled = false,
  required = false,
  autoComplete = 'new-password',
  onChange,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  return (
    <div className={`form-control ${error ? 'form-control--error' : ''}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="form-control__required">*</span>}
      </label>

      <div className="form-control__password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          onChange={handleChange}
        />

        <button
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {error ? (
        <small className="form-control__error">{error}</small>
      ) : helperText ? (
        <small>{helperText}</small>
      ) : null}
    </div>
  )
}