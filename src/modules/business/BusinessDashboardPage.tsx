import { Boxes, Building2, FileText, ShoppingCart } from 'lucide-react'

import { Card } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'

import './BusinessDashboardPage.scss'

const roleLabels: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', cashier: 'Cajero', seller: 'Vendedor', warehouse: 'Bodega', viewer: 'Solo lectura' }

export function BusinessDashboardPage() {
  const { currentMembership } = useBusiness()
  if (!currentMembership) return null

  return (
    <main className="business-dashboard">
      <header className="business-dashboard__header">
        <div><span>Mi negocio</span><h1>{currentMembership.business.name}</h1><p>Bienvenido a tu espacio de trabajo en Inventra.</p></div>
      </header>
      <section className="business-dashboard__summary">
        <Card><Building2 size={23} /><div><small>Negocio</small><strong>{currentMembership.business.name}</strong></div></Card>
        <Card><Boxes size={23} /><div><small>Tu rol</small><strong>{roleLabels[currentMembership.role]}</strong></div></Card>
        <Card><FileText size={23} /><div><small>Moneda</small><strong>{currentMembership.business.currency}</strong></div></Card>
      </section>
      <section className="business-dashboard__welcome">
        <ShoppingCart size={34} />
        <div><h2>Todo listo para comenzar</h2><p>Tu acceso está correctamente vinculado. Los módulos de inventario, ventas y facturación usarán este negocio como contexto y mantendrán sus datos separados.</p></div>
      </section>
    </main>
  )
}
