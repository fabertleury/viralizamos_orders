'use client';

import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Tipos de dados
type OrderSummary = {
  total: number;
  count: number;
  averageValue: number;
  today: number;
  week: number;
  month: number;
};

type OrderData = {
  id: string;
  transaction_id: string;
  customer_email: string | null;
  amount: number;
  status: string;
  created_at: Date;
  provider: string | null;
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [orderSummary, setOrderSummary] = useState<OrderSummary>({
    total: 0,
    count: 0,
    averageValue: 0,
    today: 0,
    week: 0,
    month: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ label: 'Vendas', data: [] }],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Buscar resumo de pedidos
        const summaryRes = await fetch('/api/dashboard/summary');
        const summary = await summaryRes.json();
        
        // Buscar pedidos recentes
        const ordersRes = await fetch('/api/dashboard/recent-orders');
        const orders = await ordersRes.json();
        
        // Buscar dados para o gráfico
        const chartRes = await fetch('/api/dashboard/chart-data');
        const chartData = await chartRes.json();
        
        setOrderSummary(summary);
        setRecentOrders(orders);
        setChartData(chartData);
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Vendas</h1>
      
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Total de Vendas</h2>
          <p className="text-3xl font-bold mt-2">R$ {orderSummary.total.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Quantidade</h2>
          <p className="text-3xl font-bold mt-2">{orderSummary.count}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Vendas Hoje</h2>
          <p className="text-3xl font-bold mt-2">R$ {orderSummary.today.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-700">Ticket Médio</h2>
          <p className="text-3xl font-bold mt-2">R$ {orderSummary.averageValue.toFixed(2)}</p>
        </div>
      </div>
      
      {/* Gráfico de vendas */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Vendas dos Últimos 30 Dias</h2>
        <div className="h-80">
          <Line data={chartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
      
      {/* Tabela de pedidos recentes */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Pedidos Recentes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provedor</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.transaction_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">R$ {order.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'failed' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(order.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.provider || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 