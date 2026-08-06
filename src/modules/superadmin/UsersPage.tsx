import { Plus, Search } from 'lucide-react'
import { useState } from 'react'

import { Button, ConfirmDialog, useToast } from '../../components/ui'
import { useAuth } from '../../hooks/useAuth'
import {
  deletePlatformUser,
  generateUserPasswordResetLink,
  updatePlatformUser,
} from '../../services'
import type { PlatformUser } from '../../types/user'
import { UserDrawer } from './users/UserDrawer'
import { UserStats } from './users/UserStats'
import { UsersTable } from './users/UsersTable'
import { useUsers, type UserStatusFilter } from './users/useUsers'

import './UsersPage.scss'

type ConfirmAction =
  | { type: 'toggle_status'; user: PlatformUser }
  | { type: 'reset_password'; user: PlatformUser }
  | { type: 'delete'; user: PlatformUser }

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)
  const [processingAction, setProcessingAction] = useState(false)

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

  function openCreateDrawer() {
    setEditingUser(null)
    setIsDrawerOpen(true)
  }

  function openEditDrawer(user: PlatformUser) {
    setEditingUser(user)
    setIsDrawerOpen(true)
  }

  function closeDrawer() {
    setIsDrawerOpen(false)
    setEditingUser(null)
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return

    try {
      setProcessingAction(true)
      const { user } = confirmAction

      if (confirmAction.type === 'toggle_status') {
        const nextStatus = user.status === 'active' ? 'blocked' : 'active'
        const message = await updatePlatformUser({
          uid: user.uid,
          displayName: user.displayName,
          platformRole: user.platformRole,
          status: nextStatus,
        })
        toast.success(nextStatus === 'active' ? 'Usuario activado' : 'Usuario bloqueado', message)
        await reloadUsers()
      }

      if (confirmAction.type === 'reset_password') {
        const result = await generateUserPasswordResetLink(user.uid)
        await navigator.clipboard.writeText(result.resetLink)
        toast.success('Enlace copiado', 'El enlace de restablecimiento está listo para enviarlo al usuario.')
      }

      if (confirmAction.type === 'delete') {
        const message = await deletePlatformUser(user.uid)
        toast.success('Usuario eliminado', message)
        await reloadUsers()
      }

      setConfirmAction(null)
    } catch (actionError) {
      const message =
        actionError instanceof Error
          ? actionError.message
          : 'No fue posible completar la operación.'
      toast.error('Operación no completada', message)
    } finally {
      setProcessingAction(false)
    }
  }

  const confirmDialog = (() => {
    if (!confirmAction) return null

    const { user } = confirmAction

    if (confirmAction.type === 'delete') {
      return {
        title: 'Eliminar usuario',
        description: `Se eliminará permanentemente a ${user.displayName} de Authentication y Firestore. Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar usuario',
        variant: 'danger' as const,
      }
    }

    if (confirmAction.type === 'reset_password') {
      return {
        title: 'Generar enlace de restablecimiento',
        description: `Se generará un enlace seguro para ${user.email} y se copiará al portapapeles.`,
        confirmText: 'Generar enlace',
        variant: 'info' as const,
      }
    }

    const blocking = user.status === 'active'
    return {
      title: blocking ? 'Bloquear usuario' : 'Activar usuario',
      description: blocking
        ? `${user.displayName} no podrá iniciar sesión hasta que vuelvas a activarlo.`
        : `${user.displayName} recuperará el acceso a Inventrapp.`,
      confirmText: blocking ? 'Bloquear' : 'Activar',
      variant: blocking ? ('warning' as const) : ('info' as const),
    }
  })()

  return (
    <div className="users-page">
      <header className="users-page__header">
        <div>
          <span>Administración</span>
          <h2>Usuarios</h2>
          <p>Crea usuarios, asigna roles y controla su acceso a Inventra.</p>
        </div>
        <Button type="button" icon={<Plus size={19} />} onClick={openCreateDrawer}>
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
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as UserStatusFilter)}
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="blocked">Bloqueados</option>
          </select>
        </div>

        {error ? (
          <div className="users-error">
            <p>{error}</p>
            <Button type="button" variant="secondary" onClick={() => void reloadUsers()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <UsersTable
            users={filteredUsers}
            loading={loading}
            currentUserUid={currentUser?.uid}
            onEdit={openEditDrawer}
            onToggleStatus={(user) => setConfirmAction({ type: 'toggle_status', user })}
            onResetPassword={(user) => setConfirmAction({ type: 'reset_password', user })}
            onDelete={(user) => setConfirmAction({ type: 'delete', user })}
          />
        )}
      </section>

      <UserDrawer
        open={isDrawerOpen}
        user={editingUser}
        onClose={closeDrawer}
        onSaved={() => void reloadUsers()}
      />

      {confirmDialog && (
        <ConfirmDialog
          open
          {...confirmDialog}
          loading={processingAction}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => void handleConfirmedAction()}
        />
      )}
    </div>
  )
}
