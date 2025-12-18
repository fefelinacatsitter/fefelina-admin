import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Share2, Check, AlertCircle } from 'lucide-react';
import { useSharing } from '../hooks/useSharing';

interface ShareClientModalProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface User {
  user_id: string;
  full_name: string;
  email: string;
  profile: {
    name: string;
    is_admin: boolean;
  };
}

export default function ShareClientModal({
  clientId,
  clientName,
  isOpen,
  onClose,
  onSuccess,
}: ShareClientModalProps) {
  const { shareClient, getActiveUsers, loading } = useSharing();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    const data = await getActiveUsers();
    // Flatten profile array to single object
    const formattedUsers = data.map((user: any) => ({
      ...user,
      profile: Array.isArray(user.profile) ? user.profile[0] : user.profile
    }));
    setUsers(formattedUsers as User[]);
  };

  const handleShare = async () => {
    if (!selectedUserId) {
      setError('Selecione um usuário');
      return;
    }

    setError(null);
    setSuccess(false);

    try {
      await shareClient({
        clientId,
        sharedWithUserId: selectedUserId,
        accessLevel: 'read',
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex items-center">
                    <Share2 className="h-5 w-5 mr-2 text-purple-600" />
                    Compartilhar Cliente
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-4">
                    Compartilhar <strong>{clientName}</strong> com outro usuário.
                    O usuário verá apenas os campos permitidos pelo perfil dele.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                        Selecione o usuário
                      </label>
                      <select
                        id="user"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        disabled={loading}
                      >
                        <option value="">Escolha um usuário...</option>
                        {users.map((user) => (
                          <option key={user.user_id} value={user.user_id}>
                            {user.full_name} - {user.profile?.name || 'Sem perfil'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {success && (
                      <div className="rounded-md bg-green-50 p-4">
                        <div className="flex">
                          <Check className="h-5 w-5 text-green-400" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-800">
                              Cliente compartilhado com sucesso!
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                          <AlertCircle className="h-5 w-5 text-red-400" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-red-800">
                              {error}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={loading || !selectedUserId || success}
                    className="inline-flex justify-center rounded-md border border-transparent bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Compartilhando...' : 'Compartilhar'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
