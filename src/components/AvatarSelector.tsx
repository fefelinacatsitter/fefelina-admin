import { AVATARS } from '../lib/avatars'

interface AvatarSelectorProps {
  selectedId: string | null
  onSelect: (avatarId: string) => void
}

export default function AvatarSelector({ selectedId, onSelect }: AvatarSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Escolha seu avatar
      </label>
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {AVATARS.map((avatar) => (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center text-2xl
              transition-all duration-200 hover:scale-110
              ${avatar.bgColor}
              ${selectedId === avatar.id 
                ? 'ring-4 ring-fefelina-primary ring-offset-2 scale-105' 
                : 'ring-2 ring-gray-200 hover:ring-fefelina-primary'
              }
            `}
            title={avatar.label}
          >
            <span className="select-none">{avatar.emoji}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
