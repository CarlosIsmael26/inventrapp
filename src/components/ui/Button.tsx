import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

import './Button.scss'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'danger'
  | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`ui-button ui-button--${variant} ${className}`.trim()}
    >
      {loading ? (
        <span className="ui-button__spinner" />
      ) : (
        icon
      )}

      <span>{loading ? 'Procesando...' : children}</span>
    </button>
  )
}