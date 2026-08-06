import { useCallback, useEffect, useMemo, useState } from 'react'

import { getPlatformUsers } from '../../../services'
import type {
  PlatformUser,
  UserStatus,
} from '../../../types/user'

export type UserStatusFilter = 'all' | UserStatus

export function useUsers() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<UserStatusFilter>('all')

  const reloadUsers = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const usersData = await getPlatformUsers()
      setUsers(usersData)
    } catch (requestError) {
      console.error(
        'Error al consultar los usuarios:',
        requestError,
      )

      setError(
        'No fue posible cargar los usuarios. Intenta nuevamente.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reloadUsers()
  }, [reloadUsers])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.displayName
          .toLowerCase()
          .includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch)

      const matchesStatus =
        statusFilter === 'all' ||
        user.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [users, search, statusFilter])

  const activeUsers = useMemo(
    () =>
      users.filter((user) => user.status === 'active').length,
    [users],
  )

  const blockedUsers = useMemo(
    () =>
      users.filter((user) => user.status === 'blocked').length,
    [users],
  )

  const superAdmins = useMemo(
    () =>
      users.filter(
        (user) => user.platformRole === 'super_admin',
      ).length,
    [users],
  )

  return {
    users,
    filteredUsers,
    loading,
    error,
    search,
    statusFilter,
    totalUsers: users.length,
    activeUsers,
    blockedUsers,
    superAdmins,
    setSearch,
    setStatusFilter,
    reloadUsers,
  }
}
