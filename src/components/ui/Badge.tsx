import type { ReactNode } from 'react'

import './Badge.scss'

type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
}

export function Badge({
  children,
  variant = 'neutral',
}: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${variant}`}>
      {children}
    </span>
  )
}