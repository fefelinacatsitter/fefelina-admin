import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, Client, Pet } from '../lib/supabase'
import toast from 'react-hot-toast'
import CatLoader from '../components/CatLoader'
import { useFieldMask } from '../hooks/useFieldMask'
import { usePermissions } from '../contexts/PermissionsContext'

// Função para formatar telefone brasileiro
const formatPhone = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '')
  
  // Se não tem números, retorna vazio (não deixa o + sozinho)
  if (numbers.length === 0) {
    return ''
  }
  
  // Limita a 13 dígitos (55 + 2 DDD + 9 número)
  const limited = numbers.slice(0, 13)
  
  // Aplica a máscara +55(XX)XXXXX-XXXX ou +55(XX)XXXX-XXXX
  if (limited.length <= 2) {
    return `+${limited}`
  } else if (limited.length <= 4) {
    return `+${limited.slice(0, 2)}(${limited.slice(2)}`
  } else if (limited.length <= 9) {
    return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${limited.slice(4)}`
  } else {
    const phone = limited.slice(4)
    if (phone.length <= 4) {
      return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${phone}`
    } else {
      // Se tem 9 dígitos (celular) ou 8 (fixo)
      const separator = phone.length === 9 ? 5 : 4
      return `+${limited.slice(0, 2)}(${limited.slice(2, 4)})${phone.slice(0, separator)}-${phone.slice(separator)}`
    }
  }
}

