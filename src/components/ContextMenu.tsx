import { useState, useEffect, useRef } from 'react'

interface ContextMenuItem {
  label: string
  icon: string
  onClick: () => void
  color?: string
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState({ x, y })

  useEffect(() => {
    // Ajustar posição para não sair da tela
    if (menuRef.current) {
      const menu = menuRef.current
      const menuRect = menu.getBoundingClientRect()
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      let newX = x
      let newY = y

      // Ajustar X se sair pela direita
      if (x + menuRect.width > windowWidth) {
        newX = windowWidth - menuRect.width - 10
      }

      // Ajustar Y se sair por baixo
      if (y + menuRect.height > windowHeight) {
        newY = windowHeight - menuRect.height - 10
      }

      setAdjustedPosition({ x: newX, y: newY })
    }
  }, [x, y])

  useEffect(() => {
    // Fechar ao clicar fora ou pressionar ESC
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white rounded-lg shadow-2xl border border-gray-200 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className={`w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-100 transition-colors text-sm ${
            item.color || 'text-gray-700'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
