'use client';

import { useState, useEffect } from 'react';

interface SystemSettings {
  webhookEnabled: boolean;
  notificationsEnabled: boolean;
  autoRetryEnabled: boolean;
  maxRetryAttempts: number;
  serviceApiUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maintenanceMode: boolean;
}

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [settings, setSettings] = useState<SystemSettings>({
    webhookEnabled: true,
    notificationsEnabled: true,
    autoRetryEnabled: true,
    maxRetryAttempts: 3,
    serviceApiUrl: '',
    logLevel: 'info',
    maintenanceMode: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        setErrorMessage('Não foi possível carregar as configurações');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value) 
          : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccessMessage('Configurações salvas com sucesso!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        setErrorMessage(data.message || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setErrorMessage('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Configurações do Sistema</h1>

      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* API de Serviços */}
            <div className="col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Conexão com API</h2>
              <div>
                <label htmlFor="serviceApiUrl" className="block text-sm font-medium text-gray-700 mb-1">
                  URL da API de Serviços
                </label>
                <input
                  type="text"
                  name="serviceApiUrl"
                  id="serviceApiUrl"
                  value={settings.serviceApiUrl}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://api.exemplo.com/v1"
                />
              </div>
            </div>

            {/* Configurações de Webhook */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Webhooks e Notificações</h2>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="webhookEnabled"
                    id="webhookEnabled"
                    checked={settings.webhookEnabled}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="webhookEnabled" className="ml-2 block text-sm text-gray-700">
                    Webhooks Ativos
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Permite o envio de webhooks para serviços externos.
                </p>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="notificationsEnabled"
                    id="notificationsEnabled"
                    checked={settings.notificationsEnabled}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="notificationsEnabled" className="ml-2 block text-sm text-gray-700">
                    Notificações Ativas
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Habilita o envio de notificações para administradores.
                </p>
              </div>
            </div>

            {/* Configurações de Processamento */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">Processamento de Pedidos</h2>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="autoRetryEnabled"
                    id="autoRetryEnabled"
                    checked={settings.autoRetryEnabled}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoRetryEnabled" className="ml-2 block text-sm text-gray-700">
                    Retentar Automaticamente
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Retenta automaticamente pedidos que falharam.
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="maxRetryAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                  Máximo de Tentativas
                </label>
                <input
                  type="number"
                  name="maxRetryAttempts"
                  id="maxRetryAttempts"
                  min="1"
                  max="10"
                  value={settings.maxRetryAttempts}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Configurações do Sistema */}
            <div className="col-span-2">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Configurações do Sistema</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="logLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    Nível de Log
                  </label>
                  <select
                    name="logLevel"
                    id="logLevel"
                    value={settings.logLevel}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                
                <div>
                  <div className="flex items-center h-full">
                    <input
                      type="checkbox"
                      name="maintenanceMode"
                      id="maintenanceMode"
                      checked={settings.maintenanceMode}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="maintenanceMode" className="ml-2 block text-sm text-gray-700">
                      Modo de Manutenção
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>

      {/* Ações do Sistema */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ações do Sistema</h2>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Limpar Cache</h3>
              <p className="text-xs text-gray-500">Limpa todos os caches do sistema.</p>
            </div>
            <button 
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Executar
            </button>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Sincronizar com Provedor</h3>
              <p className="text-xs text-gray-500">Sincroniza todos os dados com o provedor de serviços.</p>
            </div>
            <button 
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Executar
            </button>
          </div>
          
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Reprocessar Pedidos com Falha</h3>
              <p className="text-xs text-gray-500">Tenta processar novamente todos os pedidos com falha.</p>
            </div>
            <button 
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Executar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 