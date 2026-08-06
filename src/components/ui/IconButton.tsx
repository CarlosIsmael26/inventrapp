import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'

import './IconButton.scss'

type IconButtonVariant =
  | 'default'
  | 'primary'
  | 'danger'

type IconButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode
    label: string
    variant?: IconButtonVariant
  }

export function IconButton({
  icon,
  label,
  variant = 'default',
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`ui-icon-button ui-icon-button--${variant} ${className}`.trim()}
    >
      {icon}
    </button>
  )
}