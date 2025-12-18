import { useFieldPermissions } from '../hooks/useFieldPermissions'

/**
 * Hook simplificado para mascarar dados sensíveis baseado em FLS
 * 
 * @example
 * ```tsx
 * const maskField = useFieldMask('clients')
 * 
 * // No JSX:
 * <p>{maskField('telefone', client.telefone)}</p>
 * // Admin vê: (11) 98765-4321
 * // Parceiro vê: ••••••••••
 * ```
 */
export function useFieldMask(tableName: string) {
  const { canRead, loading } = useFieldPermissions(tableName)

  const maskField = (fieldName: string, value: any, maskChar: string = '••••••••••'): any => {
    // Durante loading, mostrar loading
    if (loading) return '...'

    // Se pode ler, mostrar valor real
    if (canRead(fieldName)) {
      return value ?? '-'
    }

    // Se não pode ler, mascarar
    return maskChar
  }

  const shouldShowField = (fieldName: string): boolean => {
    if (loading) return true
    return canRead(fieldName)
  }

  return { maskField, shouldShowField, loading, canRead }
}

/**
 * Hook para filtrar dados de objeto baseado em FLS
 * Remove campos que o usuário não pode ver
 * 
 * @example
 * ```tsx
 * const filterData = useFieldFilter('clients')
 * const safeClient = filterData(client)
 * // Admin: { id, nome, telefone, email, ... }
 * // Parceiro: { id, nome, endereco, ... } (sem telefone/email)
 * ```
 */
export function useFieldFilter(tableName: string) {
  const { canRead, loading } = useFieldPermissions(tableName)

  const filterData = <T extends Record<string, any>>(data: T): Partial<T> => {
    if (loading) return data

    const filtered: any = {}
    
    for (const key in data) {
      if (canRead(key)) {
        filtered[key] = data[key]
      }
    }

    return filtered
  }

  return { filterData, loading }
}
