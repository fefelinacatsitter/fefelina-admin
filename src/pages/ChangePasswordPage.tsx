import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isFirstLogin = new URLSearchParams(window.location.search).get('firstLogin') === 'true';

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Mínimo de 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Pelo menos uma letra maiúscula');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Pelo menos uma letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Pelo menos um número');
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Pelo menos um caractere especial (!@#$%^&*)');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validações
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      setError(`Senha inválida: ${passwordErrors.join(', ')}`);
      return;
    }

    if (newPassword === currentPassword) {
      setError('A nova senha deve ser diferente da senha atual');
      return;
    }

    setLoading(true);

    try {
      // Atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess(true);

      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err: any) {
      console.error('Erro ao trocar senha:', err);
      setError(err.message || 'Erro ao trocar senha. Verifique sua senha atual.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Senha alterada com sucesso!
          </h2>
          <p className="text-gray-600">
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isFirstLogin ? 'Bem-vindo!' : 'Trocar Senha'}
          </h1>
          <p className="text-gray-600">
            {isFirstLogin 
              ? 'Por segurança, troque sua senha inicial antes de continuar.'
              : 'Altere sua senha para manter sua conta segura.'
            }
          </p>
        </div>

        {isFirstLogin && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Senha inicial fornecida:</p>
                <p className="font-mono">Fefelina2024!</p>
                <p className="mt-2">Use esta senha no campo "Senha Atual" abaixo.</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder={isFirstLogin ? 'Fefelina2024!' : '••••••••'}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Requisitos da senha:
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  newPassword.length >= 8 ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                Mínimo de 8 caracteres
              </li>
              <li className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  /[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                Letra maiúscula
              </li>
              <li className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  /[a-z]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                Letra minúscula
              </li>
              <li className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                Número
              </li>
              <li className="flex items-center">
                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                  /[!@#$%^&*]/.test(newPassword) ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                Caractere especial (!@#$%^&*)
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-fefelina disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Salvando...' : 'Trocar Senha'}
          </button>

          {!isFirstLogin && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
