import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Shield, Eye, EyeOff, Edit3, Lock, RefreshCw } from 'lucide-react'

interface Profile {
  id: string
  name: string
  description: string
}

interface FieldPermission {
  id: string
  profile_id: string
  table_name: string
  field_name: string
  can_read: boolean
  can_write: boolean
}

interface TableField {
  table_name: string
  field_name: string
  display_name: string
  description: string
}

// Mapeamento de tabelas e campos (baseado na estrutura real do banco)
const TABLES_CONFIG: Record<string, TableField[]> = {
  clients: [
    { table_name: 'clients', field_name: 'id', display_name: 'ID', description: 'Identificador único' },
    { table_name: 'clients', field_name: 'nome', display_name: 'Nome', description: 'Nome completo do cliente' },
    { table_name: 'clients', field_name: 'telefone', display_name: 'Telefone', description: 'Número de contato (sensível)' },
    { table_name: 'clients', field_name: 'email', display_name: 'Email', description: 'Endereço de email (sensível)' },
    { table_name: 'clients', field_name: 'endereco_completo', display_name: 'Endereço', description: 'Endereço completo' },
    { table_name: 'clients', field_name: 'veterinario_confianca', display_name: 'Veterinário', description: 'Veterinário de confiança' },
    { table_name: 'clients', field_name: 'valor_diaria', display_name: 'Valor Diária', description: 'Valor da diária (financeiro)' },
    { table_name: 'clients', field_name: 'valor_duas_visitas', display_name: 'Valor 2 Visitas', description: 'Valor de duas visitas (financeiro)' },
    { table_name: 'clients', field_name: 'observacoes', display_name: 'Observações', description: 'Notas e observações' },
    { table_name: 'clients', field_name: 'tags', display_name: 'Tags', description: 'Etiquetas do cliente' },
    { table_name: 'clients', field_name: 'notas', display_name: 'Notas', description: 'Anotações internas' },
  ],
  pets: [
    { table_name: 'pets', field_name: 'id', display_name: 'ID', description: 'Identificador único' },
    { table_name: 'pets', field_name: 'client_id', display_name: 'Cliente ID', description: 'ID do cliente' },
    { table_name: 'pets', field_name: 'nome', display_name: 'Nome', description: 'Nome do pet' },
    { table_name: 'pets', field_name: 'caracteristica', display_name: 'Características', description: 'Características físicas' },
    { table_name: 'pets', field_name: 'observacoes', display_name: 'Observações', description: 'Notas sobre o pet' },
  ],
  visits: [
    { table_name: 'visits', field_name: 'id', display_name: 'ID', description: 'Identificador único' },
    { table_name: 'visits', field_name: 'service_id', display_name: 'Serviço ID', description: 'ID do serviço' },
    { table_name: 'visits', field_name: 'client_id', display_name: 'Cliente ID', description: 'ID do cliente' },
    { table_name: 'visits', field_name: 'lead_id', display_name: 'Lead ID', description: 'ID do lead (pré-encontros)' },
    { table_name: 'visits', field_name: 'data', display_name: 'Data', description: 'Data da visita' },
    { table_name: 'visits', field_name: 'horario', display_name: 'Horário', description: 'Horário da visita' },
    { table_name: 'visits', field_name: 'duracao_minutos', display_name: 'Duração', description: 'Duração em minutos' },
    { table_name: 'visits', field_name: 'status', display_name: 'Status', description: 'Status (agendada/realizada/cancelada)' },
    { table_name: 'visits', field_name: 'tipo_visita', display_name: 'Tipo Visita', description: 'Tipo (inteira/meia)' },
    { table_name: 'visits', field_name: 'tipo_encontro', display_name: 'Tipo Encontro', description: 'Tipo (pre_encontro/visita_servico)' },
    { table_name: 'visits', field_name: 'responsavel', display_name: 'Responsável', description: 'Responsável (fernanda/andre)' },
    { table_name: 'visits', field_name: 'observacoes', display_name: 'Observações', description: 'Notas da visita' },
    { table_name: 'visits', field_name: 'valor', display_name: 'Valor', description: 'Valor da visita (financeiro)' },
    { table_name: 'visits', field_name: 'desconto_plataforma', display_name: 'Desconto Plataforma', description: 'Desconto (financeiro)' },
  ],
  services: [
    { table_name: 'services', field_name: 'id', display_name: 'ID', description: 'Identificador único' },
    { table_name: 'services', field_name: 'client_id', display_name: 'Cliente ID', description: 'ID do cliente' },
    { table_name: 'services', field_name: 'data_inicio', display_name: 'Data Início', description: 'Data de início do serviço' },
    { table_name: 'services', field_name: 'data_fim', display_name: 'Data Fim', description: 'Data de término do serviço' },
    { table_name: 'services', field_name: 'status', display_name: 'Status', description: 'Status (pendente/em_andamento/concluido/pago)' },
    { table_name: 'services', field_name: 'total_visitas', display_name: 'Total Visitas', description: 'Número de visitas' },
    { table_name: 'services', field_name: 'total_valor', display_name: 'Total Valor', description: 'Valor total (financeiro)' },
    { table_name: 'services', field_name: 'total_a_receber', display_name: 'Total a Receber', description: 'Valor a receber (financeiro)' },
    { table_name: 'services', field_name: 'desconto_plataforma', display_name: 'Desconto', description: 'Desconto aplicado (financeiro)' },
  ],
}

