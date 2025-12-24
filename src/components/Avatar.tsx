import { getAvatar, getInitials } from '../lib/avatars'

interface AvatarProps {
  avatarId?: string | null
  name: string
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  '2xs': 'w-4 h-4 text-[10px]',
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-2xl'
}

export default function Avatar({ avatarId, name, size = 'md', className = '' }: AvatarProps) {
  const avatar = getAvatar(avatarId)

  return (
    <div
      className={`${sizeClasses[size]} ${avatar.bgColor} rounded-full flex items-center justify-center font-medium text-gray-700 ${className}`}
      title={name}
    >
      <span className="select-none">{avatar.emoji}</span>
    </div>
  )
}
