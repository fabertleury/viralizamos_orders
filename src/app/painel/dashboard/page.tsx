'use client';

import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  failedOrders: number;
  totalUsers: number;
  totalRevenue: number;
  recentActivity: {
    time: string;
    type: string;
    details: string;
  }[];
}

export default function AdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    failedOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentActivity: [],
  });

  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        label: 'Pedidos',
        data: [] as number[],
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      },
      {
        label: 'Receita (R$)',
        data: [] as number[],
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
      },
    ],
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Buscar estatísticas do dashboard
        const statsResponse = await fetch('/api/admin/dashboard/stats');
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Buscar dados para o gráfico
        const chartResponse = await fetch('/api/admin/dashboard/chart');
        
        if (chartResponse.ok) {
          const chartData = await chartResponse.json();
          setChartData(chartData);
        }
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard Administrativo</h1>

      {/* Cartões de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total de Pedidos"
          value={stats.totalOrders}
          bgColor="bg-blue-500"
          textColor="text-blue-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          }
        />

        <StatCard
          title="Pedidos Pendentes"
          value={stats.pendingOrders}
          bgColor="bg-yellow-500"
          textColor="text-yellow-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Pedidos Concluídos"
          value={stats.completedOrders}
          bgColor="bg-green-500"
          textColor="text-green-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Pedidos com Falha"
          value={stats.failedOrders}
          bgColor="bg-red-500"
          textColor="text-red-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Total de Usuários"
          value={stats.totalUsers}
          bgColor="bg-purple-500"
          textColor="text-purple-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <StatCard
          title="Receita Total"
          value={`R$ ${stats.totalRevenue.toFixed(2)}`}
          bgColor="bg-emerald-500"
          textColor="text-emerald-50"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Desempenho Mensal</h2>
        <div className="h-80">
          <Bar
            data={chartData}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Pedidos e Receita por Mês',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Atividade recente */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Atividade Recente</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {activity.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.type === 'order'
                            ? 'bg-blue-100 text-blue-800'
                            : activity.type === 'user'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {activity.type === 'order'
                          ? 'Pedido'
                          : activity.type === 'user'
                          ? 'Usuário'
                          : activity.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {activity.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhuma atividade recente encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  bgColor,
  textColor,
  icon,
}: {
  title: string;
  value: number | string;
  bgColor: string;
  textColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${bgColor} ${textColor} rounded-lg shadow-md overflow-hidden`}>
      <div className="p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium opacity-80">{title}</h3>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <div className="rounded-full bg-white bg-opacity-20 p-2">{icon}</div>
      </div>
    </div>
  );
} 