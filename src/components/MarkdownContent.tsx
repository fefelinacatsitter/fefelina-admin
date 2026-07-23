import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownContentProps {
  content: string
  className?: string
}

/**
 * Renderiza texto em Markdown (negrito, itálico, listas, links, etc.) de forma
 * segura - react-markdown não interpreta HTML bruto e sanitiza URLs de links,
 * evitando XSS.
 */
export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`text-sm text-gray-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="line-through">{children}</del>,
          ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline hover:text-primary-700"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-xs">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600">{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
