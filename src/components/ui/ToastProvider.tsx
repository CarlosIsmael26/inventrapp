import {
  createContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  Toast,
  type ToastItem,
  type ToastVariant,
} from './Toast'

type ShowToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => void
  success: (
    title: string,
    description?: string,
  ) => void
  error: (
    title: string,
    description?: string,
  ) => void
  warning: (
    title: string,
    description?: string,
  ) => void
  info: (
    title: string,
    description?: string,
  ) => void
}

export const ToastContext =
  createContext<ToastContextValue | null>(null)

type ToastProviderProps = {
  children: ReactNode
}

export function ToastProvider({
  children,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((current) =>
      current.filter((toast) => toast.id !== id),
    )
  }, [])

  const showToast = useCallback(
    ({
      title,
      description,
      variant = 'info',
      duration = 4000,
    }: ShowToastOptions) => {
      const id = crypto.randomUUID()

      setToasts((current) => [
        ...current,
        {
          id,
          title,
          description,
          variant,
        },
      ])

      window.setTimeout(() => {
        removeToast(id)
      }, duration)
    },
    [removeToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,

      success: (title, description) =>
        showToast({
          title,
          description,
          variant: 'success',
        }),

      error: (title, description) =>
        showToast({
          title,
          description,
          variant: 'error',
        }),

      warning: (title, description) =>
        showToast({
          title,
          description,
          variant: 'warning',
        }),

      info: (title, description) =>
        showToast({
          title,
          description,
          variant: 'info',
        }),
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="ui-toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}