export default function ClientsPage() {
  const navigate = useNavigate()
  const { maskField } = useFieldMask('clients')
  const { userProfile } = usePermissions()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [clientPets, setClientPets] = useState<Pet[]>([])
  const [sortBy, setSortBy] = useState<'recent_services' | 'alphabetical'>('alphabetical')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  
  // Modal de visualização para não-admins
  const [showViewModal, setShowViewModal] = useState(false)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [viewingPets, setViewingPets] = useState<Pet[]>([])
  
  // Estados para modal de Pet
  const [showPetModal, setShowPetModal] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [petFormData, setPetFormData] = useState({
    nome: '',
    caracteristica: '',
    observacoes: ''
  })
  
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    valor_diaria: '',
    valor_duas_visitas: '',
    endereco_completo: '',
    veterinario_confianca: ''
  })
  const [pets, setPets] = useState([
    { nome: '', caracteristica: '', observacoes: '' }
  ])

  useEffect(() => {
    fetchClients()
  }, [sortBy])

  // Filtrar clientes baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client =>
        client.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredClients(filtered)
    }
  }, [clients, searchTerm])

  const fetchClients = async () => {
    setLoading(true)
    
    try {
      if (sortBy === 'recent_services') {
        // Ordenar por atividade mais recente (visitas realizadas)
        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            services (
              id,
              data_inicio,
              data_fim,
              visits (
                data,
                status
              )
            )
          `)
        
        if (error) throw error
        
        // Ordenar do lado do cliente por atividade mais recente
        const sortedClients = (data || []).sort((a, b) => {
          // Para cada cliente, encontrar a data da visita realizada mais recente
          const getLatestActivityDate = (client: any) => {
            let latestDate = 0
            
            if (client.services?.length > 0) {
              client.services.forEach((service: any) => {
                // Verificar visitas realizadas do serviço
                if (service.visits?.length > 0) {
                  service.visits.forEach((visit: any) => {
                    if (visit.status === 'realizada') {
                      const visitDate = new Date(visit.data).getTime()
                      if (visitDate > latestDate) {
                        latestDate = visitDate
                      }
                    }
                  })
                }
                
                // Se não houver visitas realizadas, usar a data fim do serviço como fallback
                if (latestDate === 0 && service.data_fim) {
                  const serviceEndDate = new Date(service.data_fim).getTime()
                  if (serviceEndDate > latestDate) {
                    latestDate = serviceEndDate
                  }
                }
                
                // Se ainda não houver data, usar data_inicio como último fallback
                if (latestDate === 0 && service.data_inicio) {
                  const serviceStartDate = new Date(service.data_inicio).getTime()
                  if (serviceStartDate > latestDate) {
                    latestDate = serviceStartDate
                  }
                }
              })
            }
            
            return latestDate
          }
          
          const aLatestActivity = getLatestActivityDate(a)
          const bLatestActivity = getLatestActivityDate(b)
          
          // Se ambos têm atividade, ordenar por data mais recente
          if (aLatestActivity > 0 && bLatestActivity > 0) {
            return bLatestActivity - aLatestActivity
          }
          
          // Se apenas um tem atividade, esse vem primeiro
          if (aLatestActivity > 0 && bLatestActivity === 0) {
            return -1
          }
          if (bLatestActivity > 0 && aLatestActivity === 0) {
            return 1
          }
          
          // Se nenhum tem atividade, ordenar alfabeticamente
          return a.nome.localeCompare(b.nome)
        })
        
        setClients(sortedClients)
      } else {
        // Ordenar alfabeticamente
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('nome', { ascending: true })
        
        if (error) throw error
        setClients(data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      setClients([])
    }
    
    setLoading(false)
  }

  // Função para lidar com clique no cliente
  const handleClientClick = async (client: Client) => {
    const isAdmin = userProfile?.profile?.name === 'Administrador'
    
    if (isAdmin) {
      // Admin vai para a página completa
      navigate(`/clients/${client.id}`)
    } else {
      // Outros perfis abrem a modal de visualização
      setViewingClient(client)
      
      // Buscar pets do cliente
      try {
        const { data: petsData, error } = await supabase
          .from('pets')
          .select('*')
          .eq('client_id', client.id)
        
        if (error) throw error
        setViewingPets(petsData || [])
      } catch (error) {
        console.error('Erro ao buscar pets:', error)
        setViewingPets([])
      }
      
      setShowViewModal(true)
    }
  }

  const closeViewModal = () => {
    setShowViewModal(false)
    setViewingClient(null)
    setViewingPets([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevenir múltiplos envios
    if (submitting) {
      toast.error('Aguarde, o cliente está sendo salvo...')
      return
    }

    setSubmitting(true)
    
    try {
      // 1. Inserir o cliente primeiro
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          nome: formData.nome,
          telefone: formData.telefone || null,
          valor_diaria: parseFloat(formData.valor_diaria),
          valor_duas_visitas: parseFloat(formData.valor_duas_visitas),
          endereco_completo: formData.endereco_completo,
          veterinario_confianca: formData.veterinario_confianca
        }])
        .select()
        .single()

      if (clientError) {
        throw clientError
      }

      // 2. Inserir os pets (apenas os que têm nome preenchido)
      const petsToInsert = pets.filter(pet => pet.nome.trim() !== '')
      
      if (petsToInsert.length > 0) {
        const petsData = petsToInsert.map(pet => ({
          client_id: clientData.id,
          nome: pet.nome,
          caracteristica: pet.caracteristica,
          observacoes: pet.observacoes || null
        }))

        const { error: petsError } = await supabase
          .from('pets')
          .insert(petsData)

        if (petsError) {
          throw petsError
        }
      }

      // 3. Sucesso - limpar formulário e recarregar lista
      toast.success(
        petsToInsert.length > 0 
          ? `Cliente "${formData.nome}" e ${petsToInsert.length} pet(s) adicionados com sucesso!`
          : `Cliente "${formData.nome}" adicionado com sucesso!`
      )
      
      setFormData({
        nome: '',
        telefone: '',
        valor_diaria: '',
        valor_duas_visitas: '',
        endereco_completo: '',
        veterinario_confianca: ''
      })
      setPets([{ nome: '', caracteristica: '', observacoes: '' }])
      setShowAddForm(false)
      fetchClients()

    } catch (error: any) {
      console.error('Erro ao adicionar cliente:', error)
      toast.error(`Erro ao adicionar cliente: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Aplica máscara de telefone
    if (name === 'telefone') {
      setFormData({
        ...formData,
        [name]: formatPhone(value)
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handlePetChange = (index: number, field: string, value: string) => {
    const updatedPets = [...pets]
    updatedPets[index] = { ...updatedPets[index], [field]: value }
    setPets(updatedPets)
  }

  const addPetField = () => {
    setPets([{ nome: '', caracteristica: '', observacoes: '' }, ...pets])
  }

  // Funções para gerenciar pets individuais
  const handleAddPet = () => {
    if (!editingClient) return
    setPetFormData({ nome: '', caracteristica: '', observacoes: '' })
    setEditingPet(null)
    setShowPetModal(true)
  }

  const handleEditPet = (pet: Pet) => {
    setPetFormData({
      nome: pet.nome,
      caracteristica: pet.caracteristica || '',
      observacoes: pet.observacoes || ''
    })
    setEditingPet(pet)
    setShowPetModal(true)
  }

  const handleDeletePet = async (petId: string) => {
    if (!confirm('Tem certeza que deseja excluir este pet?')) return

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', petId)

      if (error) throw error

      toast.success('Pet excluído com sucesso!')
      
      // Atualizar lista de pets
      setClientPets(clientPets.filter(p => p.id !== petId))
    } catch (error: any) {
      console.error('Erro ao excluir pet:', error)
      toast.error('Erro ao excluir pet')
    }
  }

  const handlePetModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingClient) return

    try {
      if (editingPet) {
        // Atualizar pet existente
        const { error } = await supabase
          .from('pets')
          .update({
            nome: petFormData.nome,
            caracteristica: petFormData.caracteristica || null,
            observacoes: petFormData.observacoes || null
          })
          .eq('id', editingPet.id)

        if (error) throw error

        toast.success('Pet atualizado com sucesso!')
        
        // Atualizar lista
        setClientPets(clientPets.map(p => 
          p.id === editingPet.id 
            ? { ...p, ...petFormData } 
            : p
        ))
      } else {
        // Criar novo pet
        const { data, error } = await supabase
          .from('pets')
          .insert({
            client_id: editingClient.id,
            nome: petFormData.nome,
            caracteristica: petFormData.caracteristica || null,
            observacoes: petFormData.observacoes || null
          })
          .select()
          .single()

        if (error) throw error

        toast.success('Pet adicionado com sucesso!')
        
        // Adicionar à lista
        setClientPets([...clientPets, data])
      }

      setShowPetModal(false)
      setPetFormData({ nome: '', caracteristica: '', observacoes: '' })
      setEditingPet(null)
    } catch (error: any) {
      console.error('Erro ao salvar pet:', error)
      toast.error('Erro ao salvar pet')
    }
  }

  const removePetField = (index: number) => {
    if (pets.length > 1) {
      const updatedPets = pets.filter((_, i) => i !== index)
      setPets(updatedPets)
    }
  }

  const openEditForm = async (client: Client) => {
    setEditingClient(client)
    setFormData({
      nome: client.nome,
      telefone: client.telefone || '',
      valor_diaria: client.valor_diaria.toString(),
      valor_duas_visitas: client.valor_duas_visitas.toString(),
      endereco_completo: client.endereco_completo,
      veterinario_confianca: client.veterinario_confianca
    })
    
    // Buscar pets existentes do cliente
    const { data: petsData, error } = await supabase
      .from('pets')
      .select('*')
      .eq('client_id', client.id)
    
    if (error) {
      console.error('Erro ao buscar pets:', error)
      setClientPets([])
    } else {
      setClientPets(petsData || [])
    }
    
    setShowEditForm(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingClient) return
    
    // Prevenir múltiplos envios
    if (updating) {
      toast.error('Aguarde, as alterações estão sendo salvas...')
      return
    }

    setUpdating(true)
    
    try {
      // 1. Atualizar dados do cliente
      const { error: clientError } = await supabase
        .from('clients')
        .update({
          nome: formData.nome,
          telefone: formData.telefone || null,
          valor_diaria: parseFloat(formData.valor_diaria),
          valor_duas_visitas: parseFloat(formData.valor_duas_visitas),
          endereco_completo: formData.endereco_completo,
          veterinario_confianca: formData.veterinario_confianca,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingClient.id)

      if (clientError) {
        throw clientError
      }

      // 2. Adicionar novos pets (se houver)
      const newPetsToInsert = pets.filter(pet => pet.nome.trim() !== '')
      
      if (newPetsToInsert.length > 0) {
        const petsData = newPetsToInsert.map(pet => ({
          client_id: editingClient.id,
          nome: pet.nome,
          caracteristica: pet.caracteristica,
          observacoes: pet.observacoes || null
        }))

        const { error: petsError } = await supabase
          .from('pets')
          .insert(petsData)

        if (petsError) {
          throw petsError
        }
      }

      // 3. Sucesso - limpar formulário e recarregar lista
      toast.success(
        newPetsToInsert.length > 0 
          ? `Cliente "${formData.nome}" atualizado e ${newPetsToInsert.length} novo(s) pet(s) adicionado(s)!`
          : `Cliente "${formData.nome}" atualizado com sucesso!`
      )
      
      closeEditForm()
      fetchClients()

    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error)
      toast.error(`Erro ao atualizar cliente: ${error.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const closeEditForm = () => {
    setShowEditForm(false)
    setEditingClient(null)
    setClientPets([])
    setFormData({
      nome: '',
      telefone: '',
      valor_diaria: '',
      valor_duas_visitas: '',
      endereco_completo: '',
      veterinario_confianca: ''
    })
    setPets([{ nome: '', caracteristica: '', observacoes: '' }])
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="page-title-fefelina">Clientes</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos os clientes registrados no sistema.
          </p>
          <div className="divider-fefelina"></div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="btn-fefelina"
          >
            Adicionar Cliente
          </button>
        </div>
      </div>

      {/* Modal de Adicionar Cliente */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4">
          <div className="relative top-10 w-full max-w-4xl bg-white rounded-lg shadow-xl">
            {/* Header com gradiente */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Adicionar Novo Cliente</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b pb-2">Dados do Cliente</h4>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Telefone</label>
                      <input
                        type="text"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleInputChange}
                        placeholder="+55(47)99999-9999"
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor Diária (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_diaria"
                        value={formData.valor_diaria}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor 2 Visitas (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_duas_visitas"
                        value={formData.valor_duas_visitas}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Endereço Completo</label>
                      <textarea
                        name="endereco_completo"
                        value={formData.endereco_completo}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Veterinário de Confiança</label>
                      <input
                        type="text"
                        name="veterinario_confianca"
                        value={formData.veterinario_confianca}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  {/* Pets do Cliente */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h4 className="text-md font-medium text-gray-800">Pets do Cliente</h4>
                      <button
                        type="button"
                        onClick={addPetField}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        + Adicionar Pet
                      </button>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto space-y-4">
                      {pets.map((pet, index) => (
                        <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-medium text-gray-700">Pet {index + 1}</span>
                            {pets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePetField(index)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Pet</label>
                              <input
                                type="text"
                                value={pet.nome}
                                onChange={(e) => handlePetChange(index, 'nome', e.target.value)}
                                placeholder="Ex: Mimi, Rex..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Características</label>
                              <input
                                type="text"
                                value={pet.caracteristica}
                                onChange={(e) => handlePetChange(index, 'caracteristica', e.target.value)}
                                placeholder="Ex: Gato laranja, Cachorro pequeno porte..."
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Observações</label>
                              <textarea
                                value={pet.observacoes}
                                onChange={(e) => handlePetChange(index, 'observacoes', e.target.value)}
                                placeholder="Medicamentos, cuidados especiais..."
                                rows={2}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({
                        nome: '',
                        telefone: '',
                        valor_diaria: '',
                        valor_duas_visitas: '',
                        endereco_completo: '',
                        veterinario_confianca: ''
                      })
                      setPets([{ nome: '', caracteristica: '', observacoes: '' }])
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Cliente e Pets'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Editar Cliente */}
      {showEditForm && editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4">
          <div className="relative top-10 w-full max-w-4xl bg-white rounded-lg shadow-xl">
            {/* Header com gradiente */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Editar Cliente: {editingClient.nome}</h3>
              <button
                onClick={() => setShowEditForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleEditSubmit}>
                {/* Informações do Cliente em 2 colunas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Nome</label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Telefone</label>
                    <input
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleInputChange}
                      placeholder="+55(47)99999-9999"
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor Diária (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_diaria"
                      value={formData.valor_diaria}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Valor 2 Visitas (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="valor_duas_visitas"
                      value={formData.valor_duas_visitas}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Veterinário de Confiança</label>
                    <input
                      type="text"
                      name="veterinario_confianca"
                      value={formData.veterinario_confianca}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Endereço Completo</label>
                    <textarea
                      name="endereco_completo"
                      value={formData.endereco_completo}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Related List - Pets */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Pets ({clientPets.length})</h4>
                    <button
                      type="button"
                      onClick={handleAddPet}
                      className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-md hover:bg-primary-600 transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Adicionar Pet
                    </button>
                  </div>

                  {clientPets.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                      <p className="text-sm text-gray-600">Nenhum pet cadastrado ainda</p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Nome
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Características
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Observações
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wide">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {clientPets.map((pet) => (
                            <tr key={pet.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-2.5 text-sm font-medium text-gray-900">
                                {pet.nome}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-gray-600">
                                {pet.caracteristica || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-gray-600 max-w-xs truncate">
                                {pet.observacoes || '-'}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditPet(pet)}
                                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-1.5 rounded transition-colors"
                                    title="Editar pet"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePet(pet.id)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors"
                                    title="Excluir pet"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeEditForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {updating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Controles de Busca e Ordenação - Responsivos */}
      <div className="mt-6 mb-4 space-y-4 sm:space-y-0 sm:flex sm:items-end sm:justify-between">
        {/* Campo de Busca */}
        <div className="flex-1 max-w-md">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Cliente
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite o nome do cliente..."
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
            {searchTerm && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {searchTerm && (
            <p className="mt-1 text-sm text-gray-500">
              {filteredClients.length} cliente(s) encontrado(s) para "{searchTerm}"
            </p>
          )}
        </div>

        {/* Seletor de Ordenação */}
        <div className="flex-shrink-0">
          <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
            Ordenar por
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent_services' | 'alphabetical')}
            className="block w-full pl-3 pr-10 py-2 text-sm border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="recent_services">Serviços Recentes</option>
            <option value="alphabetical">Ordem Alfabética</option>
          </select>
        </div>
      </div>

      {/* Versão Mobile - Cards */}
      <div className="mt-8 md:hidden space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Carregando...</div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}"` : 'Nenhum cliente cadastrado ainda.'}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id} 
              onClick={() => handleClientClick(client)}
              className="bg-white rounded-lg shadow-sm border p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900 text-base">
                  {client.nome}
                </h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditForm(client);
                  }}
                  className="text-primary-600 hover:text-primary-900 text-sm"
                >
                  Editar
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Diária:</span>
                  <span className="font-medium">{maskField('valor_diaria', `R$ ${client.valor_diaria.toFixed(2)}`)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">2 Visitas:</span>
                  <span className="font-medium">{maskField('valor_duas_visitas', `R$ ${client.valor_duas_visitas.toFixed(2)}`)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Endereço:</span>
                  <p className="text-gray-900 mt-1">{client.endereco_completo}</p>
                </div>
                {client.veterinario_confianca && (
                  <div>
                    <span className="text-gray-600">Veterinário:</span>
                    <p className="text-gray-900 mt-1">{client.veterinario_confianca}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Versão Desktop - Tabela */}
      <div className="mt-8 hidden md:flex flex-col">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full py-2 align-middle">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300 table-fixed">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-[20%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Diária
                    </th>
                    <th className="w-[12%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      2 Visitas
                    </th>
                    <th className="w-[30%] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endereço
                    </th>
                    <th className="w-[26%] relative px-4 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-20">
                        <div className="flex justify-center">
                          <CatLoader size="md" variant="paws" text="Carregando clientes..." />
                        </div>
                      </td>
                    </tr>
                  ) : filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        {searchTerm ? `Nenhum cliente encontrado para "${searchTerm}"` : 'Nenhum cliente cadastrado ainda.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClients.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => handleClientClick(client)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {client.nome}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {maskField('valor_diaria', `R$ ${client.valor_diaria.toFixed(2)}`)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {maskField('valor_duas_visitas', `R$ ${client.valor_duas_visitas.toFixed(2)}`)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div className="truncate" title={client.endereco_completo}>
                            {client.endereco_completo}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(client);
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar cliente"
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Adicionar/Editar Pet */}
      {showPetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-[60] flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
            {/* Header com gradiente */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">
                {editingPet ? 'Editar Pet' : 'Adicionar Pet'}
              </h3>
              <button
                onClick={() => {
                  setShowPetModal(false)
                  setPetFormData({ nome: '', caracteristica: '', observacoes: '' })
                  setEditingPet(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handlePetModalSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Nome do Pet *
                  </label>
                  <input
                    type="text"
                    value={petFormData.nome}
                    onChange={(e) => setPetFormData({ ...petFormData, nome: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Miau, Rex, Bidu..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Características
                  </label>
                  <input
                    type="text"
                    value={petFormData.caracteristica}
                    onChange={(e) => setPetFormData({ ...petFormData, caracteristica: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: Gato persa branco, Cachorro SRD..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">
                    Observações
                  </label>
                  <textarea
                    value={petFormData.observacoes}
                    onChange={(e) => setPetFormData({ ...petFormData, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Ex: É assustado, gosta de brincar, alérgico a..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPetModal(false)
                      setPetFormData({ nome: '', caracteristica: '', observacoes: '' })
                      setEditingPet(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-sm font-medium text-white bg-primary-500 rounded-md hover:bg-primary-600"
                  >
                    {editingPet ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização para Não-Admins */}
      {showViewModal && viewingClient && (
        <div className="fixed inset-0 z-50 overflow-y-auto pt-16 md:pt-0">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeViewModal}></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
              <div className="bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 px-6 py-3 flex justify-between items-center">
                <div>
                  <h3 className="text-base leading-6 font-medium text-gray-900">
                    Informações do Cliente
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Visualização dos dados compartilhados
                  </p>
                </div>
                <button onClick={closeViewModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                {/* Informações Básicas */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Dados do Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Nome</label>
                      <div className="mt-0.5 text-sm text-gray-900">{viewingClient.nome}</div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Telefone</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {maskField('telefone', viewingClient.telefone || '—')}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">Email</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {maskField('email', viewingClient.email || '—')}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">Valor Diária</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {maskField('valor_diaria', `R$ ${viewingClient.valor_diaria.toFixed(2)}`)}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700">Valor Duas Visitas</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {maskField('valor_duas_visitas', `R$ ${viewingClient.valor_duas_visitas.toFixed(2)}`)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <label className="block text-xs font-medium text-gray-700">Endereço Completo</label>
                    <div className="mt-0.5 text-sm text-gray-900">
                      {maskField('endereco_completo', viewingClient.endereco_completo || '—')}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700">Veterinário de Confiança</label>
                    <div className="mt-0.5 text-sm text-gray-900">
                      {maskField('veterinario_confianca', viewingClient.veterinario_confianca || '—')}
                    </div>
                  </div>

                  {viewingClient.observacoes && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700">Observações</label>
                      <div className="mt-0.5 text-sm text-gray-900">
                        {maskField('observacoes', viewingClient.observacoes)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Pets */}
                {viewingPets.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Pets ({viewingPets.length})
                    </h4>
                    <div className="space-y-2">
                      {viewingPets.map((pet) => (
                        <div key={pet.id} className="bg-white rounded-md p-3 border border-gray-200">
                          <div className="font-medium text-sm text-gray-900 mb-1.5">{pet.nome}</div>
                          <div className="text-xs text-gray-600 mb-1">
                            <span className="font-medium">Característica:</span> {pet.caracteristica || '—'}
                          </div>
                          {pet.observacoes && (
                            <div className="text-xs text-gray-600">
                              <span className="font-medium">Observações:</span> {pet.observacoes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão Fechar */}
              <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-200">
                <button
                  onClick={closeViewModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
