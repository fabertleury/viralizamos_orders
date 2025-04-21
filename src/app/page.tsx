'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [status, setStatus] = useState<'loading' | 'online'>('loading');
  const [time, setTime] = useState<string>('');
  
  useEffect(() => {
    // Verificar o status do serviço ao carregar a página
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health');
        if (response.ok) {
          setStatus('online');
        }
      } catch (error) {
        console.error('Erro ao verificar status do serviço:', error);
      }
    };
    
    // Atualizar a hora atual
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleString('pt-BR'));
    };
    
    // Chamar funções iniciais
    checkStatus();
    updateTime();
    
    // Atualizar a hora a cada segundo
    const intervalId = setInterval(updateTime, 1000);
    
    // Limpar o intervalo ao desmontar o componente
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 max-w-md w-full">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Viralizamos Orders API</h1>
          <p className="text-gray-600 mb-4">Microserviço de gestão de pedidos</p>
          
          <div className="flex items-center justify-center mb-4">
            <div className={`w-3 h-3 rounded-full mr-2 ${status === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-sm font-medium">
              {status === 'online' ? 'Serviço online' : 'Verificando status...'}
            </span>
          </div>
          
          <p className="text-sm text-gray-500">{time}</p>
          
          <div className="mt-6">
            <Link href="/dashboard" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors">
              Acessar Dashboard de Vendas
            </Link>
          </div>
        </div>
        
        <div className="mt-6 border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600 mb-2">Este é um microserviço interno do sistema Viralizamos.</p>
          <p className="text-sm text-gray-600">Responsável pelo processamento de pedidos após os pagamentos serem aprovados.</p>
        </div>
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        © {new Date().getFullYear()} Viralizamos - Todos os direitos reservados
      </div>
    </div>
  );
} 