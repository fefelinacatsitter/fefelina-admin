import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationControlsProps {
  page: number // 1-indexed
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  loading?: boolean
}

/**
 * Controles de paginação reutilizáveis (Anterior / Próxima + indicador de página).
 * Usado nas listagens grandes (Clientes, Serviços, Visitas) que agora buscam
 * os dados em páginas via `.range()` no Supabase, em vez de carregar tudo de uma vez.
 */
export default function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
  loading = false,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  if (totalCount === 0) return null

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="hidden sm:block">
        <p className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{from}</span> a{' '}
          <span className="font-medium">{to}</span> de{' '}
          <span className="font-medium">{totalCount}</span> resultados
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>
        <span className="inline-flex items-center px-2 text-sm text-gray-600">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Próxima
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
