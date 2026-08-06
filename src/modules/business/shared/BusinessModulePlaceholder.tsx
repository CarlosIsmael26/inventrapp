import type { LucideIcon } from 'lucide-react'
import { Card } from '../../../components/ui'
import './BusinessModulePlaceholder.scss'

export function BusinessModulePlaceholder({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return <section className="module-placeholder"><Card><div className="module-placeholder__icon"><Icon size={28} /></div><span>Próximo módulo</span><h2>{title}</h2><p>{description}</p></Card></section>
}
