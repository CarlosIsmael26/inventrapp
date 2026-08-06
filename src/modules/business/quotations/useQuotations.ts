import { useCallback, useEffect, useState } from 'react'

import { getQuotations } from '../../../services'
import type { Quotation } from '../../../types/quotation'

export function useQuotations(businessId: string) {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    if (!businessId) return
    try { setLoading(true); setError(null); setQuotations(await getQuotations(businessId)) }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las cotizaciones.') }
    finally { setLoading(false) }
  }, [businessId])
  useEffect(() => { void reload() }, [reload])
  return { quotations, loading, error, reload }
}
