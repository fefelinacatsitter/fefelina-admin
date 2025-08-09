import { useState, useEffect } from 'react'
import { supabase, Client, Pet } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingClient, setDeletingClient] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [existingPets, setExistingPets] = useState<Pet[]>([])
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Client | null>(null)
  const [sortBy, setSortBy] = useState<'recent_services' | 'alphabetical'>('recent_services')
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [formData, setFormData] = useState({
    nome: '',
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
        // Ordenar por serviços mais recentes
        const { data, error } = await supabase
          .from('clients')
          .select(`
            *,
            services (
              data_inicio,
              data_fim,
              created_at
            )
          `)
        
        if (error) throw error
        
        // Ordenar do lado do cliente por serviço mais recente
        const sortedClients = (data || []).sort((a, b) => {
          const aLatestService = a.services?.length > 0 
            ? Math.max(...a.services.map((s: any) => new Date(s.created_at).getTime()))
            : 0
          const bLatestService = b.services?.length > 0 
            ? Math.max(...b.services.map((s: any) => new Date(s.created_at).getTime()))
            : 0
          
          return bLatestService - aLatestService
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handlePetChange = (index: number, field: string, value: string) => {
    const updatedPets = [...pets]
    updatedPets[index] = { ...updatedPets[index], [field]: value }
    setPets(updatedPets)
  }

  const addPetField = () => {
    setPets([{ nome: '', caracteristica: '', observacoes: '' }, ...pets])
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
      setExistingPets([])
    } else {
      setExistingPets(petsData || [])
    }
    
    // Limpar formulário de novos pets
    setPets([{ nome: '', caracteristica: '', observacoes: '' }])
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
    setExistingPets([])
    setFormData({
      nome: '',
      valor_diaria: '',
      valor_duas_visitas: '',
      endereco_completo: '',
      veterinario_confianca: ''
    })
    setPets([{ nome: '', caracteristica: '', observacoes: '' }])
  }

  const handleDeleteClient = async (client: Client) => {
    setShowDeleteConfirm(client)
  }

  const confirmDeleteClient = async () => {
    if (!showDeleteConfirm) return

    const client = showDeleteConfirm
    setDeletingClient(client.id)
    setShowDeleteConfirm(null)

    try {
      // Buscar IDs dos serviços do cliente primeiro
      const { data: servicesData } = await supabase
        .from('services')
        .select('id')
        .eq('client_id', client.id)

      const serviceIds = servicesData?.map(s => s.id) || []

      // Excluir em cascata de forma organizada
      if (serviceIds.length > 0) {
        // 1. Excluir visitas dos serviços
        await supabase
          .from('visits')
          .delete()
          .in('service_id', serviceIds)

        // 2. Excluir serviços
        await supabase
          .from('services')
          .delete()
          .eq('client_id', client.id)
      }

      // 3. Excluir pets
      await supabase
        .from('pets')
        .delete()
        .eq('client_id', client.id)

      // 4. Excluir cliente
      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', client.id)

      if (clientError) {
        throw clientError
      }

      // Sucesso
      toast.success(`Cliente "${client.nome}" excluído com sucesso!`)
      fetchClients()

    } catch (error: any) {
      console.error('Erro ao excluir cliente:', error)
      toast.error(`Erro ao excluir cliente: ${error.message}`)
    } finally {
      setDeletingClient(null)
    }
  }
  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-secondary-700">Clientes</h1>
          <p className="mt-2 text-sm text-secondary-500">
            Lista de todos os clientes registrados no sistema.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow-fefelina hover:bg-primary-600 hover:shadow-fefelina-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 sm:w-auto transition-all duration-300 transform hover:-translate-y-1"
          >
            Adicionar Cliente
          </button>
        </div>
      </div>

      {/* Modal de Adicionar Cliente */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-fefelina-hover rounded-2xl bg-white">
            <div className="mt-3">
              <h3 className="text-xl font-semibold text-primary-500 mb-6 text-center">Adicionar Novo Cliente</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 border-b pb-2">Dados do Cliente</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valor Diária (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_diaria"
                        value={formData.valor_diaria}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valor 2 Visitas (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_duas_visitas"
                        value={formData.valor_duas_visitas}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Endereço Completo</label>
                      <textarea
                        name="endereco_completo"
                        value={formData.endereco_completo}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setFormData({
                        nome: '',
                        valor_diaria: '',
                        valor_duas_visitas: '',
                        endereco_completo: '',
                        veterinario_confianca: ''
                      })
                      setPets([{ nome: '', caracteristica: '', observacoes: '' }])
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Cliente: {editingClient.nome}</h3>
              <form onSubmit={handleEditSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dados do Cliente */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-800 border-b pb-2">Dados do Cliente</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                      <input
                        type="text"
                        name="nome"
                        value={formData.nome}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valor Diária (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_diaria"
                        value={formData.valor_diaria}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Valor 2 Visitas (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        name="valor_duas_visitas"
                        value={formData.valor_duas_visitas}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Endereço Completo</label>
                      <textarea
                        name="endereco_completo"
                        value={formData.endereco_completo}
                        onChange={handleInputChange}
                        required
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
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
                    <div className="border-b pb-2">
                      <h4 className="text-md font-medium text-gray-800">Pets do Cliente</h4>
                    </div>
                    
                    {/* Pets Existentes */}
                    {existingPets.length > 0 && (
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-700">Pets já cadastrados:</h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {existingPets.map((pet) => (
                            <div key={pet.id} className="bg-blue-50 border border-blue-200 rounded-md p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="font-medium text-blue-900">{pet.nome}</p>
                                  <p className="text-sm text-blue-700">{pet.caracteristica}</p>
                                  {pet.observacoes && (
                                    <p className="text-xs text-blue-600 mt-1">{pet.observacoes}</p>
                                  )}
                                </div>
                                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                  Para editar, use o menu Pets
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Adicionar Novos Pets */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h5 className="text-sm font-medium text-gray-700">Adicionar novos pets:</h5>
                        <button
                          type="button"
                          onClick={addPetField}
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          + Adicionar Pet
                        </button>
                      </div>
                      
                      <div className="max-h-64 overflow-y-auto space-y-3">
                        {pets.map((pet, index) => (
                          <div key={index} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">Novo Pet {index + 1}</span>
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
                            
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={pet.nome}
                                onChange={(e) => handlePetChange(index, 'nome', e.target.value)}
                                placeholder="Nome do pet"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                              <input
                                type="text"
                                value={pet.caracteristica}
                                onChange={(e) => handlePetChange(index, 'caracteristica', e.target.value)}
                                placeholder="Características"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                              <textarea
                                value={pet.observacoes}
                                onChange={(e) => handlePetChange(index, 'observacoes', e.target.value)}
                                placeholder="Observações"
                                rows={1}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeEditForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            <div key={client.id} className="bg-white rounded-lg shadow-sm border p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-medium text-gray-900 text-lg">{client.nome}</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEditForm(client)}
                    className="text-primary-600 hover:text-primary-900 text-sm"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client)}
                    disabled={deletingClient === client.id}
                    className={`text-sm ${
                      deletingClient === client.id 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-600 hover:text-red-900'
                    }`}
                  >
                    {deletingClient === client.id ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Diária:</span>
                  <span className="font-medium">R$ {client.valor_diaria.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">2 Visitas:</span>
                  <span className="font-medium">R$ {client.valor_duas_visitas.toFixed(2)}</span>
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
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Diária
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor 2 Visitas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Endereço
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Carregando...
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
                      <tr key={client.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          R$ {client.valor_diaria.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          R$ {client.valor_duas_visitas.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.endereco_completo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => openEditForm(client)}
                            className="text-primary-600 hover:text-primary-900 mr-3"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteClient(client)}
                            disabled={deletingClient === client.id}
                            className={`${
                              deletingClient === client.id 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600 hover:text-red-900'
                            }`}
                          >
                            {deletingClient === client.id ? 'Excluindo...' : 'Excluir'}
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

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-6 border w-full max-w-md shadow-fefelina-hover rounded-2xl bg-white">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmar Exclusão
              </h3>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Tem certeza que deseja excluir o cliente <strong>"{showDeleteConfirm?.nome}"</strong>?
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
                  <p className="text-sm font-medium text-red-800 mb-2">⚠️ ATENÇÃO: Esta ação irá excluir também:</p>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• Todos os pets do cliente</li>
                    <li>• Todos os serviços relacionados</li>
                    <li>• Todas as visitas agendadas</li>
                  </ul>
                  <p className="text-sm font-medium text-red-800 mt-2">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteClient}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
