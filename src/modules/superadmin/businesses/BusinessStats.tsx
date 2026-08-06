import { Building2, CirclePause, Shapes, Store } from 'lucide-react'

type Props = { total: number; active: number; suspended: number; types: number }

export function BusinessStats({ total, active, suspended, types }: Props) {
  const items = [
    { label: 'Negocios registrados', value: total, icon: <Building2 size={21} /> },
    { label: 'Negocios activos', value: active, icon: <Store size={21} /> },
    { label: 'Negocios suspendidos', value: suspended, icon: <CirclePause size={21} /> },
    { label: 'Tipos de negocio', value: types, icon: <Shapes size={21} /> },
  ]
  return (
    <section className="businesses-stats">
      {items.map((item) => (
        <article key={item.label}>
          <div className="business-stat__icon">{item.icon}</div>
          <div><span>{item.label}</span><strong>{item.value}</strong></div>
        </article>
      ))}
    </section>
  )
}
