import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Calendar, Save, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePermissions } from '../contexts/PermissionsContext';

export default function MyProfilePage() {
  const { userProfile, refreshPermissions } = usePermissions();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    avatar_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        avatar_url: userProfile.avatar_url || '',
      });
      setLoading(false);
    }
  }, [userProfile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userProfile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          avatar_url: formData.avatar_url,
        })
        .eq('user_id', userProfile.user_id);

      if (error) throw error;

      await refreshPermissions();
      showMessage('success', 'Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      showMessage('error', 'Erro ao atualizar perfil. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Erro ao carregar perfil</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title-fefelina">
          <User className="w-8 h-8 text-primary-500 inline-block mr-3" />
          Meu Perfil
        </h1>
        <p className="text-gray-700 mt-2">
          Gerencie suas informações pessoais e preferências
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Sidebar - Info do Perfil */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-fefelina p-6 sticky top-6">
            {/* Avatar */}
            <div className="text-center mb-6">
              <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg">
                {userProfile.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{getInitials(userProfile.full_name)}</span>
                )}
              </div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                {userProfile.full_name}
              </h2>
              <p className="text-sm text-gray-500">{userProfile.email}</p>
            </div>

            {/* Badge de Perfil */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                <div className="flex items-center">
                  <Shield className="w-5 h-5 text-primary-600 mr-2" />
                  <span className="text-sm font-medium text-primary-900">Perfil de Acesso</span>
                </div>
              </div>
              <div className="text-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  userProfile.profile.is_admin
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userProfile.profile.is_admin && (
                    <Shield className="w-4 h-4 mr-2" />
                  )}
                  {userProfile.profile.name}
                </span>
                <p className="mt-2 text-xs text-gray-600">
                  {userProfile.profile.description}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-900">Status</span>
                </div>
                <span className="text-sm font-semibold text-green-700">
                  {userProfile.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-fefelina p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              Informações Pessoais
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="input-fefelina"
                  placeholder="Seu nome completo"
                />
              </div>

              {/* Email (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  disabled
                  className="input-fefelina bg-gray-50 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  O email não pode ser alterado. Entre em contato com o administrador se necessário.
                </p>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Telefone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="input-fefelina"
                  placeholder="(47)99999-9999"
                  maxLength={14}
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL da Foto de Perfil (opcional)
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="input-fefelina"
                  placeholder="https://exemplo.com/foto.jpg"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Cole a URL de uma imagem hospedada na internet
                </p>
              </div>

              {/* Link para trocar senha */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Segurança da Conta</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Mantenha sua senha segura e atualizada
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.href = '/fefelina-admin/change-password'}
                    className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Trocar Senha
                  </button>
                </div>
              </div>

              {/* Botões */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    if (userProfile) {
                      setFormData({
                        full_name: userProfile.full_name || '',
                        email: userProfile.email || '',
                        phone: userProfile.phone || '',
                        avatar_url: userProfile.avatar_url || '',
                      });
                    }
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-fefelina disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 inline mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card de Informações */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sobre seu perfil</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Suas permissões são definidas pelo perfil "{userProfile.profile.name}"</li>
                  <li>Para alterar o email, entre em contato com o administrador</li>
                  <li>A foto de perfil deve ser uma URL pública (ex: Imgur, Google Drive público)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
