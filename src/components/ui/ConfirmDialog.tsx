import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

import { Button } from './Button'
import './ConfirmDialog.scss'

type ConfirmDialogVariant =
  | 'danger'
  | 'warning'
  | 'info'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmDialogVariant
  loading?: boolean
  icon?: ReactNode
  onConfirm: () => void
  onClose: () => void
}

const variantIcons = {
  danger: <ShieldAlert size={24} />,
  warning: <AlertTriangle size={24} />,
  info: <Info size={24} />,
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  loading = false,
  icon,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, loading, onClose])

  if (!open) {
    return null
  }

  function handleBackdropClick() {
    if (!loading) {
      onClose()
    }
  }

  function handleDialogClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    event.stopPropagation()
  }

  return (
    <div
      className="confirm-dialog__backdrop"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onMouseDown={handleDialogClick}
      >
        <div
          className={`confirm-dialog__icon confirm-dialog__icon--${variant}`}
        >
          {icon ?? variantIcons[variant]}
        </div>

        <div className="confirm-dialog__content">
          <h2 id="confirm-dialog-title">
            {title}
          </h2>

          <p id="confirm-dialog-description">
            {description}
          </p>
        </div>

        <div className="confirm-dialog__actions">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </Button>

          <Button
            type="button"
            variant={
              variant === 'danger'
                ? 'danger'
                : 'primary'
            }
            loading={loading}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}