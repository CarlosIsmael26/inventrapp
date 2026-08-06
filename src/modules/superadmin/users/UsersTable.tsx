import { useMemo } from 'react'
import { MoreHorizontal } from 'lucide-react'

import {
  DataTable,
  type DataTableColumn,
} from '../../../components/data-table'

import {
  Badge,
  Loader,
} from '../../../components/ui'

import type { PlatformUser } from '../../../types/user'

type UsersTableProps = {
  users: PlatformUser[]
  loading: boolean
}

function getPlatformRoleLabel(
  platformRole: PlatformUser['platformRole'],
) {
  if (platformRole === 'super_admin') {
    return 'Super Admin'
  }

  if (platformRole === 'support') {
    return 'Soporte'
  }

  return 'Usuario'
}

export function UsersTable({
  users,
  loading,
}: UsersTableProps) {
  const columns = useMemo<
    DataTableColumn<PlatformUser>[]
  >(
    () => [
      {
        key: 'user',
        header: 'Usuario',
        render: (user) => (
          <div className="user-cell">
            <div className="user-cell__avatar">
              {user.displayName
                .charAt(0)
                .toUpperCase()}
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
        render: (user) =>
          getPlatformRoleLabel(
            user.platformRole,
          ),
      },
      {
        key: 'business',
        header: 'Negocio',
        render: (user) =>
          user.businessName,
      },
      {
        key: 'businessRole',
        header: 'Rol en negocio',
        render: (user) =>
          user.businessRole,
      },
      {
        key: 'status',
        header: 'Estado',
        render: (user) => (
          <Badge
            variant={
              user.status === 'active'
                ? 'success'
                : 'danger'
            }
          >
            {user.status === 'active'
              ? 'Activo'
              : 'Bloqueado'}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '70px',
        align: 'right',
        render: (user) => (
          <button
            type="button"
            className="table-action"
            aria-label={`Acciones de ${user.displayName}`}
          >
            <MoreHorizontal size={20} />
          </button>
        ),
      },
    ],
    [],
  )

  if (loading) {
    return <Loader />
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      getRowKey={(user) =>
        user.uid
      }
      emptyTitle="No existen usuarios"
      emptyDescription="Los usuarios creados aparecerán aquí."
    />
  )
}