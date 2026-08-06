import './Loader.scss'

type LoaderProps = {
  label?: string
  size?: 'small' | 'medium' | 'large'
}

export function Loader({
  label = 'Cargando...',
  size = 'medium',
}: LoaderProps) {
  return (
    <div className="ui-loader">
      <span
        className={`ui-loader__spinner ui-loader__spinner--${size}`}
      />

      {label && <span>{label}</span>}
    </div>
  )
}