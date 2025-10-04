// src/pages/DashboardPage.tsx
import React, { useState } from 'react'; // <-- 1. SOLUCIÓN: Añadimos useState aquí
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi'; // <-- Quitamos FiMoreHorizontal que no se usaba
import TransactionModal from '../components/TransactionModal';

// --- Datos de Ejemplo (se mantienen igual) ---
const kpiData = {
    ingresos: 5450,
    gastos: 3907,
    balance: 1543,
};
const trendData = [
    { name: 'Ene', ingresos: 4000, gastos: 2400 }, { name: 'Feb', ingresos: 3000, gastos: 1398 },
    { name: 'Mar', ingresos: 2000, gastos: 9800 }, { name: 'Abr', ingresos: 2780, gastos: 3908 },
    { name: 'May', ingresos: 1890, gastos: 4800 }, { name: 'Jun', ingresos: 2390, gastos: 3800 },
];
const recentTransactions = [
    { id: 1, description: 'Salario Mensual', amount: 4000, type: 'income', date: '2025-10-01' },
    { id: 2, description: 'Supermercado', amount: -750.50, type: 'expense', date: '2025-10-02' },
    { id: 3, description: 'Pago de Internet', amount: -350.00, type: 'expense', date: '2025-10-03' },
    { id: 4, description: 'Venta de artículo', amount: 500, type: 'income', date: '2025-10-03' },
];

// --- Componente KpiCard (se mantiene igual) ---
const KpiCard: React.FC<{ title: string; amount: number; icon: React.ReactNode }> = ({ title, amount, icon }) => (
    <div className="bg-gray-800 p-6 rounded-2xl flex items-center justify-between">
        <div>
            <p className="text-sm text-gray-400 font-medium">{title}</p>
            <p className="text-3xl font-bold">Q{amount.toLocaleString('en-US')}</p>
        </div>
        <div className="bg-gray-700 p-4 rounded-full">
            {icon}
        </div>
    </div>
);

// --- Componente Principal del Dashboard ---
const DashboardPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false); // <-- Ahora esto funciona

    // Función para refrescar los datos.
    const refreshDashboardData = () => {
        console.log("Refrescando datos del dashboard...");
        // En el futuro, aquí se volverían a cargar los datos de Supabase.
    };

    return (
        <div className="text-white space-y-8">
            {/* -- Encabezado -- */}
            <div>
                <h1 className="text-4xl font-bold">Dashboard</h1>
                <p className="text-gray-400 mt-1">Resumen de tu actividad financiera.</p>
            </div>

            {/* -- Sección de KPI Cards (sin cambios) -- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Ingresos (Mes)" amount={kpiData.ingresos} icon={<FiTrendingUp className="text-green-400" size={24}/>} />
                <KpiCard title="Gastos (Mes)" amount={kpiData.gastos} icon={<FiTrendingDown className="text-red-400" size={24}/>} />
                <KpiCard title="Balance Actual" amount={kpiData.balance} icon={<FiDollarSign className="text-blue-400" size={24}/>} />
            </div>

            {/* -- Sección de Gráfico y Transacciones (sin cambios) -- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl xl:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Rendimiento (Últimos 6 meses)</h2>
                    <div className="w-full h-80">
                        <ResponsiveContainer>
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563' }} />
                                <Legend />
                                <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#34d399" fill="#10b981" />
                                <Area type="monotone" dataKey="gastos" stackId="1" stroke="#f87171" fill="#ef4444" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-gray-800 p-6 rounded-2xl">
                    <h2 className="text-xl font-semibold mb-4">Transacciones Recientes</h2>
                    <div className="space-y-4">
                        {recentTransactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{tx.description}</p>
                                    <p className="text-sm text-gray-400">{tx.date}</p>
                                </div>
                                <p className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.amount > 0 ? `+Q${tx.amount.toFixed(2)}` : `-Q${Math.abs(tx.amount).toFixed(2)}`}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* -- Botón Flotante -- */}
            <button
                onClick={() => setIsModalOpen(true)} // <-- 2. SOLUCIÓN: Conectamos el botón
                className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl shadow-lg hover:bg-indigo-500 transition-transform hover:scale-110"
            >
                <FiPlus />
            </button>

            {/* -- Renderiza el Modal -- */}
            <TransactionModal // <-- 3. SOLUCIÓN: Añadimos el componente del modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={refreshDashboardData}
            />
        </div>
    );
};

export default DashboardPage;