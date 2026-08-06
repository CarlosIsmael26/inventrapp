import { useState } from 'react'
import { Plus, Search } from 'lucide-react'

import { Button } from '../../components/ui'

import { UserDrawer } from './users/UserDrawer'
import { UserStats } from './users/UserStats'
import { UsersTable } from './users/UsersTable'
import {
  useUsers,
  type UserStatusFilter,
} from './users/useUsers'

import './UsersPage.scss'

export function UsersPage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const {
    filteredUsers,
    loading,
    error,
    search,
    statusFilter,
    totalUsers,
    activeUsers,
    blockedUsers,
    superAdmins,
    setSearch,
    setStatusFilter,
    reloadUsers,
  } = useUsers()

  return (
    <div className="users-page">
      <header className="users-page__header">
        <div>
          <span>Administración</span>

          <h2>Usuarios</h2>

          <p>
            Crea usuarios, asigna roles y controla su
            acceso a Inventra.
          </p>
        </div>

        <Button
          type="button"
          icon={<Plus size={19} />}
          onClick={() => setIsDrawerOpen(true)}
        >
          Crear usuario
        </Button>
      </header>

      <UserStats
        totalUsers={totalUsers}
        activeUsers={activeUsers}
        superAdmins={superAdmins}
        blockedUsers={blockedUsers}
      />

      <section className="users-panel">
        <div className="users-toolbar">
          <div className="users-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Buscar por nombre, correo o negocio..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as UserStatusFilter,
              )
            }
          >
            <option value="all">
              Todos los estados
            </option>

            <option value="active">Activos</option>

            <option value="blocked">Bloqueados</option>
          </select>
        </div>

        {error && (
          <div className="users-error">
            <p>{error}</p>

            <Button
              type="button"
              variant="secondary"
              onClick={() => void reloadUsers()}
            >
              Reintentar
            </Button>
          </div>
        )}

        {!error && (
          <UsersTable
            users={filteredUsers}
            loading={loading}
          />
        )}
      </section>

      <UserDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSaved={() => void reloadUsers()}
      />
    </div>
  )
}