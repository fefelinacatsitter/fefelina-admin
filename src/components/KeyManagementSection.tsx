import { useState, useEffect } from 'react'
import { Key, MapPin, Calendar, Clock } from 'lucide-react'
import { addDays, format } from 'date-fns'

interface KeyManagementSectionProps {
  dataInicio: string
  dataFim: string
  onKeyTasksChange: (tasks: KeyTaskData | null) => void
  initialValues?: KeyTaskData | null
}

export interface KeyTaskData {
  buscarChave: {
    data: string
    horario: string
    local: string
  }
  devolverChave: {
    data: string
    horario: string
    local: string
  }
}

export default function KeyManagementSection({ 
  dataInicio, 
  dataFim, 
  onKeyTasksChange,
  initialValues 
}: KeyManagementSectionProps) {
  const [gerenciarChaves, setGerenciarChaves] = useState(false)
  const [keyTasks, setKeyTasks] = useState<KeyTaskData>({
    buscarChave: {
      data: '',
      horario: '10:00',
      local: 'Casa do cliente'
    },
    devolverChave: {
      data: '',
      horario: '18:00',
      local: 'Casa do cliente'
    }
  })
  
  // Inicializar com valores existentes ao editar
  useEffect(() => {
    if (initialValues) {
      setGerenciarChaves(true)
      setKeyTasks(initialValues)
    }
  }, [initialValues])

  // Calcular datas padrão quando as datas do serviço mudarem
  useEffect(() => {
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T00:00:00')
      
      // Buscar chave: 2 dias antes do início
      const dataBuscar = format(addDays(inicio, -2), 'yyyy-MM-dd')
      
      // Devolver chave: 1 dia após o término
      const dataDevolver = format(addDays(fim, 1), 'yyyy-MM-dd')
      
      setKeyTasks(prev => ({
        buscarChave: {
          ...prev.buscarChave,
          data: dataBuscar
        },
        devolverChave: {
          ...prev.devolverChave,
          data: dataDevolver
        }
      }))
    }
  }, [dataInicio, dataFim])

  // Notificar componente pai sobre mudanças
  useEffect(() => {
    if (gerenciarChaves) {
      onKeyTasksChange(keyTasks)
    } else {
      onKeyTasksChange(null)
    }
  }, [gerenciarChaves, keyTasks, onKeyTasksChange])

  const handleCheckboxChange = (checked: boolean) => {
    setGerenciarChaves(checked)
  }

  const updateBuscarChave = (field: keyof KeyTaskData['buscarChave'], value: string) => {
    setKeyTasks(prev => ({
      ...prev,
      buscarChave: {
        ...prev.buscarChave,
        [field]: value
      }
    }))
  }

  const updateDevolverChave = (field: keyof KeyTaskData['devolverChave'], value: string) => {
    setKeyTasks(prev => ({
      ...prev,
      devolverChave: {
        ...prev.devolverChave,
        [field]: value
      }
    }))
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      {/* Checkbox principal */}
      <div className="flex items-start gap-2 mb-2">
        <input
          type="checkbox"
          id="gerenciar-chaves"
          checked={gerenciarChaves}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <div className="flex-1">
          <label htmlFor="gerenciar-chaves" className="text-sm font-medium text-gray-900 cursor-pointer flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary-600" />
            Gerenciar tarefas de chave
          </label>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Criar lembretes para buscar e devolver a chave
          </p>
        </div>
      </div>

      {/* Formulário expandido - Layout Horizontal Compacto */}
      {gerenciarChaves && (
        <div className="ml-6 pt-2 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2">
            {/* Buscar Chave */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5 text-yellow-700" />
                <h4 className="font-semibold text-yellow-900 text-xs">Buscar</h4>
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    Data
                  </label>
                  <input
                    type="date"
                    value={keyTasks.buscarChave.data}
                    onChange={(e) => updateBuscarChave('data', e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    Horário
                  </label>
                  <input
                    type="time"
                    value={keyTasks.buscarChave.horario}
                    onChange={(e) => updateBuscarChave('horario', e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    Local
                  </label>
                  <input
                    type="text"
                    value={keyTasks.buscarChave.local}
                    onChange={(e) => updateBuscarChave('local', e.target.value)}
                    placeholder="Ex: Casa do cliente..."
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Devolver Chave */}
            <div className="bg-green-50 border border-green-200 rounded p-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Key className="w-3.5 h-3.5 text-green-700" />
                <h4 className="font-semibold text-green-900 text-xs">Devolver</h4>
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    Data
                  </label>
                  <input
                    type="date"
                    value={keyTasks.devolverChave.data}
                    onChange={(e) => updateDevolverChave('data', e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    Horário
                  </label>
                  <input
                    type="time"
                    value={keyTasks.devolverChave.horario}
                    onChange={(e) => updateDevolverChave('horario', e.target.value)}
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-medium text-gray-600 flex items-center gap-1 mb-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    Local
                  </label>
                  <input
                    type="text"
                    value={keyTasks.devolverChave.local}
                    onChange={(e) => updateDevolverChave('local', e.target.value)}
                    placeholder="Ex: Casa do cliente..."
                    className="w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
