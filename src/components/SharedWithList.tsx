import React, { useEffect, useState } from 'react';
import { X, Users, AlertCircle, AlertTriangle } from 'lucide-react';
import { useSharing, SharedWith } from '../hooks/useSharing';
import { supabase } from '../lib/supabase';

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
    // Verificar se há serviços/visitas assignadas para este usuário neste cliente
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Verificar serviços futuros ou em andamento
      const { data: services, error: servicesError } = await supabase
        .from('services')
        .select('id, nome_servico, data_inicio, data_fim')
        .eq('client_id', clientId)
        .eq('assigned_user_id', userId)
        .gte('data_fim', today)
        .order('data_inicio');

      if (servicesError) throw servicesError;

      // Verificar visitas futuras
      const { data: visits, error: visitsError } = await supabase
        .from('visits')
        .select('id, data')
        .eq('client_id', clientId)
        .eq('assigned_user_id', userId)
        .gte('data', today)
        .order('data');

      if (visitsError) throw visitsError;

      // Montar mensagem de confirmação
      let confirmMessage = `Deseja realmente remover o compartilhamento com ${userName}?`;
      
      if (services && services.length > 0) {
        confirmMessage += `\n\n⚠️ ATENÇÃO: Este parceiro tem ${services.length} serviço(s) ativo(s) para este cliente:`;
        services.slice(0, 3).forEach((s: any) => {
          confirmMessage += `\n• ${s.nome_servico || 'Serviço'} (${new Date(s.data_inicio).toLocaleDateString('pt-BR')} - ${new Date(s.data_fim).toLocaleDateString('pt-BR')})`;
        });
        if (services.length > 3) {
          confirmMessage += `\n... e mais ${services.length - 3} serviço(s)`;
        }
      }

      if (visits && visits.length > 0) {
        confirmMessage += `\n\n⚠️ Este parceiro tem ${visits.length} visita(s) futura(s) para este cliente.`;
      }

      if ((services && services.length > 0) || (visits && visits.length > 0)) {
        confirmMessage += '\n\n❌ Ao remover o compartilhamento, este parceiro perderá acesso imediato a todos os dados deste cliente.';
        confirmMessage += '\n\n💡 Considere reassignar os serviços/visitas antes de remover o compartilhamento.';
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      setUnsharing(userId);
      await unshareClient({ clientId, sharedWithUserId: userId });
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
