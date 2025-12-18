import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { usePermissions } from '../contexts/PermissionsContext'

interface FieldPermission {
  table_name: string
  field_name: string
  can_read: boolean
  can_write: boolean
}

interface UseFieldPermissionsReturn {
  canRead: (fieldName: string) => boolean
  canWrite: (fieldName: string) => boolean
  loading: boolean
  permissions: FieldPermission[]
}

/**
 * Hook para verificar permissões de campo (FLS - Field Level Security)
 * 
 * @param tableName - Nome da tabela (clients, pets, visits, services)
 * @returns Funções para verificar se pode ler/escrever cada campo
 * 
 * @example
 * ```tsx
 * const { canRead, canWrite } = useFieldPermissions('clients')
 * 
 * // Ocultar campo se não pode ler
 * {canRead('telefone') && (
 *   <div>
 *     <label>Telefone</label>
 *     <input 
 *       value={telefone} 
 *       disabled={!canWrite('telefone')} 
 *     />
 *   </div>
 * )}
 * ```
 */
export function useFieldPermissions(tableName: string): UseFieldPermissionsReturn {
  const [permissions, setPermissions] = useState<FieldPermission[]>([])
  const [loading, setLoading] = useState(true)
  const { isAdmin, userProfile } = usePermissions()

  useEffect(() => {
    if (userProfile) {
      loadPermissions()
    }
  }, [userProfile, tableName])

  const loadPermissions = async () => {
    try {
      // Admin tem acesso total a tudo
      if (isAdmin) {
        setPermissions([])
        setLoading(false)
        return
      }

      // Validar se userProfile existe
      if (!userProfile?.profile_id) {
        setPermissions([])
        setLoading(false)
        return
      }

      // Buscar permissões do perfil do usuário para esta tabela
      const { data, error } = await supabase
        .from('field_permissions')
        .select('table_name, field_name, can_read, can_write')
        .eq('profile_id', userProfile.profile_id)
        .eq('table_name', tableName)

      if (error) throw error

      setPermissions(data || [])
    } catch (error) {
      console.error('Erro ao carregar permissões de campo:', error)
      // Em caso de erro, permitir leitura mas não escrita (modo seguro)
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }

  const canRead = (fieldName: string): boolean => {
    // Admin pode ler tudo
    if (isAdmin) return true

    // Se não há configuração para este campo, permitir leitura por padrão
    const perm = permissions.find(p => p.field_name === fieldName)
    if (!perm) return true

    return perm.can_read
  }

  const canWrite = (fieldName: string): boolean => {
    // Admin pode escrever tudo
    if (isAdmin) return true

    // Se não há configuração para este campo, bloquear escrita por padrão
    const perm = permissions.find(p => p.field_name === fieldName)
    if (!perm) return false

    // Só pode escrever se pode ler E tem permissão de escrita
    return perm.can_read && perm.can_write
  }

  return {
    canRead,
    canWrite,
    loading,
    permissions
  }
}
