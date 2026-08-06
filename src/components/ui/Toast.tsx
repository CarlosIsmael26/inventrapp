import {
  AlertCircle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'

import { IconButton } from './IconButton'
import './Toast.scss'

export type ToastVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'

export type ToastItem = {
  id: string
  title: string
  description?: string
  variant: ToastVariant
}

type ToastProps = {
  toast: ToastItem
  onClose: (id: string) => void
}

const toastIcons = {
  success: <CheckCircle2 size={21} />,
  error: <AlertCircle size={21} />,
  warning: <AlertCircle size={21} />,
  info: <Info size={21} />,
}

export function Toast({
  toast,
  onClose,
}: ToastProps) {
  return (
    <article
      className={`ui-toast ui-toast--${toast.variant}`}
      role="status"
    >
      <div className="ui-toast__icon">
        {toastIcons[toast.variant]}
      </div>

      <div className="ui-toast__content">
        <strong>{toast.title}</strong>

        {toast.description && (
          <p>{toast.description}</p>
        )}
      </div>

      <IconButton
        type="button"
        icon={<X size={17} />}
        label="Cerrar notificación"
        onClick={() => onClose(toast.id)}
      />
    </article>
  )
}