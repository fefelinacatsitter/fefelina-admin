import { ReactNode } from 'react'
import { useFieldPermissions } from '../hooks/useFieldPermissions'

interface FieldGuardProps {
  table: string
  field: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Componente para ocultar campos baseado em FLS
 * 
 * @example
 * ```tsx
 * <FieldGuard table="clients" field="telefone">
 *   <div>
 *     <label>Telefone</label>
 *     <input value={telefone} />
 *   </div>
 * </FieldGuard>
 * ```
 */
export function FieldGuard({ table, field, children, fallback = null }: FieldGuardProps) {
  const { canRead } = useFieldPermissions(table)

  if (!canRead(field)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface WriteGuardProps {
  table: string
  field: string
  children: (canWrite: boolean) => ReactNode
}

/**
 * Componente para controlar permissão de escrita em campos
 * 
 * @example
 * ```tsx
 * <WriteGuard table="clients" field="telefone">
 *   {(canWrite) => (
 *     <input disabled={!canWrite} />
 *   )}
 * </WriteGuard>
 * ```
 */
export function WriteGuard({ table, field, children }: WriteGuardProps) {
  const { canWrite } = useFieldPermissions(table)
  return <>{children(canWrite(field))}</>
}

interface MaskFieldProps {
  table: string
  field: string
  value: string | null | undefined
  mask?: string
}

/**
 * Componente para mascarar valores de campos restritos
 * 
 * @example
 * ```tsx
 * <MaskField 
 *   table="clients" 
 *   field="telefone" 
 *   value={client.telefone} 
 * />
 * // Se não pode ver: "••••••••••"
 * // Se pode ver: "(11) 98765-4321"
 * ```
 */
export function MaskField({ table, field, value, mask = '••••••••••' }: MaskFieldProps) {
  const { canRead } = useFieldPermissions(table)

  if (!canRead(field)) {
    return <span className="text-gray-400">{mask}</span>
  }

  return <span>{value || '-'}</span>
}
