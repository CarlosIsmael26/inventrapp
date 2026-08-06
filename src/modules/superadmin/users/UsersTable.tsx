import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  ShieldOff,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DataTable, type DataTableColumn } from '../../../components/data-table'
import { Badge, EmptyState, Loader } from '../../../components/ui'
import type { PlatformUser } from '../../../types/user'

type UsersTableProps = {
  users: PlatformUser[]
  loading: boolean
  currentUserUid?: string
  onEdit: (user: PlatformUser) => void
  onToggleStatus: (user: PlatformUser) => void
  onResetPassword: (user: PlatformUser) => void
  onDelete: (user: PlatformUser) => void
}

function getPlatformRoleLabel(platformRole: PlatformUser['platformRole']) {
  if (platformRole === 'super_admin') return 'Super Admin'
  if (platformRole === 'support') return 'Soporte'
  return 'Usuario'
}

export function UsersTable({
  users,
  loading,
  currentUserUid,
  onEdit,
  onToggleStatus,
  onResetPassword,
  onDelete,
}: UsersTableProps) {
  const [openMenuUid, setOpenMenuUid] = useState<string | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setOpenMenuUid(null)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  function runAction(action: () => void) {
    setOpenMenuUid(null)
    action()
  }

  const columns = useMemo<DataTableColumn<PlatformUser>[]>(
    () => [
      {
        key: 'user',
        header: 'Usuario',
        render: (user) => (
          <div className="user-cell">
            <div className="user-cell__avatar">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{user.displayName}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'platformRole',
        header: 'Rol de plataforma',
        render: (user) => getPlatformRoleLabel(user.platformRole),
      },
      {
        key: 'business',
        header: 'Negocio',
        render: (user) => user.businessName,
      },
      {
        key: 'businessRole',
        header: 'Rol en negocio',
        render: (user) => user.businessRole,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (user) => (
          <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
            {user.status === 'active' ? 'Activo' : 'Bloqueado'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '70px',
        align: 'right',
        render: (user) => {
          const isCurrentUser = user.uid === currentUserUid

          return (
            <div
              className="user-actions"
              ref={openMenuUid === user.uid ? actionsRef : undefined}
            >
              <button
                type="button"
                className="table-action"
                aria-label={`Acciones de ${user.displayName}`}
                aria-expanded={openMenuUid === user.uid}
                onClick={() =>
                  setOpenMenuUid((current) =>
                    current === user.uid ? null : user.uid,
                  )
                }
              >
                <MoreHorizontal size={20} />
              </button>

              {openMenuUid === user.uid && (
                <div className="user-actions__menu" role="menu">
                  <button type="button" onClick={() => runAction(() => onEdit(user))}>
                    <Pencil size={16} /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={isCurrentUser}
                    title={isCurrentUser ? 'No puedes bloquear tu propio usuario' : undefined}
                    onClick={() => runAction(() => onToggleStatus(user))}
                  >
                    {user.status === 'active' ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                    {user.status === 'active' ? 'Bloquear' : 'Activar'}
                  </button>
                  <button type="button" onClick={() => runAction(() => onResetPassword(user))}>
                    <KeyRound size={16} /> Restablecer contraseña
                  </button>
                  <button
                    type="button"
                    className="user-actions__danger"
                    disabled={isCurrentUser}
                    title={isCurrentUser ? 'No puedes eliminar tu propio usuario' : undefined}
                    onClick={() => runAction(() => onDelete(user))}
                  >
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        },
      },
    ],
    [currentUserUid, onDelete, onEdit, onResetPassword, onToggleStatus, openMenuUid],
  )

  if (loading) {
    return (
      <div className="users-table-loading">
        <Loader label="Cargando usuarios..." />
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <EmptyState
        title="No existen usuarios"
        description="Los usuarios creados o que coincidan con los filtros aparecerán aquí."
      />
    )
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      getRowKey={(user) => user.uid}
      emptyTitle="No existen usuarios"
      emptyDescription="Los usuarios creados aparecerán aquí."
    />
  )
}
