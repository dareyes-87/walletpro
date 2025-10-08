import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import TransactionModal from '../components/TransactionModal';
import { supabase } from '../supabaseClient';

// --- Tipos ---
interface KpiData { ingresos: number; gastos: number; balance: number; }
interface RecentTransaction { id: string; amount: number; kind: 'in' | 'out'; date: string; categories: { name: string } | null; }
interface Category { id: string; name: string; }
interface PieChartData { name: string; value: number; [key: string]: string | number; }
type Period = '7' | '30' | '90' | '365';

// --- KpiCard ---
const KpiCard: React.FC<{ title: string; amount: number; icon: React.ReactNode }> = ({ title, amount, icon }) => (
    <div className="bg-gray-800 p-6 rounded-2xl flex items-center justify-between shadow">
        <div>
            <p className="text-gray-400">{title}</p>
            <h2 className={`text-2xl font-bold ${amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                Q{amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
        </div>
        {icon}
    </div>
);

// --- Componente Principal ---
const DashboardPage: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [kpiData, setKpiData] = useState<KpiData>({ ingresos: 0, gastos: 0, balance: 0 });
    const [pieChartData, setPieChartData] = useState<PieChartData[]>([]);
    const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [activePeriod, setActivePeriod] = useState<Period>('30');
    const [activeCategory, setActiveCategory] = useState<string>('all');

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuario no autenticado");

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(activePeriod));
            const endDate = new Date();

            const { data: summaryData, error: rpcError } = await supabase.rpc('get_performance_summary', {
                p_start_date: startDate.toISOString(),
                p_end_date: endDate.toISOString(),
            });
            if (rpcError) throw rpcError;

            if (summaryData) {
                const totalIngresos = summaryData.filter((i: { kind: string; total_amount: number }) => i.kind === 'in')
                    .reduce((acc: number, i: { total_amount: number }) => acc + Number(i.total_amount), 0);
                const totalGastos = summaryData
                    .filter((i: { kind: string; total_amount: number }) => i.kind === 'out')
                    .reduce((acc: number, i: { total_amount: number }) => acc + Number(i.total_amount), 0);
                setKpiData({ ingresos: totalIngresos, gastos: totalGastos, balance: totalIngresos - totalGastos });

                const expenseData: PieChartData[] = summaryData
                    .filter((d: { kind: string; category_name: string; total_amount: number }) => d.kind === 'out')
                    .map((d: { category_name: string; total_amount: number }) => ({ name: d.category_name, value: Number(d.total_amount) }));
                setPieChartData(expenseData);
            }

            // Cargar transacciones recientes con filtros
            let query = supabase.from('transactions')
                .select('id, amount, kind, date, categories(name)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());
            
            if (activeCategory !== 'all') {
                query = query.eq('category_id', activeCategory);
            }
            const { data: recentData, error: recentError } = await query.order('date', { ascending: false }).limit(5);
            if (recentError) throw recentError;
            setRecentTransactions((recentData || []).map(tx => ({
                ...tx,
                categories: tx.categories && Array.isArray(tx.categories) ? tx.categories[0] : null,
            })) as RecentTransaction[]);

        } catch (err) {
            console.error('Error cargando datos:', err);
        } finally {
            setLoading(false);
        }
    }, [activePeriod, activeCategory]);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase.from('categories').select('id, name, type');
            if (!error && data) setCategories(data);
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];

    return (
        <div className="p-6 text-white space-y-8">
            <h1 className="text-3xl font-bold">Resumen Financiero</h1>
            
            <div className="flex flex-col md:flex-row gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Periodo</label>
                    <select value={activePeriod} onChange={(e) => setActivePeriod(e.target.value as Period)} className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Últimos 30 días</option>
                        <option value="90">Últimos 3 meses</option>
                        <option value="365">Último año</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">Categoría</label>
                    <select value={activeCategory} onChange={(e) => setActiveCategory(e.target.value)} className="bg-gray-800 p-2 rounded-lg border border-gray-700">
                        <option value="all">Todas</option>
                        {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <KpiCard title="Ingresos" amount={kpiData.ingresos} icon={<FiTrendingUp className="text-3xl text-green-400" />} />
                <KpiCard title="Gastos" amount={kpiData.gastos} icon={<FiTrendingDown className="text-3xl text-red-400" />} />
                <KpiCard title="Balance" amount={kpiData.balance} icon={<FiDollarSign className="text-3xl text-indigo-400" />} />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="bg-gray-800 p-6 rounded-2xl shadow xl:col-span-2 relative min-h-[320px]">
                    <h2 className="text-xl font-semibold mb-4">Distribución de Gastos</h2>
                    {loading ? (<div className="flex items-center justify-center h-80 text-gray-400">Cargando...</div>
                    ) : pieChartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie data={pieChartData} cx="50%" cy="50%" outerRadius={120} dataKey="value" nameKey="name" labelLine={false} label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}>
                                    {pieChartData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `Q${value.toFixed(2)}`} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (<div className="flex items-center justify-center h-80 text-gray-400">No hay gastos para mostrar</div>)}
                </div>

                <div className="bg-gray-800 p-6 rounded-2xl shadow">
                    <h2 className="text-xl font-semibold mb-4">Transacciones Recientes</h2>
                    {loading ? (<div className="text-gray-400">Cargando...</div>
                    ) : (
                        <div className="space-y-4">
                            {recentTransactions.length > 0 ? recentTransactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium">{tx.categories?.name || 'Ingreso'}</p>
                                        <p className="text-sm text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                                    </div>
                                    <p className={`font-semibold ${tx.kind === 'in' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.kind === 'in' ? '+' : '-'}Q{tx.amount.toFixed(2)}
                                    </p>
                                </div>
                            )) : <p className="text-gray-500">No hay transacciones</p>}
                        </div>
                    )}
                </div>
            </div>

            <button onClick={() => setIsModalOpen(true)} className="fixed bottom-8 right-8 w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl shadow-lg hover:bg-indigo-500 transition-transform hover:scale-110">
                <FiPlus />
            </button>
            <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={fetchDashboardData} />
        </div>
    );
};

export default DashboardPage;