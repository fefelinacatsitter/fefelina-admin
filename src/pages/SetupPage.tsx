import { useState, useEffect } from 'react';
import { Users, Shield, Settings, Check, X, AlertCircle, UserPlus, Copy, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../contexts/PermissionsContext';
import FieldPermissionsSetup from '../components/FieldPermissionsSetup';

interface Profile {
  id: string;
  name: string;
  description: string;
  is_admin: boolean;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  profile: Profile;
}

interface Permission {
  id: string;
  profile_id: string;
  resource: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

type Tab = 'users' | 'profiles' | 'permissions' | 'field-permissions';

const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'clients', label: 'Clientes' },
  { key: 'leads', label: 'Leads' },
  { key: 'agenda', label: 'Agenda' },
  { key: 'services', label: 'Serviços' },
  { key: 'visits', label: 'Visitas' },
  { key: 'pets', label: 'Pets' },
  { key: 'financeiro', label: 'Financeiro' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'setup', label: 'Configurações' },
];

export default function SetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newUserCredentials, setNewUserCredentials] = useState<{ email: string; password: string } | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    profile_id: ''
  });
  
  const { isAdmin, loading: permissionsLoading, userProfile } = usePermissions();

  // Carregar dados
  useEffect(() => {
    if (!permissionsLoading && isAdmin) {
      loadData();
    }
  }, [activeTab, permissionsLoading, isAdmin]);

  // Carregar perfis quando abrir modal de criar usuário
  useEffect(() => {
    if (showCreateModal && profiles.length === 0) {
      loadProfiles();
    }
  }, [showCreateModal]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'profiles') {
        await loadProfiles();
      } else if (activeTab === 'permissions') {
        await loadProfiles();
        await loadPermissions();
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      showMessage('error', 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
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
      .order('created_at', { ascending: false });

    if (error) throw error;
    setUsers(data as UserProfile[]);
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('name');

    if (error) throw error;
    setProfiles(data);
    if (data.length > 0 && !selectedProfile) {
      setSelectedProfile(data[0].id);
    }
  };

  const loadPermissions = async () => {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('resource');

    if (error) throw error;
    setPermissions(data || []);
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, '');
    
    // Aplica máscara (47)99999-9999
    if (numbers.length <= 2) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)})${numbers.slice(2)}`;
    } else if (numbers.length <= 11) {
      return `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    }
    // Limitar a 11 dígitos
    return `(${numbers.slice(0, 2)})${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    // Prevenir que admin desative a si mesmo
    if (userProfile?.id === userId && currentStatus === true) {
      showMessage('error', 'Você não pode desativar sua própria conta');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      
      await loadUsers();
      showMessage('success', `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso`);
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      showMessage('error', 'Erro ao atualizar usuário');
    } finally {
      setSaving(false);
    }
  };

  const updatePermission = async (
    profileId: string,
    resource: string,
    action: 'can_read' | 'can_create' | 'can_update' | 'can_delete',
    value: boolean
  ) => {
    setSaving(true);
    try {
      // Buscar permissão existente
      const existingPerm = permissions.find(
        p => p.profile_id === profileId && p.resource === resource
      );

      if (existingPerm) {
        // Atualizar permissão existente
        const { error } = await supabase
          .from('permissions')
          .update({ [action]: value })
          .eq('id', existingPerm.id);

        if (error) throw error;
      } else {
        // Criar nova permissão com todos os campos inicializados
        const newPermission = {
          profile_id: profileId,
          resource,
          can_read: action === 'can_read' ? value : false,
          can_create: action === 'can_create' ? value : false,
          can_update: action === 'can_update' ? value : false,
          can_delete: action === 'can_delete' ? value : false,
        };

        const { error } = await supabase
          .from('permissions')
          .insert(newPermission);

        if (error) throw error;
      }

      await loadPermissions();
      showMessage('success', 'Permissão atualizada');
    } catch (error) {
      console.error('Erro ao atualizar permissão:', error);
      showMessage('error', 'Erro ao atualizar permissão');
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (profileId: string, resource: string, action: string): boolean => {
    const perm = permissions.find(
      p => p.profile_id === profileId && p.resource === resource
    );
    return perm ? perm[action as keyof Permission] as boolean : false;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validações
      if (!newUserForm.full_name || !newUserForm.email || !newUserForm.profile_id) {
        showMessage('error', 'Preencha todos os campos obrigatórios');
        return;
      }

      // Senha padrão
      const defaultPassword = 'Fefelina2024!';

      // 1. Criar usuário no auth (sem confirmação de email)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserForm.email,
        password: defaultPassword,
        options: {
          emailRedirectTo: undefined, // Não enviar email de confirmação
          data: {
            full_name: newUserForm.full_name,
          }
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário no auth:', authError);
        throw authError;
      }
      if (!authData.user) throw new Error('Usuário não foi criado no auth');

      // 2. Criar user_profile
      console.log('Criando user_profile para:', authData.user.id);
      
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          profile_id: newUserForm.profile_id,
          full_name: newUserForm.full_name,
          email: newUserForm.email,
          phone: newUserForm.phone || null,
          is_active: true
        })
        .select();

      if (profileError) {
        console.error('Erro ao criar user_profile:', profileError);
        
        // Verificar se é erro de RLS (403/policy violation)
        if (profileError.message.includes('row-level security') || profileError.message.includes('policy')) {
          throw new Error(
            '❌ PERMISSÃO NEGADA: Você precisa executar o script SQL no Supabase!\n\n' +
            '📋 PASSOS:\n' +
            '1. Abra o Supabase Dashboard\n' +
            '2. Vá em "SQL Editor" → "New Query"\n' +
            '3. Cole o conteúdo do arquivo ENABLE-USER-CREATION.sql\n' +
            '4. Clique em "Run" para executar\n\n' +
            '💡 Este script cria a permissão para admins criarem usuários.'
          );
        }
        
        throw new Error(`Erro ao criar perfil do usuário: ${profileError.message}`);
      }

      console.log('User_profile criado com sucesso:', profileData);

      // Sucesso - mostrar credenciais
      setNewUserCredentials({
        email: newUserForm.email,
        password: defaultPassword
      });
      setShowCreateModal(false);
      setShowSuccessModal(true);
      
      // Limpar formulário
      setNewUserForm({
        full_name: '',
        email: '',
        phone: '',
        profile_id: ''
      });

      // Recarregar lista
      await loadUsers();

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      showMessage('error', error.message || 'Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showMessage('success', 'Copiado para área de transferência');
  };

  // Mostrar loading enquanto carrega permissões
  if (permissionsLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title-fefelina">
          <Settings className="w-8 h-8 text-primary-500 inline-block mr-3" />
          Configurações do Sistema
        </h1>
        <p className="text-gray-700 mt-2">
          Gerencie usuários, perfis e permissões do sistema
        </p>
        <div className="divider-fefelina"></div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <Check className="w-5 h-5 mr-2" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-fefelina">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline-block mr-2" />
              Usuários
            </button>
            <button
              onClick={() => setActiveTab('profiles')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profiles'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline-block mr-2" />
              Perfis
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'permissions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-4 h-4 inline-block mr-2" />
              Permissões
            </button>
            <button
              onClick={() => setActiveTab('field-permissions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'field-permissions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Eye className="w-4 h-4 inline-block mr-2" />
              Campos (FLS)
            </button>
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando...</p>
            </div>
          ) : (
            <>
              {/* Tab: Usuários */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Gerenciar Usuários
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        Total: {users.length} usuário(s)
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="btn-fefelina inline-flex items-center"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Novo Usuário
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usuário
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Perfil
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cadastro
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.full_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.profile.is_admin
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {user.profile.is_admin && (
                                  <Shield className="w-3 h-3 mr-1" />
                                )}
                                {user.profile.name}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.is_active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {userProfile?.id === user.id && user.is_active ? (
                                <span className="inline-flex items-center px-3 py-1 text-sm text-gray-400 italic">
                                  Sua conta
                                </span>
                              ) : (
                                <button
                                  onClick={() => toggleUserActive(user.id, user.is_active)}
                                  disabled={saving}
                                  className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                                    user.is_active
                                      ? 'text-red-600 hover:bg-red-50'
                                      : 'text-green-600 hover:bg-green-50'
                                  } disabled:opacity-50`}
                                >
                                  {user.is_active ? (
                                    <>
                                      <X className="w-4 h-4 mr-1" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Ativar
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {users.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum usuário encontrado
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Perfis */}
              {activeTab === 'profiles' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Perfis de Acesso
                    </h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {profiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            {profile.is_admin && (
                              <Shield className="w-5 h-5 mr-2 text-purple-600" />
                            )}
                            {profile.name}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            profile.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {profile.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {profile.description}
                        </p>
                        {profile.is_admin && (
                          <div className="bg-purple-50 border border-purple-200 rounded-md p-2 text-xs text-purple-800">
                            <Shield className="w-3 h-3 inline mr-1" />
                            Acesso total ao sistema
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Permissões */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Matriz de Permissões
                    </h2>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">
                        Perfil:
                      </label>
                      <select
                        value={selectedProfile}
                        onChange={(e) => setSelectedProfile(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recurso
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Visualizar
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Criar
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Editar
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Excluir
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {RESOURCES.map((resource) => (
                          <tr key={resource.key} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {resource.label}
                            </td>
                            {['can_read', 'can_create', 'can_update', 'can_delete'].map((action) => (
                              <td key={action} className="px-6 py-4 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={getPermissionValue(selectedProfile, resource.key, action)}
                                  onChange={(e) =>
                                    updatePermission(
                                      selectedProfile,
                                      resource.key,
                                      action as 'can_read' | 'can_create' | 'can_update' | 'can_delete',
                                      e.target.checked
                                    )
                                  }
                                  disabled={saving}
                                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 disabled:opacity-50"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Dica:</p>
                        <p>
                          Perfis com <strong>Admin</strong> marcado têm acesso total automaticamente,
                          independente das permissões configuradas aqui.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Permissões de Campo (FLS) */}
              {activeTab === 'field-permissions' && (
                <FieldPermissionsSetup />
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Criar Usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <UserPlus className="w-6 h-6 mr-2 text-primary-500" />
                  Cadastrar Novo Usuário
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="João Silva"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="joao@exemplo.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={newUserForm.phone}
                    onChange={(e) => {
                      const formatted = formatPhoneNumber(e.target.value);
                      setNewUserForm({ ...newUserForm, phone: formatted });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="(47)99999-9999"
                    maxLength={14}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUserForm.profile_id}
                    onChange={(e) => setNewUserForm({ ...newUserForm, profile_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione um perfil</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">Senha inicial: Fefelina2024!</p>
                      <p className="mt-1">
                        O usuário deverá trocar a senha no primeiro acesso.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-fefelina"
                    disabled={saving}
                  >
                    {saving ? 'Criando...' : 'Criar Conta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sucesso - Credenciais */}
      {showSuccessModal && newUserCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Conta criada com sucesso!
              </h3>
              
              <p className="text-sm text-gray-600 text-center mb-6">
                Anote as credenciais abaixo e repasse para o usuário:
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Email:
                  </label>
                  <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-2">
                    <span className="text-sm font-mono text-gray-900">
                      {newUserCredentials.email}
                    </span>
                    <button
                      onClick={() => copyToClipboard(newUserCredentials.email)}
                      className="text-primary-600 hover:text-primary-700"
                      title="Copiar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Senha inicial:
                  </label>
                  <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-2">
                    <span className="text-sm font-mono text-gray-900">
                      {newUserCredentials.password}
                    </span>
                    <button
                      onClick={() => copyToClipboard(newUserCredentials.password)}
                      className="text-primary-600 hover:text-primary-700"
                      title="Copiar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
                  <p className="text-sm text-orange-800">
                    <strong>Importante:</strong> Peça para o usuário trocar a senha no primeiro acesso em "Meu Perfil".
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setNewUserCredentials(null);
                }}
                className="w-full btn-fefelina mt-6"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
