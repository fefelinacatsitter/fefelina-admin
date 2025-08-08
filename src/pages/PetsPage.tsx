import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Pet {
  id: string
  nome: string
  caracteristica: string
  observacoes?: string
  client_id: string
  created_at: string
  clients?: {
    nome: string
    valor_diaria: number
  }
}

interface Client {
  id: string
  nome: string
  valor_diaria: number
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPet, setEditingPet] = useState<Pet | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    caracteristica: '',
    observacoes: '',
    client_id: ''
  })

  useEffect(() => {
    fetchPets()
    fetchClients()
  }, [])

  const fetchPets = async () => {
    try {
      const { data, error } = await supabase
        .from('pets')
        .select(`
          *,
          clients (
            nome,
            valor_diaria
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPets(data || [])
    } catch (error) {
      console.error('Erro ao buscar pets:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, nome, valor_diaria')
        .order('nome')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const petData = {
      nome: formData.nome,
      caracteristica: formData.caracteristica,
      observacoes: formData.observacoes || null,
      client_id: formData.client_id
    }

    try {
      if (editingPet) {
        const { error } = await supabase
          .from('pets')
          .update(petData)
          .eq('id', editingPet.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pets')
          .insert([petData])
        
        if (error) throw error
      }

      await fetchPets()
      closeModal()
    } catch (error) {
      console.error('Erro ao salvar pet:', error)
      alert('Erro ao salvar pet. Tente novamente.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pet?')) return

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchPets()
    } catch (error) {
      console.error('Erro ao excluir pet:', error)
      alert('Erro ao excluir pet. Tente novamente.')
    }
  }

  const openModal = (pet?: Pet) => {
    if (pet) {
      setEditingPet(pet)
      setFormData({
        nome: pet.nome,
        caracteristica: pet.caracteristica,
        observacoes: pet.observacoes || '',
        client_id: pet.client_id
      })
    } else {
      setEditingPet(null)
      setFormData({
        nome: '',
        caracteristica: '',
        observacoes: '',
        client_id: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPet(null)
    setFormData({
      nome: '',
      caracteristica: '',
      observacoes: '',
      client_id: ''
    })
  }

  if (loading) {
    return (
      <div>
        <h1 className="page-title-fefelina">Pets</h1>
        <div className="divider-fefelina"></div>
        <div className="card-fefelina">
          <div className="empty-state-fefelina">
            <div className="text-gray-500">Carregando pets...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="page-title-fefelina">Pets</h1>
          <p className="mt-2 text-sm text-gray-700">
            Lista de todos os pets cadastrados no sistema.
          </p>
          <div className="divider-fefelina"></div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            className="btn-fefelina"
            onClick={() => openModal()}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Adicionar Pet
          </button>
        </div>
      </div>

      {pets.length === 0 ? (
        <div className="mt-8 card-fefelina">
          <div className="empty-state-fefelina">
            <div className="mx-auto h-16 w-16 text-primary-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum pet cadastrado</h3>
            <p className="text-gray-500 mb-6">
              Comece adicionando um novo pet ao sistema.
            </p>
            <button className="btn-fefelina-secondary" onClick={() => openModal()}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Cadastrar Primeiro Pet
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => (
            <div key={pet.id} className="card-fefelina">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{pet.nome}</h3>
                  <p className="text-sm text-gray-600">{pet.caracteristica}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openModal(pet)}
                    className="text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(pet.id)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                {pet.clients && (
                  <div className="flex items-center text-gray-600">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {pet.clients.nome}
                  </div>
                )}
                
                {pet.observacoes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-gray-700">
                    <p className="text-xs font-medium text-gray-500 mb-1">Observações:</p>
                    <p className="text-sm">{pet.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="modal-fefelina max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="section-title-fefelina">
                {editingPet ? 'Editar Pet' : 'Novo Pet'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Pet *
                </label>
                <input
                  type="text"
                  required
                  className="input-fefelina"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dono *
                </label>
                <select
                  required
                  className="input-fefelina"
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                >
                  <option value="">Selecione o dono</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Características *
                </label>
                <input
                  type="text"
                  required
                  className="input-fefelina"
                  placeholder="Ex: Cão, Golden Retriever, 5 anos, dourado"
                  value={formData.caracteristica}
                  onChange={(e) => setFormData({ ...formData, caracteristica: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações
                </label>
                <textarea
                  rows={3}
                  className="input-fefelina"
                  placeholder="Informações adicionais sobre o pet..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>

              <div className="section-divider-fefelina"></div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="btn-fefelina flex-1"
                >
                  {editingPet ? 'Atualizar Pet' : 'Cadastrar Pet'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-fefelina-secondary flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
