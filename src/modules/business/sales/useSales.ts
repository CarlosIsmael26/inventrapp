import { useCallback, useEffect, useState } from 'react'
import { getSales } from '../../../services'
import type { Sale } from '../../../types/sale'
export function useSales(businessId: string) { const [sales, setSales] = useState<Sale[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const reload = useCallback(async () => { if (!businessId) return; try { setLoading(true); setError(null); setSales(await getSales(businessId)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las ventas.') } finally { setLoading(false) } }, [businessId]); useEffect(() => { void reload() }, [reload]); return { sales, loading, error, reload } }
