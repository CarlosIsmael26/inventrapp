import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import './Drawer.scss'

type DrawerProps = {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}

export function Drawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: DrawerProps) {
  if (!open) {
    return null
  }

  return (
    <div className="drawer">
      <button
        type="button"
        className="drawer__backdrop"
        aria-label="Cerrar panel"
        onClick={onClose}
      />

      <aside
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        <header className="drawer__header">
          <div>
            <h2 id="drawer-title">{title}</h2>

            {description && <p>{description}</p>}
          </div>

          <button
            type="button"
            className="drawer__close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>

        <div className="drawer__content">
          {children}
        </div>

        {footer && (
          <footer className="drawer__footer">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}