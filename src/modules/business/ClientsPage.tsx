import { Mail, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { DataTable, type DataTableColumn } from '../../components/data-table'
import { Badge, Button, Card } from '../../components/ui'
import { useBusiness } from '../../hooks/useBusiness'
import { getClients } from '../../services'
import type { BusinessClient } from '../../types/client'

import './QuotationsPage.scss'

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function ClientsPage() {
  const { currentMembership } = useBusiness(); const businessId = currentMembership?.businessId ?? ''; const [clients, setClients] = useState<BusinessClient[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [search, setSearch] = useState('')
  const load = useCallback(async () => { if (!businessId) return; try { setLoading(true); setError(null); setClients(await getClients(businessId)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar los clientes.') } finally { setLoading(false) } }, [businessId])
  useEffect(() => { void load() }, [load])
  const filtered = useMemo(() => { const value = normalize(search); return value ? clients.filter((client) => normalize(`${client.name} ${client.email ?? ''} ${client.phone ?? ''}`).includes(value)) : clients }, [clients, search])
  const columns: DataTableColumn<BusinessClient>[] = [{ key: 'client', header: 'Cliente', render: (client) => <div className="quote-customer"><strong>{client.name}</strong><small>{client.email || 'Sin correo'}</small></div> }, { key: 'phone', header: 'Teléfono', render: (client) => client.phone || 'Sin teléfono' }, { key: 'quotes', header: 'Cotizaciones', align: 'right', render: (client) => client.quoteCount }, { key: 'lastQuote', header: 'Última cotización', render: (client) => client.lastQuotedAt?.toLocaleDateString('es-EC') ?? 'Sin fecha' }, { key: 'status', header: 'Estado', render: (client) => <Badge variant={client.status === 'active' ? 'success' : 'warning'}>{client.status === 'active' ? 'Activo' : 'Inactivo'}</Badge> }]
  return <div className="quotations-page"><header className="quotations-page__header"><div><span>Contactos</span><h2>Clientes</h2><p>Clientes registrados automáticamente desde las cotizaciones de este negocio.</p></div></header><section className="quotation-stats"><Card><Users size={22} /><div><small>Clientes registrados</small><strong>{clients.length}</strong></div></Card><Card><Mail size={22} /><div><small>Con correo</small><strong>{clients.filter((client) => client.email).length}</strong></div></Card><Card><Users size={22} /><div><small>Cotizaciones asociadas</small><strong>{clients.reduce((sum, client) => sum + client.quoteCount, 0)}</strong></div></Card></section><section className="quotations-panel"><div className="quotations-toolbar"><div><Search size={18} /><input type="search" value={search} placeholder="Buscar por nombre, correo o teléfono..." onChange={(event) => setSearch(event.target.value)} /></div><span>{filtered.length} de {clients.length} clientes</span></div>{error ? <div className="quotations-error"><p>{error}</p><Button variant="secondary" onClick={() => void load()}>Reintentar</Button></div> : <DataTable columns={columns} data={filtered} getRowKey={(client) => client.id} loading={loading} emptyTitle={search ? 'No encontramos clientes' : 'No hay clientes'} emptyDescription={search ? 'Prueba con otro nombre, correo o teléfono.' : 'Los clientes aparecerán cuando guardes una cotización.'} />}</section></div>
}
