import { Eye, MoreHorizontal, Pencil, Power, PowerOff } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { DataTable, type DataTableColumn } from '../../../components/data-table'
import { Badge, EmptyState, Loader } from '../../../components/ui'
import type { Business } from '../../../types/business'

type Props = {
  businesses: Business[]
  loading: boolean
  onView: (business: Business) => void
  onEdit: (business: Business) => void
  onToggleStatus: (business: Business) => void
}

const typeLabels: Record<string, string> = {
  stationery: 'Papelería', hardware_store: 'Ferretería', bookstore: 'Librería',
  retail_store: 'Tienda', distributor: 'Distribuidor', other: 'Otro',
}

export function BusinessesTable({ businesses, loading, onView, onEdit, onToggleStatus }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenId(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  function run(action: () => void) {
    setOpenId(null)
    action()
  }

  const columns = useMemo<DataTableColumn<Business>[]>(() => [
    {
      key: 'name', header: 'Negocio', render: (business) => (
        <div className="business-cell">
          <div className="business-cell__avatar">{business.name.charAt(0).toUpperCase()}</div>
          <strong>{business.name}</strong>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (business) => <code>{business.slug}</code> },
    { key: 'type', header: 'Tipo', render: (business) => typeLabels[business.businessType] ?? business.businessType },
    { key: 'email', header: 'Correo', render: (business) => business.email },
    {
      key: 'status', header: 'Estado', render: (business) => (
        <Badge variant={business.status === 'active' ? 'success' : 'danger'}>
          {business.status === 'active' ? 'Activo' : 'Suspendido'}
        </Badge>
      ),
    },
    {
      key: 'createdAt', header: 'Creación', render: (business) =>
        business.createdAt ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(business.createdAt) : 'Sin fecha',
    },
    {
      key: 'actions', header: '', width: '70px', align: 'right', render: (business) => (
        <div className="business-actions" ref={openId === business.id ? menuRef : undefined}>
          <button type="button" className="table-action" aria-label={`Acciones de ${business.name}`} onClick={() => setOpenId((current) => current === business.id ? null : business.id)}>
            <MoreHorizontal size={20} />
          </button>
          {openId === business.id && (
            <div className="business-actions__menu">
              <button type="button" onClick={() => run(() => onView(business))}><Eye size={16} /> Ver detalle</button>
              <button type="button" onClick={() => run(() => onEdit(business))}><Pencil size={16} /> Editar</button>
              <button type="button" className={business.status === 'active' ? 'business-actions__danger' : ''} onClick={() => run(() => onToggleStatus(business))}>
                {business.status === 'active' ? <PowerOff size={16} /> : <Power size={16} />}
                {business.status === 'active' ? 'Suspender' : 'Reactivar'}
              </button>
            </div>
          )}
        </div>
      ),
    },
  ], [onEdit, onToggleStatus, onView, openId])

  if (loading) return <div className="businesses-loading"><Loader label="Cargando negocios..." /></div>
  if (businesses.length === 0) return <EmptyState title="No existen negocios" description="Los negocios creados o que coincidan con los filtros aparecerán aquí." />
  return <DataTable columns={columns} data={businesses} getRowKey={(business) => business.id} />
}