export default function FieldPermissionsSetup() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [selectedTable, setSelectedTable] = useState<string>('clients')
  const [permissions, setPermissions] = useState<FieldPermission[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    if (selectedProfile && selectedTable) {
      fetchPermissions()
    }
  }, [selectedProfile, selectedTable])

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name')

      if (error) throw error
      setProfiles(data || [])
      
      // Selecionar Parceiro por padrão
      const parceiro = data?.find(p => p.name === 'Parceiro')
      if (parceiro) setSelectedProfile(parceiro.id)
    } catch (error) {
      console.error('Erro ao buscar perfis:', error)
      toast.error('Erro ao carregar perfis')
    }
  }

  const fetchPermissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('field_permissions')
        .select('*')
        .eq('profile_id', selectedProfile)
        .eq('table_name', selectedTable)

      if (error) throw error
      setPermissions(data || [])
    } catch (error) {
      console.error('Erro ao buscar permissões:', error)
      toast.error('Erro ao carregar permissões')
    } finally {
      setLoading(false)
    }
  }

  const getPermissionForField = (fieldName: string) => {
    return permissions.find(p => p.field_name === fieldName)
  }

  const togglePermission = async (fieldName: string, permType: 'can_read' | 'can_write') => {
    const existing = getPermissionForField(fieldName)
    
    if (existing) {
      // Atualizar permissão existente
      const newValue = !existing[permType]
      
      // Se desabilitar leitura, também desabilitar escrita
      const updates: Partial<FieldPermission> = {
        [permType]: newValue
      }
      
      if (permType === 'can_read' && !newValue) {
        updates.can_write = false
      }
      
      const { error } = await supabase
        .from('field_permissions')
        .update(updates)
        .eq('id', existing.id)

      if (error) throw error
      
      // Atualizar estado local
      setPermissions(prev => prev.map(p => 
        p.id === existing.id 
          ? { ...p, ...updates }
          : p
      ))
    } else {
      // Criar nova permissão
      const newPerm = {
        profile_id: selectedProfile,
        table_name: selectedTable,
        field_name: fieldName,
        can_read: permType === 'can_read',
        can_write: permType === 'can_write'
      }

      const { data, error } = await supabase
        .from('field_permissions')
        .insert([newPerm])
        .select()
        .single()

      if (error) throw error
      
      setPermissions(prev => [...prev, data])
    }
  }

  const resetToDefault = async () => {
    if (!confirm('Deseja realmente resetar todas as permissões para os valores padrão? Esta ação não pode ser desfeita.')) {
      return
    }

    setSaving(true)
    try {
      // Chamar função do banco para repopular
      const { error } = await supabase.rpc('populate_default_field_permissions')
      
      if (error) throw error
      
      toast.success('Permissões resetadas com sucesso!')
      await fetchPermissions()
    } catch (error) {
      console.error('Erro ao resetar permissões:', error)
      toast.error('Erro ao resetar permissões')
    } finally {
      setSaving(false)
    }
  }

  const profileName = profiles.find(p => p.id === selectedProfile)?.name || ''
  const isAdminProfile = profileName === 'Administrador'
  const fields = TABLES_CONFIG[selectedTable] || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Permissões de Campo (FLS)
            </h2>
            <p className="text-sm text-gray-500">
              Controle quais campos cada perfil pode visualizar e editar
            </p>
          </div>
        </div>
        <button
          onClick={resetToDefault}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
          Resetar Padrão
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Perfil
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Selecione um perfil</option>
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tabela
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="clients">Clientes</option>
            <option value="pets">Pets</option>
            <option value="visits">Visitas</option>
            <option value="services">Serviços</option>
          </select>
        </div>
      </div>

      {/* Aviso Admin */}
      {isAdminProfile && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex gap-2">
            <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Perfil Administrador
              </p>
              <p className="text-sm text-blue-700 mt-1">
                O perfil Administrador sempre tem acesso total a todos os campos. 
                As configurações abaixo não se aplicam a este perfil.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Permissões */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    <div className="flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" />
                      Visualizar
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    <div className="flex items-center justify-center gap-2">
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fields.map((field) => {
                  const perm = getPermissionForField(field.field_name)
                  const canRead = perm?.can_read ?? true
                  const canWrite = perm?.can_write ?? false

                  return (
                    <tr key={field.field_name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 text-xs font-mono bg-gray-100 rounded">
                            {field.field_name}
                          </code>
                          <span className="text-sm font-medium text-gray-900">
                            {field.display_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {field.description}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => togglePermission(field.field_name, 'can_read')}
                          disabled={isAdminProfile}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                            canRead
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {canRead ? (
                            <Eye className="w-5 h-5" />
                          ) : (
                            <EyeOff className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => togglePermission(field.field_name, 'can_write')}
                          disabled={isAdminProfile || !canRead}
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${
                            canWrite
                              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Legenda:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-600" />
            <span className="text-gray-700">
              <strong>Verde:</strong> Usuário pode visualizar o campo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">
              <strong>Vermelho:</strong> Campo oculto para o usuário
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">
              <strong>Azul:</strong> Usuário pode editar o campo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600" />
            <span className="text-gray-700">
              <strong>Admin:</strong> Sempre tem acesso total
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
