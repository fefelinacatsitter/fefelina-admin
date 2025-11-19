import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

interface Visit {
  id: string
  service_id: string
  data: string
  horario: string
  tipo_visita: 'inteira' | 'meia'
  valor: number
  status: 'agendada' | 'realizada' | 'cancelada'
  desconto_plataforma: number
  observacoes?: string
  clients: {
    nome: string
    endereco_completo?: string
  } | null
  services: {
    nome_servico?: string
  } | null
}

type ViewMode = 'day' | 'week'

export default function AgendaPage() {
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [draggingVisit, setDraggingVisit] = useState<Visit | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isDraggingTouch, setIsDraggingTouch] = useState(false)

  // Gerar array de horários com meias horas (6h às 22h)
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6
    return [
      { time: `${hour.toString().padStart(2, '0')}:00`, isHalf: false },
      { time: `${hour.toString().padStart(2, '0')}:30`, isHalf: true }
    ]
  }).flat()

  // Forçar modo dia no mobile
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 640 // sm breakpoint do Tailwind
      if (isMobile && viewMode === 'week') {
        setViewMode('day')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [viewMode])

  // Cleanup do timer de long press ao desmontar
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
      }
    }
  }, [longPressTimer])

  useEffect(() => {
    fetchVisits()
  }, [currentDate, viewMode])

  // Restaurar scroll após carregar visitas
  useEffect(() => {
    if (!loading && scrollPosition > 0) {
      const scrollContainer = document.querySelector('.overflow-auto')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollPosition
        setScrollPosition(0) // Resetar após restaurar
      }
    }
  }, [loading, scrollPosition])

  const fetchVisits = async () => {
    try {
      setLoading(true)
      
      let startDate: Date
      let endDate: Date

      if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { locale: ptBR })
        endDate = endOfWeek(currentDate, { locale: ptBR })
      } else {
        startDate = startOfDay(currentDate)
        endDate = endOfDay(currentDate)
      }

      const { data, error } = await supabase
        .from('visits')
        .select(`
          *,
          clients (nome, endereco_completo),
          services (nome_servico)
        `)
        .gte('data', format(startDate, 'yyyy-MM-dd'))
        .lte('data', format(endDate, 'yyyy-MM-dd'))
        .in('status', ['agendada', 'realizada'])
        .order('data', { ascending: true })
        .order('horario', { ascending: true })

      if (error) throw error
      
      setVisits(data || [])
    } catch (error) {
      console.error('Erro ao buscar visitas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { locale: ptBR })
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }

  const navigatePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, -7))
    } else {
      setCurrentDate(prev => addDays(prev, -1))
    }
  }

  const navigateNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(prev => addDays(prev, 7))
    } else {
      setCurrentDate(prev => addDays(prev, 1))
    }
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getVisitColor = (visit: Visit) => {
    // Cor base por tipo de visita
    const baseColor = visit.tipo_visita === 'inteira' 
      ? 'bg-blue-100 border-blue-400 text-blue-900'
      : 'bg-orange-100 border-orange-400 text-orange-900'
    
    // Adicionar opacidade se for realizada
    if (visit.status === 'realizada') {
      return visit.tipo_visita === 'inteira'
        ? 'bg-blue-50 border-blue-300 text-blue-700 opacity-75'
        : 'bg-orange-50 border-orange-300 text-orange-700 opacity-75'
    }
    
    return baseColor
  }

  // Função para verificar se uma visita tem conflitos de horário
  const getVisitConflicts = (date: Date, time: string) => {
    const visitsAtTime = visits.filter(visit => {
      const visitDate = parseISO(visit.data);
      const visitTime = visit.horario.substring(0, 5);
      
      if (!isSameDay(visitDate, date)) return false;
      
      // Verificar se a visita ocupa este slot
      if (visitTime === time) return true;
      
      // Se for visita inteira que começou no slot anterior (:30), ela ocupa este slot
      if (visit.tipo_visita === 'inteira') {
        const [hour, minute] = visitTime.split(':').map(Number);
        if (minute === 30) {
          const nextHour = `${String(hour + 1).padStart(2, '0')}:00`;
          if (nextHour === time) return true;
        } else {
          const nextSlot = `${String(hour).padStart(2, '0')}:30`;
          if (nextSlot === time) return true;
        }
      }
      
      return false;
    });
    
    return visitsAtTime;
  };

  const handleVisitClick = (visit: Visit) => {
    setSelectedVisit(visit)
    setShowModal(true)
  }

  const handleDragStart = (e: React.DragEvent, visit: Visit) => {
    setDraggingVisit(visit)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Suporte para touch (mobile) com long press
  const handleTouchStart = (e: React.TouchEvent, visit: Visit) => {
    // Iniciar timer de long press (500ms)
    const timer = setTimeout(() => {
      setDraggingVisit(visit)
      setIsDraggingTouch(true)
      const target = e.currentTarget as HTMLElement
      target.style.opacity = '0.5'
      // Vibrar no celular para feedback tátil
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
    }, 500) // 500ms = meio segundo de pressão
    
    setLongPressTimer(timer)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Se ainda não iniciou o drag (timer não completou), cancelar o timer
    if (!isDraggingTouch && longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
      return
    }
    
    // Se está arrastando, prevenir scroll
    if (isDraggingTouch) {
      e.preventDefault()
    }
  }

  const handleTouchCancel = () => {
    // Cancelar qualquer operação de drag em andamento
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }
    setDraggingVisit(null)
    setIsDraggingTouch(false)
  }

  const handleTouchEnd = async (e: React.TouchEvent) => {
    // Limpar timer se existir (usuário soltou antes de 500ms)
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    const targetElement = e.currentTarget as HTMLElement

    // Se não estava arrastando, não fazer nada (foi apenas um toque/scroll)
    if (!isDraggingTouch || !draggingVisit) {
      targetElement.style.opacity = '1'
      targetElement.style.visibility = 'visible'
      setDraggingVisit(null)
      setIsDraggingTouch(false)
      return
    }

    // Importante: usar changedTouches[0] para pegar a última posição do dedo
    const touch = e.changedTouches[0]
    if (!touch) {
      console.log('Touch não encontrado')
      setDraggingVisit(null)
      setIsDraggingTouch(false)
      targetElement.style.opacity = '1'
      targetElement.style.visibility = 'visible'
      return
    }

    // IMPORTANTE: Esconder temporariamente o elemento que está sendo arrastado
    // para que elementFromPoint consiga detectar o que está embaixo
    targetElement.style.visibility = 'hidden'

    // Pegar o elemento na posição onde o dedo foi levantado
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    console.log('Elemento encontrado:', element)
    
    // Restaurar visibilidade
    targetElement.style.visibility = 'visible'
    
    // Encontrar o elemento drop zone mais próximo
    const dropZone = element?.closest('[data-drop-zone]') as HTMLElement
    console.log('Drop zone:', dropZone)
    
    if (dropZone) {
      const day = dropZone.getAttribute('data-day')
      const time = dropZone.getAttribute('data-time')
      
      console.log('Day:', day, 'Time:', time)
      
      if (day && time) {
        const newDate = day
        const newTime = time

        // Não fazer nada se soltar no mesmo lugar
        if (draggingVisit.data === newDate && draggingVisit.horario.substring(0, 5) === newTime) {
          console.log('Mesma posição, não reagendar')
          setDraggingVisit(null)
          setIsDraggingTouch(false)
          targetElement.style.opacity = '1'
          return
        }

        // Salvar posição do scroll
        const scrollContainer = document.querySelector('.overflow-auto')
        if (scrollContainer) {
          setScrollPosition(scrollContainer.scrollTop)
        }

        console.log('Reagendando de', draggingVisit.data, draggingVisit.horario, 'para', newDate, newTime)

        try {
          const { error } = await supabase
            .from('visits')
            .update({
              data: newDate,
              horario: newTime + ':00'
            })
            .eq('id', draggingVisit.id)

          if (error) {
            console.error('Erro Supabase:', error)
            throw error
          }

          toast.success('Visita reagendada com sucesso!')
          await fetchVisits()
        } catch (error) {
          console.error('Erro ao reagendar visita:', error)
          toast.error('Erro ao reagendar visita')
        }
      } else {
        console.log('Day ou time não encontrados')
      }
    } else {
      console.log('Drop zone não encontrado - touch fora da área válida')
    }
    
    setDraggingVisit(null)
    setIsDraggingTouch(false)
    targetElement.style.opacity = '1'
  }

  const handleDrop = async (e: React.DragEvent, day: Date, timeSlot: string) => {
    e.preventDefault()
    
    if (!draggingVisit) return

    const newDate = format(day, 'yyyy-MM-dd')
    const newTime = timeSlot

    // Não fazer nada se soltar no mesmo lugar
    if (draggingVisit.data === newDate && draggingVisit.horario.substring(0, 5) === newTime) {
      setDraggingVisit(null)
      return
    }

    // Salvar posição do scroll antes de atualizar
    const scrollContainer = document.querySelector('.overflow-auto')
    if (scrollContainer) {
      setScrollPosition(scrollContainer.scrollTop)
    }

    try {
      const { error } = await supabase
        .from('visits')
        .update({
          data: newDate,
          horario: newTime + ':00'
        })
        .eq('id', draggingVisit.id)

      if (error) throw error

      toast.success('Visita reagendada com sucesso!')
      await fetchVisits() // Recarregar visitas
    } catch (error) {
      console.error('Erro ao reagendar visita:', error)
      toast.error('Erro ao reagendar visita')
    } finally {
      setDraggingVisit(null)
    }
  }

  const renderDayView = () => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Header do dia */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="grid grid-cols-[80px_1fr]">
              <div className="border-r border-gray-200 p-2"></div>
              <div className="p-3 text-center font-semibold bg-gray-50">
                <div className="text-sm text-gray-600">
                  {format(currentDate, 'EEEE', { locale: ptBR })}
                </div>
                <div className="text-lg">
                  {format(currentDate, 'dd/MM/yyyy')}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de horários */}
          <div className="relative">
            {timeSlots.map((slot) => {
              const visitsAtTime = getVisitConflicts(currentDate, slot.time)
              const hasVisits = visitsAtTime.length > 0
              const hasConflict = visitsAtTime.length > 1
              
              return (
                <div 
                  key={slot.time} 
                  className={`grid grid-cols-[80px_1fr] ${
                    slot.isHalf ? 'border-b border-dashed border-gray-300' : 'border-b border-gray-200'
                  } ${hasVisits ? 'min-h-[80px]' : 'min-h-[40px]'}`}
                >
                  {/* Coluna de horário */}
                  <div className="border-r border-gray-200 p-2 text-sm text-gray-600 font-medium">
                    {slot.isHalf ? (
                      <span className="text-xs text-gray-400">{slot.time}</span>
                    ) : (
                      <span>{slot.time}</span>
                    )}
                  </div>

                  {/* Coluna do dia - Drop zone */}
                  <div 
                    className="p-2 relative"
                    data-drop-zone="true"
                    data-day={format(currentDate, 'yyyy-MM-dd')}
                    data-time={slot.time}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, currentDate, slot.time)}
                  >
                    {hasConflict && (
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl z-20">
                        ⚠️ Conflito
                      </div>
                    )}
                    <div className={hasConflict ? 'grid grid-cols-2 gap-1 auto-rows-min' : ''}>
                      {visitsAtTime.map((visit) => {
                        // Só renderizar visitas que começam neste horário exato
                        if (visit.horario.substring(0, 5) !== slot.time) return null;
                        
                        return (
                          <div
                            key={visit.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, visit)}
                            onTouchStart={(e) => handleTouchStart(e, visit)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchCancel}
                            onClick={() => {
                              // Só abre modal se não estiver arrastando
                              if (!draggingVisit && !isDraggingTouch) {
                                handleVisitClick(visit)
                              }
                            }}
                            className={`p-1.5 rounded border cursor-move hover:shadow-md transition-shadow ${
                              visit.tipo_visita === 'inteira' 
                                ? hasConflict ? 'text-[10px]' : 'absolute left-2 right-2 top-0 z-10 text-xs'
                                : hasConflict ? 'text-[10px]' : 'text-xs'
                            } ${getVisitColor(visit)} ${
                              hasConflict ? 'border-2 border-red-500' : ''
                            }`}
                            style={visit.tipo_visita === 'inteira' && !hasConflict ? {
                              height: `${hasVisits ? 160 : 80}px`, // 2 slots de altura
                              maxHeight: '160px'
                            } : undefined}
                          >
                            <div className="font-semibold truncate leading-tight">
                              {visit.clients?.nome || 'Cliente não identificado'}
                            </div>
                            {!hasConflict && (
                              <div className="truncate opacity-90 leading-tight mt-0.5">
                                {visit.services?.nome_servico || 'Serviço não identificado'}
                              </div>
                            )}
                            <div className="opacity-75 mt-0.5 leading-tight">
                              {visit.horario.substring(0, 5)} • {visit.tipo_visita === 'inteira' ? '1h' : '30min'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  const renderWeekView = () => {
    const weekDays = getWeekDays()

    return (
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {/* Header da semana */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="grid grid-cols-[80px_repeat(7,1fr)]">
              <div className="border-r border-gray-200 p-2"></div>
              {weekDays.map(day => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center border-r border-gray-200 ${
                      isToday ? 'bg-blue-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-xs text-gray-600 font-medium">
                      {format(day, 'EEE', { locale: ptBR })}
                    </div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(day, 'dd')}
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'MMM', { locale: ptBR })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Grid de horários */}
          <div className="relative">
            {timeSlots.map((slot) => (
              <div 
                key={slot.time} 
                className={`grid grid-cols-[80px_repeat(7,1fr)] ${
                  slot.isHalf ? 'border-b border-dashed border-gray-300' : 'border-b border-gray-200'
                } min-h-[40px]`}
              >
                {/* Coluna de horário */}
                <div className="border-r border-gray-200 p-2 text-sm text-gray-600 font-medium">
                  {slot.isHalf ? (
                    <span className="text-xs text-gray-400">{slot.time}</span>
                  ) : (
                    <span>{slot.time}</span>
                  )}
                </div>

                {/* Colunas dos dias */}
                {weekDays.map(day => {
                  const visitsAtTime = getVisitConflicts(day, slot.time)
                  const isToday = isSameDay(day, new Date())
                  const hasConflict = visitsAtTime.length > 1

                  return (
                    <div
                      key={day.toISOString()}
                      className={`border-r border-gray-200 p-1 relative ${
                        isToday ? 'bg-blue-50/30' : ''
                      }`}
                      data-drop-zone="true"
                      data-day={format(day, 'yyyy-MM-dd')}
                      data-time={slot.time}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, slot.time)}
                    >
                      {hasConflict && (
                        <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1 rounded-bl z-20">
                          ⚠️
                        </div>
                      )}
                      <div className={hasConflict ? 'grid grid-cols-2 gap-0.5 auto-rows-min' : ''}>
                        {visitsAtTime.map(visit => {
                          // Só renderizar visitas que começam neste horário exato
                          if (visit.horario.substring(0, 5) !== slot.time) return null;
                          
                          return (
                            <div
                              key={visit.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, visit)}
                              onTouchStart={(e) => handleTouchStart(e, visit)}
                              onTouchMove={handleTouchMove}
                              onTouchEnd={handleTouchEnd}
                              onTouchCancel={handleTouchCancel}
                              onClick={() => {
                                if (!draggingVisit && !isDraggingTouch) {
                                  handleVisitClick(visit)
                                }
                              }}
                              className={`p-1 rounded border cursor-move hover:shadow-md transition-shadow ${
                                visit.tipo_visita === 'inteira' 
                                  ? hasConflict ? 'text-[8px]' : 'absolute left-1 right-1 top-0 z-10 text-xs'
                                  : hasConflict ? 'text-[8px]' : 'text-xs'
                              } ${getVisitColor(visit)} ${
                                hasConflict ? 'border-2 border-red-500' : ''
                              }`}
                              style={visit.tipo_visita === 'inteira' && !hasConflict ? {
                                height: '80px', // 2 slots de altura
                                maxHeight: '80px'
                              } : undefined}
                            >
                              <div className="font-semibold truncate leading-tight">
                                {visit.clients?.nome || 'Cliente não identificado'}
                              </div>
                              {!hasConflict && (
                                <div className="truncate text-[9px] opacity-75 leading-tight mt-0.5">
                                  {visit.tipo_visita === 'inteira' ? '1h' : '30min'}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Título e navegação */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
            
            <div className="flex items-center gap-2">
              <button
                onClick={navigatePrevious}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Hoje
              </button>
              
              <button
                onClick={navigateNext}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
                title="Próximo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="text-lg font-semibold text-gray-700">
              {viewMode === 'week' ? (
                <>
                  {format(startOfWeek(currentDate, { locale: ptBR }), 'dd MMM', { locale: ptBR })} - {' '}
                  {format(endOfWeek(currentDate, { locale: ptBR }), 'dd MMM yyyy', { locale: ptBR })}
                </>
              ) : (
                format(currentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
              )}
            </div>
          </div>

          {/* Controles de visualização - Esconder no mobile */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo da agenda */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2 animate-pulse" />
            <p className="text-gray-600">Carregando agenda...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: sempre dia, Desktop: conforme seleção */}
          <div className="sm:hidden flex-1 overflow-hidden flex flex-col">
            {renderDayView()}
          </div>
          <div className="hidden sm:flex flex-1 overflow-hidden flex-col">
            {viewMode === 'day' ? renderDayView() : renderWeekView()}
          </div>
        </>
      )}

      {/* Modal de detalhes da visita */}
      {showModal && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header da modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detalhes da Visita
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {format(parseISO(selectedVisit.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Conteúdo da modal */}
            <div className="px-6 py-4 space-y-6">
              {/* Informações da visita */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Cliente</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {selectedVisit.clients?.nome || 'Não identificado'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedVisit.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                      selectedVisit.status === 'realizada' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedVisit.status === 'agendada' ? 'Agendada' :
                       selectedVisit.status === 'realizada' ? 'Realizada' : 'Cancelada'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Horário</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {selectedVisit.horario.substring(0, 5)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Tipo de Visita</label>
                  <p className="mt-1">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedVisit.tipo_visita === 'inteira' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {selectedVisit.tipo_visita === 'inteira' ? 'Visita Inteira' : 'Meia Visita'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Valor da Visita</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    R$ {selectedVisit.valor.toFixed(2)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Desconto Plataforma</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    R$ {selectedVisit.desconto_plataforma.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="text-xs font-semibold text-gray-500 uppercase">Valor a Receber</label>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  R$ {(selectedVisit.valor - selectedVisit.desconto_plataforma).toFixed(2)}
                </p>
              </div>

              {selectedVisit.clients?.endereco_completo && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Endereço do Cliente</label>
                  <p className="text-base font-medium text-gray-900 mt-1">
                    {selectedVisit.clients.endereco_completo}
                  </p>
                </div>
              )}

              {/* Observações */}
              {selectedVisit.observacoes && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="text-xs font-semibold text-gray-500 uppercase">Observações</label>
                  <p className="text-base text-gray-700 mt-2 whitespace-pre-wrap">
                    {selectedVisit.observacoes}
                  </p>
                </div>
              )}
            </div>

            {/* Footer da modal */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
