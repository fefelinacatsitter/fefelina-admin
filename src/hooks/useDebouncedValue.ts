import { useEffect, useState } from 'react'

/**
 * Retorna uma versão "atrasada" do valor informado, atualizando somente
 * após `delayMs` sem novas mudanças. Usado para evitar disparar uma
 * requisição ao Supabase a cada tecla digitada em campos de busca.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
