import {
  Activity,
  Building2,
  Plus,
  ScrollText,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import './SuperAdminDashboardPage.scss'

export function SuperAdminDashboardPage() {
  return (
    <div className="admin-dashboard">
      <header className="dashboard-welcome">
        <div>
          <span>Resumen general</span>
          <h2>Hola, Carlos 👋</h2>
          <p>
            Aquí tienes una visión general del estado actual de Inventra.
          </p>
        </div>

        <Link to="/admin/negocios" className="primary-button">
          <Plus size={19} />
          Crear negocio
        </Link>
      </header>

      <section className="dashboard-stats">
        <article>
          <div className="dashboard-stat__icon">
            <Building2 size={22} />
          </div>
          <div>
            <span>Negocios registrados</span>
            <strong>0</strong>
            <small>Sin negocios creados</small>
          </div>
        </article>

        <article>
          <div className="dashboard-stat__icon">
            <Users size={22} />
          </div>
          <div>
            <span>Usuarios registrados</span>
            <strong>1</strong>
            <small>1 usuario activo</small>
          </div>
        </article>

        <article>
          <div className="dashboard-stat__icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <span>Super Admins</span>
            <strong>1</strong>
            <small>Acceso completo</small>
          </div>
        </article>

        <article>
          <div className="dashboard-stat__icon">
            <Activity size={22} />
          </div>
          <div>
            <span>Estado de la plataforma</span>
            <strong>Activa</strong>
            <small>Servicios operativos</small>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-panel">
          <header>
            <div>
              <h3>Actividad reciente</h3>
              <p>Últimas acciones registradas en Inventra.</p>
            </div>

            <Link to="/admin/auditoria">Ver auditoría</Link>
          </header>

          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-item__icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <strong>Perfil Super Admin configurado</strong>
                <span>Carlos obtuvo acceso administrativo global.</span>
              </div>

              <time>Hoy</time>
            </div>

            <div className="activity-item">
              <div className="activity-item__icon">
                <UserPlus size={18} />
              </div>

              <div>
                <strong>Usuario creado</strong>
                <span>Se registró el primer usuario de Inventra.</span>
              </div>

              <time>Hoy</time>
            </div>
          </div>
        </article>

        <article className="dashboard-panel quick-actions">
          <header>
            <div>
              <h3>Acciones rápidas</h3>
              <p>Accesos directos a las tareas principales.</p>
            </div>
          </header>

          <Link to="/admin/negocios">
            <Building2 size={20} />
            <div>
              <strong>Crear negocio</strong>
              <span>Registra una nueva empresa.</span>
            </div>
          </Link>

          <Link to="/admin/usuarios">
            <UserPlus size={20} />
            <div>
              <strong>Crear usuario</strong>
              <span>Agrega usuarios y asigna roles.</span>
            </div>
          </Link>

          <Link to="/admin/auditoria">
            <ScrollText size={20} />
            <div>
              <strong>Ver auditoría</strong>
              <span>Consulta las acciones del sistema.</span>
            </div>
          </Link>
        </article>
      </section>
    </div>
  )
}