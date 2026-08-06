import type { ReactNode } from 'react'

import './DataTable.scss'

export type DataTableColumn<T> = {
  key: string
  header: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowKey: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  emptyTitle = 'No hay registros',
  emptyDescription = 'Todavía no existen datos para mostrar.',
}: DataTableProps<T>) {
  return (
    <div className="data-table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`data-table__cell--${column.align ?? 'left'}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="data-table__state">
                  <div className="data-table__spinner" />

                  <strong>Cargando información...</strong>
                  <span>Espera un momento.</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <div className="data-table__state">
                  <strong>{emptyTitle}</strong>
                  <span>{emptyDescription}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`data-table__cell--${column.align ?? 'left'}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}