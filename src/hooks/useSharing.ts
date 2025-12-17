import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ShareClientParams {
  clientId: string;
  sharedWithUserId: string;
  accessLevel?: 'read' | 'write';
}

export interface UnshareClientParams {
  clientId: string;
  sharedWithUserId: string;
}

export interface SharedWith {
  sharing_id: string;
  client_id: string;
  client_name: string;
  shared_with_user_id: string;
  shared_with_user_name: string;
  shared_by_user_id: string;
  shared_by_user_name: string;
  access_level: string;
  field_restrictions?: any;
  shared_at: string;
}

export function useSharing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareClient = async ({ clientId, sharedWithUserId, accessLevel = 'read' }: ShareClientParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('share_client_with_user', {
        p_client_id: clientId,
        p_shared_with_user_id: sharedWithUserId,
        p_access_level: accessLevel,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao compartilhar cliente';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const unshareClient = async ({ clientId, sharedWithUserId }: UnshareClientParams) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('unshare_client_from_user', {
        p_client_id: clientId,
        p_shared_with_user_id: sharedWithUserId,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao remover compartilhamento';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSharedWith = async (clientId: string): Promise<SharedWith[]> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('shared_clients_view')
        .select('*')
        .eq('client_id', clientId);

      if (queryError) throw queryError;

      return data || [];
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar compartilhamentos';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getActiveUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          full_name,
          email,
          profile:profiles(name, is_admin)
        `)
        .eq('is_active', true)
        .order('full_name');

      if (queryError) throw queryError;

      return data || [];
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao carregar usuários';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    shareClient,
    unshareClient,
    getSharedWith,
    getActiveUsers,
  };
}
