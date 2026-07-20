// Coleção de avatares pré-definidos
export interface AvatarOption {
  id: string
  emoji: string
  label: string
  bgColor: string
}

export const AVATARS: AvatarOption[] = [
  { id: 'cat-orange', emoji: '🐱', label: 'Gato Laranja', bgColor: 'bg-primary-100' },
  { id: 'cat-black', emoji: '🐈', label: 'Gato Preto', bgColor: 'bg-gray-100' },
  { id: 'cat-white', emoji: '🐈‍⬛', label: 'Gato Branco', bgColor: 'bg-slate-100' },
  { id: 'dog', emoji: '🐕', label: 'Cachorro', bgColor: 'bg-amber-100' },
  { id: 'dog-service', emoji: '🐕‍🦺', label: 'Cachorro de Serviço', bgColor: 'bg-yellow-100' },
  { id: 'paw', emoji: '🐾', label: 'Patinha', bgColor: 'bg-pink-100' },
  { id: 'heart', emoji: '❤️', label: 'Coração', bgColor: 'bg-red-100' },
  { id: 'star', emoji: '⭐', label: 'Estrela', bgColor: 'bg-yellow-100' },
  { id: 'sparkles', emoji: '✨', label: 'Brilhos', bgColor: 'bg-purple-100' },
  { id: 'flower', emoji: '🌸', label: 'Flor', bgColor: 'bg-pink-100' },
  { id: 'rainbow', emoji: '🌈', label: 'Arco-íris', bgColor: 'bg-indigo-100' },
  { id: 'sun', emoji: '☀️', label: 'Sol', bgColor: 'bg-yellow-100' },
  { id: 'moon', emoji: '🌙', label: 'Lua', bgColor: 'bg-blue-100' },
  { id: 'fire', emoji: '🔥', label: 'Fogo', bgColor: 'bg-primary-100' },
  { id: 'tree', emoji: '🌳', label: 'Árvore', bgColor: 'bg-green-100' },
  { id: 'butterfly', emoji: '🦋', label: 'Borboleta', bgColor: 'bg-purple-100' },
  { id: 'bee', emoji: '🐝', label: 'Abelha', bgColor: 'bg-yellow-100' },
  { id: 'fish', emoji: '🐠', label: 'Peixe', bgColor: 'bg-blue-100' },
  { id: 'bird', emoji: '🐦', label: 'Pássaro', bgColor: 'bg-sky-100' },
  { id: 'rabbit', emoji: '🐰', label: 'Coelho', bgColor: 'bg-gray-100' },
  { id: 'turtle', emoji: '🐢', label: 'Tartaruga', bgColor: 'bg-green-100' },
  { id: 'hamster', emoji: '🐹', label: 'Hamster', bgColor: 'bg-amber-100' },
  { id: 'crown', emoji: '👑', label: 'Coroa', bgColor: 'bg-yellow-100' },
  { id: 'gift', emoji: '🎁', label: 'Presente', bgColor: 'bg-red-100' },
]

export const getAvatar = (avatarId: string | null | undefined): AvatarOption => {
  if (!avatarId) {
    return AVATARS[0] // Default: gato laranja
  }
  return AVATARS.find(a => a.id === avatarId) || AVATARS[0]
}

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
