import { useRef, useState } from 'react'
import MarkdownContent from './MarkdownContent'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
  autoFocus?: boolean
}

type FormatType = 'bold' | 'italic' | 'strike' | 'ul' | 'ol' | 'link'

const TOOLBAR_BUTTONS: { type: FormatType; label: string; title: string; className?: string }[] = [
  { type: 'bold', label: 'B', title: 'Negrito', className: 'font-bold' },
  { type: 'italic', label: 'I', title: 'Itálico', className: 'italic' },
  { type: 'strike', label: 'S', title: 'Riscado', className: 'line-through' },
  { type: 'ul', label: '• Lista', title: 'Lista com marcadores' },
  { type: 'ol', label: '1. Lista', title: 'Lista numerada' },
  { type: 'link', label: '🔗', title: 'Link' },
]

/**
 * Editor de texto com suporte a formatação Markdown (negrito, itálico, listas,
 * links, etc.) através de uma barra de ferramentas simples, além de uma
 * alternância para pré-visualizar o resultado renderizado.
 */
export default function MarkdownEditor({ value, onChange, rows = 12, placeholder, autoFocus }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Se já existe conteúdo salvo, abre em modo de visualização (mostrando a
  // formatação renderizada). Se estiver vazio, abre direto em modo de edição.
  const [showPreview, setShowPreview] = useState(!!value.trim())

  const applyFormat = (type: FormatType) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)

    if (type === 'ul' || type === 'ol') {
      const target = selected || (type === 'ul' ? 'item da lista' : 'primeiro item')
      const prefixed = target
        .split('\n')
        .map((line, i) => (type === 'ul' ? `- ${line}` : `${i + 1}. ${line}`))
        .join('\n')

      const newValue = value.slice(0, start) + prefixed + value.slice(end)
      onChange(newValue)
      requestAnimationFrame(() => {
        textarea.focus()
        textarea.setSelectionRange(start, start + prefixed.length)
      })
      return
    }

    let before = ''
    let after = ''
    let placeholderText = ''

    if (type === 'bold') {
      before = after = '**'
      placeholderText = 'texto em negrito'
    } else if (type === 'italic') {
      before = after = '*'
      placeholderText = 'texto em itálico'
    } else if (type === 'strike') {
      before = after = '~~'
      placeholderText = 'texto riscado'
    } else if (type === 'link') {
      before = '['
      after = '](https://)'
      placeholderText = 'texto do link'
    }

    const textToWrap = selected || placeholderText
    const newValue = `${value.slice(0, start)}${before}${textToWrap}${after}${value.slice(end)}`
    onChange(newValue)

    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + textToWrap.length)
    })
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
      <div className="flex items-center flex-wrap gap-1 bg-gray-50 border-b border-gray-200 px-2 py-1.5">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.type}
            type="button"
            title={btn.title}
            onClick={() => applyFormat(btn.type)}
            disabled={showPreview}
            className={`px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${btn.className || ''}`}
          >
            {btn.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            showPreview ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showPreview ? 'Editar' : 'Visualizar'}
        </button>
      </div>

      {showPreview ? (
        <div className="px-4 py-3 overflow-y-auto" style={{ minHeight: rows * 24 }}>
          {value ? (
            <MarkdownContent content={value} />
          ) : (
            <p className="text-sm text-gray-400 italic">Nada para visualizar ainda...</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full px-4 py-3 text-sm border-0 focus:outline-none focus:ring-0 resize-none"
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
      )}
    </div>
  )
}
