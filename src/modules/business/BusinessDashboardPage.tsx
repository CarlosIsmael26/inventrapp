import { Boxes, Building2, FileText, RefreshCw, ShoppingCart } from 'lucide-react'

import { SelectField } from '../../components/forms'
import { Button, Card, EmptyState, Loader } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'

import './BusinessDashboardPage.scss'

const roleLabels: Record<string, string> = { owner: 'Propietario', admin: 'Administrador', cashier: 'Cajero', seller: 'Vendedor', warehouse: 'Bodega', viewer: 'Solo lectura' }

export function BusinessDashboardPage() {
  const { memberships, currentMembership, loading, error, selectBusiness, reload } = useBusiness()
  if (loading) return <main className="business-dashboard business-dashboard--center"><Loader label="Preparando tu negocio..." /></main>
  if (error) return <main className="business-dashboard business-dashboard--center"><EmptyState title="No pudimos cargar tu acceso" description={error} /><Button icon={<RefreshCw size={17} />} onClick={() => void reload()}>Reintentar</Button></main>
  if (!currentMembership) return <main className="business-dashboard business-dashboard--center"><EmptyState title="Aún no tienes un negocio asignado" description="El Super Admin debe agregarte como miembro de un negocio antes de que puedas usar Inventra." /></main>

  return (
    <main className="business-dashboard">
      <header className="business-dashboard__header">
        <div><span>Mi negocio</span><h1>{currentMembership.business.name}</h1><p>Bienvenido a tu espacio de trabajo en Inventra.</p></div>
        {memberships.length > 1 && <SelectField id="active-business" label="Negocio activo" value={currentMembership.id} options={memberships.map((item) => ({ value: item.id, label: item.business.name }))} onChange={selectBusiness} />}
      </header>
      <section className="business-dashboard__summary">
        <Card><Building2 size={23} /><div><small>Negocio</small><strong>{currentMembership.business.name}</strong></div></Card>
        <Card><Boxes size={23} /><div><small>Tu rol</small><strong>{roleLabels[currentMembership.role]}</strong></div></Card>
        <Card><FileText size={23} /><div><small>Moneda</small><strong>{currentMembership.business.currency}</strong></div></Card>
      </section>
      <section className="business-dashboard__welcome">
        <ShoppingCart size={34} />
        <div><h2>Todo listo para comenzar</h2><p>Tu acceso está correctamente vinculado. Los próximos módulos de inventario, ventas y facturación usarán este negocio como contexto y mantendrán sus datos separados.</p></div>
      </section>
    </main>
  )
}
