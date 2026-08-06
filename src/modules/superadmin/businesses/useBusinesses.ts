import { useCallback, useEffect, useMemo, useState } from 'react'

import { getBusinesses } from '../../../services'
import type { Business, BusinessStatus } from '../../../types/business'

export type BusinessStatusFilter = 'all' | BusinessStatus

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BusinessStatusFilter>('all')

  const reloadBusinesses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setBusinesses(await getBusinesses())
    } catch (requestError) {
      console.error('Error al consultar negocios:', requestError)
      setError('No fue posible cargar los negocios. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => void reloadBusinesses(), [reloadBusinesses])

  const filteredBusinesses = useMemo(() => {
    const term = search.trim().toLowerCase()
    return businesses.filter((business) => {
      const matchesSearch = !term || business.name.toLowerCase().includes(term) ||
        business.slug.toLowerCase().includes(term) || business.email.toLowerCase().includes(term)
      return matchesSearch && (statusFilter === 'all' || business.status === statusFilter)
    })
  }, [businesses, search, statusFilter])

  return {
    businesses,
    filteredBusinesses,
    loading,
    error,
    search,
    statusFilter,
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((item) => item.status === 'active').length,
    suspendedBusinesses: businesses.filter((item) => item.status === 'suspended').length,
    businessTypes: new Set(businesses.map((item) => item.businessType)).size,
    setSearch,
    setStatusFilter,
    reloadBusinesses,
  }
}
