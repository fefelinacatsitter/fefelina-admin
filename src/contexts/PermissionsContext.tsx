import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface Permission {
  resource: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

export interface UserProfile {
  id: string;
  user_id: string;
  profile_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  profile: {
    id: string;
    name: string;
    description: string;
    is_admin: boolean;
    is_active: boolean;
  };
}

interface PermissionsContextType {
  userProfile: UserProfile | null;
  permissions: Permission[];
  loading: boolean;
  isAdmin: boolean;
  hasPermission: (resource: string, action: 'read' | 'create' | 'update' | 'delete') => boolean;
  canRead: (resource: string) => boolean;
  canCreate: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const userProfileRef = useRef<UserProfile | null>(null);

  const loadPermissions = async (showLoading = false) => {
    try {
      // Apenas mostrar loading quando solicitado (primeira carga ou login/logout)
      if (showLoading) {
        setLoading(true);
      }

      // 1. Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUserProfile(null);
        userProfileRef.current = null;
        setPermissions([]);
        return;
      }

      // 2. Buscar profile do usuário
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          profile:profiles (
            id,
            name,
            description,
            is_admin,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Erro ao carregar profile:', profileError);
        setUserProfile(null);
        userProfileRef.current = null;
        setPermissions([]);
        return;
      }

      // Verificar se usuário está ativo
      if (!profile?.is_active || !profile?.profile?.is_active) {
        console.warn('Usuário ou profile inativo');
        setUserProfile(null);
        userProfileRef.current = null;
        setPermissions([]);
        return;
      }

      const profileData = profile as UserProfile;
      setUserProfile(profileData);
      userProfileRef.current = profileData;

      // 3. Buscar permissões do profile
      const { data: perms, error: permsError } = await supabase
        .from('permissions')
        .select('resource, can_read, can_create, can_update, can_delete')
        .eq('profile_id', profile.profile_id);

      if (permsError) {
        console.error('Erro ao carregar permissões:', permsError);
        setPermissions([]);
        return;
      }

      setPermissions(perms || []);

    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      setUserProfile(null);
      userProfileRef.current = null;
      setPermissions([]);
    } finally {
      // Sempre desligar loading se estava ligado
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Primeira carga: mostrar loading
    loadPermissions(true);

    // Listener para mudanças no auth (apenas login/logout reais, não verificações de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // SIGNED_IN pode ser disparado quando a aba volta do background
      // Só recarregar se realmente não temos dados ainda
      if (event === 'SIGNED_IN') {
        // Se já temos userProfile carregado, ignorar (aba voltou do background)
        if (userProfileRef.current) {
          return;
        }
        // Login real: mostrar loading
        loadPermissions(true);
      } else if (event === 'SIGNED_OUT') {
        // Logout: limpar dados sem loading (vai redirecionar)
        setUserProfile(null);
        userProfileRef.current = null;
        setPermissions([]);
      }
      // TOKEN_REFRESHED e INITIAL_SESSION não precisam recarregar
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Verifica se o usuário é admin
  const isAdmin = userProfile?.profile?.is_admin ?? false;

  // Função genérica para verificar permissão
  const hasPermission = (resource: string, action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    // Admin tem acesso total
    if (isAdmin) return true;

    // Buscar permissão específica
    const permission = permissions.find(p => p.resource === resource);
    if (!permission) return false;

    // Mapear ação para campo
    const actionField = `can_${action}` as keyof Permission;
    return permission[actionField] === true;
  };

  // Atalhos para cada tipo de ação
  const canRead = (resource: string) => hasPermission(resource, 'read');
  const canCreate = (resource: string) => hasPermission(resource, 'create');
  const canUpdate = (resource: string) => hasPermission(resource, 'update');
  const canDelete = (resource: string) => hasPermission(resource, 'delete');

  const value = {
    userProfile,
    permissions,
    loading,
    isAdmin,
    hasPermission,
    canRead,
    canCreate,
    canUpdate,
    canDelete,
    refreshPermissions: () => loadPermissions(true),
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextType {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
