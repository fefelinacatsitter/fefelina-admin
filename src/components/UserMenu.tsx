import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../contexts/PermissionsContext';
import Avatar from './Avatar';

interface UserMenuProps {
  inSidebar?: boolean; // Se está no sidebar lateral (abre para cima)
}

export default function UserMenu({ inSidebar = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { userProfile, isAdmin } = usePermissions();

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout. Tente novamente.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!userProfile) return null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão do Menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-150"
      >
        {/* Avatar */}
        <Avatar 
          avatarId={userProfile.avatar_url} 
          name={userProfile.full_name}
          size="md"
          className="shadow-sm"
        />

        {/* Info do Usuário */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">
            {userProfile.full_name}
          </p>
          <p className="text-xs text-gray-500 flex items-center">
            {isAdmin && <Shield className="w-3 h-3 mr-1 text-primary-600" />}
            {userProfile.profile.name}
          </p>
        </div>

        {/* Ícone dropdown */}
        <ChevronDown 
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute ${inSidebar ? 'left-0' : 'right-0'} w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${
          inSidebar ? 'bottom-full mb-2' : 'top-full mt-2'
        }`}>
          {/* Header do Menu */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {userProfile.full_name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {userProfile.email}
            </p>
            <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-primary-50 text-xs font-medium text-primary-700">
              {isAdmin && <Shield className="w-3 h-3 mr-1" />}
              {userProfile.profile.name}
            </div>
          </div>

          {/* Opções do Menu */}
          <div className="py-2">
            {/* Meu Perfil */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/profile');
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <User className="w-4 h-4 mr-3 text-gray-500" />
              Meu Perfil
            </button>

            {/* Setup (apenas para admin) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/setup');
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <Settings className="w-4 h-4 mr-3 text-gray-500" />
                Configurações
              </button>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-2">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center disabled:opacity-50"
            >
              <LogOut className="w-4 h-4 mr-3" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
