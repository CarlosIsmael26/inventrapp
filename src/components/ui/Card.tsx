import type { HTMLAttributes, ReactNode } from 'react'

import './Card.scss'

type CardProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  title?: string
  description?: string
  action?: ReactNode
}

export function Card({
  children,
  title,
  description,
  action,
  className = '',
  ...props
}: CardProps) {
  return (
    <section
      {...props}
      className={`ui-card ${className}`.trim()}
    >
      {(title || description || action) && (
        <header className="ui-card__header">
          <div>
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </div>

          {action && (
            <div className="ui-card__action">{action}</div>
          )}
        </header>
      )}

      <div className="ui-card__content">{children}</div>
    </section>
  )
}