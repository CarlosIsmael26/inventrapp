import {
  BarChart3, Boxes, Building2, ChevronDown, CircleDollarSign, ClipboardList,
  LayoutDashboard, LogOut, Menu, PackagePlus, Settings, ShoppingCart,
  Store, Truck, UserCog, Users, WalletCards, X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { useBusiness } from '../../hooks/useBusiness'
import { logout } from '../../services/authService'
import type { BusinessRole } from '../../types/membership'
import { Button, EmptyState, Loader } from '../ui'

import './BusinessLayout.scss'

type MenuItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: BusinessRole[] }
type MenuGroup = { title: string; items: MenuItem[] }

const operationalRoles: BusinessRole[] = ['owner', 'admin', 'cashier', 'seller', 'warehouse', 'viewer']
const managementRoles: BusinessRole[] = ['owner', 'admin']
const salesRoles: BusinessRole[] = ['owner', 'admin', 'cashier', 'seller']
const stockRoles: BusinessRole[] = ['owner', 'admin', 'warehouse']
const menuGroups: MenuGroup[] = [
  { title: 'Principal', items: [{ to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: operationalRoles }] },
  { title: 'Operación', items: [
    { to: '/app/inventario', label: 'Inventario', icon: Boxes, roles: [...managementRoles, 'warehouse'] },
    { to: '/app/compras', label: 'Compras', icon: PackagePlus, roles: stockRoles },
    { to: '/app/pos', label: 'Ventas y POS', icon: ShoppingCart, roles: salesRoles },
    { to: '/app/cotizaciones', label: 'Cotizaciones', icon: ClipboardList, roles: [...managementRoles, 'seller'] },
  ] },
  { title: 'Contactos', items: [
    { to: '/app/clientes', label: 'Clientes', icon: Users, roles: salesRoles },
    { to: '/app/proveedores', label: 'Proveedores', icon: Truck, roles: stockRoles },
  ] },
  { title: 'Finanzas', items: [
    { to: '/app/caja', label: 'Caja', icon: WalletCards, roles: [...managementRoles, 'cashier'] },
    { to: '/app/creditos', label: 'Créditos', icon: CircleDollarSign, roles: managementRoles },
    { to: '/app/reportes', label: 'Reportes', icon: BarChart3, roles: [...managementRoles, 'viewer'] },
  ] },
  { title: 'Negocio', items: [{ to: '/app/equipo', label: 'Equipo', icon: UserCog, roles: managementRoles }, { to: '/app/configuracion', label: 'Configuración', icon: Settings, roles: managementRoles }] },
]
const pageTitles: Record<string, string> = { '/app': 'Dashboard', '/app/inventario': 'Inventario', '/app/compras': 'Compras', '/app/pos': 'Ventas y POS', '/app/cotizaciones': 'Cotizaciones', '/app/clientes': 'Clientes', '/app/proveedores': 'Proveedores', '/app/caja': 'Caja', '/app/creditos': 'Créditos', '/app/reportes': 'Reportes', '/app/equipo': 'Equipo', '/app/configuracion': 'Configuración' }
const roleLabels: Record<BusinessRole, string> = { owner: 'Propietario', admin: 'Administrador', cashier: 'Cajero', seller: 'Vendedor', warehouse: 'Bodega', viewer: 'Solo lectura' }

export function BusinessLayout() {
  const { profile } = useAuth()
  const { memberships, currentMembership, businessUser, loading, error, selectBusiness, reload } = useBusiness()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const visibleGroups = useMemo(() => menuGroups.map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || (currentMembership && item.roles.includes(currentMembership.role))) })).filter((group) => group.items.length), [currentMembership])

  async function handleLogout() { await logout(); navigate('/login', { replace: true }) }
  if (loading) return <div className="business-gate"><Loader label="Preparando tu espacio de trabajo..." /></div>
  if (error) return <div className="business-gate"><EmptyState title="No pudimos cargar tu negocio" description={error} /><Button onClick={() => void reload()}>Reintentar</Button></div>
  if (!currentMembership) return <div className="business-gate"><EmptyState title="Aún no tienes un negocio asignado" description="Solicita al Super Admin que te agregue como miembro de un negocio." /><Button variant="secondary" icon={<LogOut size={17} />} onClick={() => void handleLogout()}>Cerrar sesión</Button></div>

  return (
    <div className="business-layout">
      {mobileOpen && <button className="business-sidebar__backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className={`business-sidebar ${mobileOpen ? 'business-sidebar--open' : ''}`}>
        <div className="business-brand"><div className="business-brand__logo">I</div><div><strong>Inventra</strong><span>Gestión comercial</span></div><button aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        <div className="business-switcher"><Store size={18} /><div><small>Negocio activo</small>{memberships.length > 1 ? <select value={currentMembership.id} onChange={(event) => { selectBusiness(event.target.value); navigate('/app'); setMobileOpen(false) }}>{memberships.map((item) => <option key={item.id} value={item.id}>{item.business.name}</option>)}</select> : <strong>{currentMembership.business.name}</strong>}</div><ChevronDown size={16} /></div>
        <nav className="business-menu">{visibleGroups.map((group) => <div key={group.title}><span className="business-menu__section">{group.title}</span>{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/app'} onClick={() => setMobileOpen(false)}><item.icon size={19} /><span>{item.label}</span></NavLink>)}</div>)}</nav>
        <div className="business-sidebar__footer"><div className="business-profile"><div className="business-profile__avatar">{(businessUser?.displayName || profile?.displayName || 'U').charAt(0).toUpperCase()}</div><div><strong>{businessUser?.displayName || profile?.displayName || 'Usuario'}</strong><span>{roleLabels[currentMembership.role]}</span></div></div><button className="business-logout" onClick={() => void handleLogout()}><LogOut size={18} /><span>Cerrar sesión</span></button></div>
      </aside>
      <section className="business-content">
        <header className="business-header"><button className="business-header__menu" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}><Menu size={22} /></button><div><h1>{pageTitles[location.pathname] ?? 'Inventra'}</h1><p>{currentMembership.business.name}</p></div><div className="business-header__identity"><Building2 size={20} /><div><strong>{currentMembership.business.name}</strong><span>{roleLabels[currentMembership.role]}</span></div></div></header>
        <div className="business-page"><Outlet /></div>
      </section>
    </div>
  )
}
