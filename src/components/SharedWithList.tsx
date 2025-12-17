import React, { useEffect, useState } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { useSharing, SharedWith } from '../hooks/useSharing';

interface SharedWithListProps {
  clientId: string;
  clientName?: string;
  onUnshare?: (userId: string) => void;
}

export const SharedWithList: React.FC<SharedWithListProps> = ({
  clientId,
  clientName,
  onUnshare
}) => {
  const { getSharedWith, unshareClient, loading, error } = useSharing();
  const [sharedWithList, setSharedWithList] = useState<SharedWith[]>([]);
  const [unsharing, setUnsharing] = useState<string | null>(null);

  useEffect(() => {
    loadSharedWith();
  }, [clientId]);

  const loadSharedWith = async () => {
    const data = await getSharedWith(clientId);
    setSharedWithList(data);
  };

  const handleUnshare = async (userId: string, userName: string) => {
    if (!confirm(`Deseja realmente remover o compartilhamento com ${userName}?`)) {
      return;
    }

    setUnsharing(userId);
    try {
      await unshareClient({ clientId, sharedWithUserId: userId });
      // Remove from local state
      setSharedWithList(prev => prev.filter(item => item.shared_with_user_id !== userId));
      onUnshare?.(userId);
    } catch (err) {
      console.error('Error unsharing:', err);
      alert('Erro ao remover compartilhamento. Tente novamente.');
    } finally {
      setUnsharing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando compartilhamentos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="h-5 w-5 text-red-600" />
        <span className="text-red-700">Erro ao carregar compartilhamentos: {error}</span>
      </div>
    );
  }

  if (sharedWithList.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <Users className="h-5 w-5 text-gray-400" />
        <span className="text-gray-600">
          {clientName ? `${clientName} não está compartilhado` : 'Cliente não está compartilhado'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-gray-600" />
        <h3 className="font-medium text-gray-900">
          Compartilhado com ({sharedWithList.length})
        </h3>
      </div>
      
      <div className="space-y-2">
        {sharedWithList.map((item) => (
          <div
            key={item.shared_with_user_id}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {item.shared_with_user_name || 'Usuário sem nome'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Acesso: <span className="font-medium">{item.access_level}</span>
                {' • '}
                Desde: {new Date(item.shared_at).toLocaleDateString('pt-BR')}
              </div>
            </div>

            <button
              onClick={() => handleUnshare(item.shared_with_user_id, item.shared_with_user_name)}
              disabled={unsharing === item.shared_with_user_id}
              className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remover compartilhamento"
            >
              {unsharing === item.shared_with_user_id ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
              ) : (
                <X className="h-5 w-5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
