import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { logout } from '../services/authService'
import './SuperAdminLayout.scss'

export function SuperAdminLayout() {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__logo">I</div>

          <div>
            <strong>Inventra</strong>
            <span>Administración global</span>
          </div>
        </div>

        <nav className="admin-menu">
          <span className="admin-menu__section">Principal</span>

          <NavLink to="/admin" end>
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          <span className="admin-menu__section">Gestión</span>

          <NavLink to="/admin/negocios">
            <Building2 size={19} />
            <span>Negocios</span>
          </NavLink>

          <NavLink to="/admin/usuarios">
            <Users size={19} />
            <span>Usuarios</span>
          </NavLink>

          <NavLink to="/admin/roles">
            <ShieldCheck size={19} />
            <span>Roles y permisos</span>
          </NavLink>

          <span className="admin-menu__section">Sistema</span>

          <NavLink to="/admin/auditoria">
            <ScrollText size={19} />
            <span>Auditoría</span>
          </NavLink>

          <NavLink to="/admin/configuracion">
            <Settings size={19} />
            <span>Configuración</span>
          </NavLink>
        </nav>

        <div className="admin-sidebar__footer">
          <button type="button" className="admin-profile">
            <div className="admin-profile__avatar">C</div>

            <div className="admin-profile__info">
              <strong>Carlos</strong>
              <span>Super Admin</span>
            </div>

            <ChevronDown size={17} />
          </button>

          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div>
            <h1>Panel Super Admin</h1>
            <p>Control general de la plataforma Inventra</p>
          </div>
        </header>

        <main className="admin-page">
          <Outlet />
        </main>
      </section>
    </div>
  )
}