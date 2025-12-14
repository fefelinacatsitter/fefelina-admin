import { useState, useRef, useEffect } from 'react'

interface Client {
  id: string
  nome: string
}

interface ClientComboboxProps {
  clients: Client[]
  value: string
  onChange: (clientId: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}

export default function ClientCombobox({ 
  clients, 
  value, 
  onChange, 
  placeholder = "Digite para buscar...",
  required = false,
  disabled = false
}: ClientComboboxProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Encontra o cliente selecionado
  const selectedClient = clients.find(c => c.id === value)

  // Filtra clientes baseado na busca
  const filteredClients = clients.filter(client =>
    client.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Fecha dropdown quando clica fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Reseta o índice destacado quando a lista muda
  useEffect(() => {
    setHighlightedIndex(0)
  }, [searchQuery])

  const handleSelect = (clientId: string) => {
    onChange(clientId)
    setIsOpen(false)
    setSearchQuery('')
    inputRef.current?.blur()
  }

  const handleClear = () => {
    onChange('')
    setSearchQuery('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key !== 'Escape') {
      setIsOpen(true)
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => 
          prev < filteredClients.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
        break
      case 'Enter':
        e.preventDefault()
        if (filteredClients.length > 0) {
          handleSelect(filteredClients[highlightedIndex].id)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSearchQuery('')
        break
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchQuery : (selectedClient?.nome || '')}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required && !value}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-20 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              tabIndex={-1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            type="button"
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            tabIndex={-1}
            disabled={disabled}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dropdown com sugestões */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredClients.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Nenhum cliente encontrado
            </div>
          ) : (
            <ul className="py-1">
              {filteredClients.map((client, index) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(client.id)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      index === highlightedIndex
                        ? 'bg-primary-50 text-primary-900'
                        : 'text-gray-900 hover:bg-gray-50'
                    } ${
                      client.id === value ? 'font-medium bg-primary-100' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{client.nome}</span>
                      {client.id === value && (
                        <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          
          {searchQuery && filteredClients.length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200">
              {filteredClients.length} cliente(s) encontrado(s)
            </div>
          )}
        </div>
      )}
    </div>
  )
}
