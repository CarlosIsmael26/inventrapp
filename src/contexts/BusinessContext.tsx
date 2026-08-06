import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '../hooks/useAuth'
import { getMyMemberships } from '../services'
import type { UserBusinessMembership } from '../types/membership'
import { BusinessContext } from './businessContextDefinition'

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth()
  const [memberships, setMemberships] = useState<UserBusinessMembership[]>([])
  const [selectedId, setSelectedId] = useState(() => sessionStorage.getItem('inventra-membership'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!user || profile?.platformRole === 'super_admin') { setMemberships([]); return }
    try { setLoading(true); setError(null); setMemberships(await getMyMemberships()) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar tus negocios.') }
    finally { setLoading(false) }
  }, [profile?.platformRole, user])

  useEffect(() => { if (!authLoading) void reload() }, [authLoading, reload])
  const currentMembership = useMemo(() => memberships.find((item) => item.id === selectedId) ?? memberships[0] ?? null, [memberships, selectedId])
  useEffect(() => { if (currentMembership) sessionStorage.setItem('inventra-membership', currentMembership.id) }, [currentMembership])

  return <BusinessContext.Provider value={{ memberships, currentMembership, loading: authLoading || loading, error, selectBusiness: setSelectedId, reload }}>{children}</BusinessContext.Provider>
}
