import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const STORAGE_KEY = 'fefelina_showValues'

interface ValuesVisibilityContextType {
  showValues: boolean
  toggleShowValues: () => void
  // Formata um valor monetário em BRL, retornando um texto mascarado
  // ("R$ ••••••") quando o usuário optou por ocultar os valores.
  formatCurrency: (value: number) => string
}

const ValuesVisibilityContext = createContext<ValuesVisibilityContextType | undefined>(undefined)

export function ValuesVisibilityProvider({ children }: { children: ReactNode }) {
  // Preferência global (vale para todas as páginas), persistida no localStorage
  const [showValues, setShowValues] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved !== null ? saved === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, showValues.toString())
  }, [showValues])

  const toggleShowValues = () => setShowValues(prev => !prev)

  const formatCurrency = (value: number) => {
    if (!showValues) {
      return 'R$ ••••••'
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <ValuesVisibilityContext.Provider value={{ showValues, toggleShowValues, formatCurrency }}>
      {children}
    </ValuesVisibilityContext.Provider>
  )
}

export function useValuesVisibility() {
  const context = useContext(ValuesVisibilityContext)
  if (!context) {
    throw new Error('useValuesVisibility deve ser usado dentro de um ValuesVisibilityProvider')
  }
  return context
}
