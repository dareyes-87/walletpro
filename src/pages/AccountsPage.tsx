import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useForm, type SubmitHandler } from 'react-hook-form'; // <-- SOLUCIÓN 1: Importación de tipo explícita
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiPlus, FiTrash2, FiEdit, FiX } from 'react-icons/fi';

// Define el tipo de dato para una cuenta (basado en tu tabla de Supabase)
interface Account {
  id: string;
  name: string;
  institution?: string | null; // <-- SOLUCIÓN 2: Permitir null para compatibilidad con Supabase
  opening_balance: number;
}

// Esquema de validación con Zod
const accountSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  institution: z.string().optional(),
  opening_balance: z.preprocess(
    (val) => (String(val).trim() === '' ? undefined : Number(String(val))), // Maneja campos vacíos
    z.number().refine((val) => !isNaN(val), { message: 'Debe ser un número' }).min(0, { message: 'El saldo inicial no puede ser negativo' })
  ),
});

type AccountFormInputs = z.infer<typeof accountSchema>;

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AccountFormInputs>({
    resolver: zodResolver(accountSchema),
    defaultValues: { // <-- SOLUCIÓN 3: Proporcionar valores por defecto claros
      name: '',
      institution: '',
      opening_balance: 0,
    }
  });

  // Función para obtener las cuentas del usuario
  const fetchAccounts = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        setLoading(false);
        return;
    };

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
    } else if (data) {
      setAccounts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const openModalForNew = () => {
    reset({ name: '', institution: '', opening_balance: 0 });
    setEditingAccount(null);
    setShowModal(true);
  };

  const openModalForEdit = (account: Account) => {
    setEditingAccount(account);
    reset({
        name: account.name,
        institution: account.institution || '',
        opening_balance: account.opening_balance
    });
    setShowModal(true);
  };

  const deleteAccount = async (accountId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta cuenta? Esta acción no se puede deshacer.')) {
      const { error } = await supabase.from('accounts').delete().eq('id', accountId);
      if (error) {
        alert('Error al eliminar la cuenta. Es posible que tenga transacciones asociadas.');
      } else {
        fetchAccounts();
      }
    }
  };

  const onSubmit: SubmitHandler<AccountFormInputs> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dataToSubmit = { ...formData, user_id: user.id };
    let error;

    if (editingAccount) {
      // Actualizar cuenta existente
      ({ error } = await supabase.from('accounts').update(dataToSubmit).eq('id', editingAccount.id));
    } else {
      // Crear nueva cuenta
      ({ error } = await supabase.from('accounts').insert(dataToSubmit));
    }

    if (error) {
      alert(error.message);
    } else {
      setShowModal(false);
      fetchAccounts();
    }
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Cuentas</h1>
          <p className="text-gray-400 mt-1">Administra tus fuentes de ingresos y gastos.</p>
        </div>
        <button
          onClick={openModalForNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg flex items-center transition"
        >
          <FiPlus className="mr-2" /> Añadir Cuenta
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <ul className="divide-y divide-gray-700">
            {accounts.map(account => (
              <li key={account.id} className="py-4 flex flex-wrap justify-between items-center gap-4">
                <div>
                  <p className="font-semibold text-lg">{account.name}</p>
                  <p className="text-sm text-gray-400">{account.institution || 'Sin institución'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-mono text-lg">Q{account.opening_balance.toFixed(2)}</p>
                  <button onClick={() => openModalForEdit(account)} className="text-gray-400 hover:text-white"><FiEdit size={18} /></button>
                  <button onClick={() => deleteAccount(account.id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={18} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <FiX size={24} />
            </button>
            <h2 className="text-2xl font-bold mb-6">{editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Nombre de la cuenta</label>
                <input {...register('name')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Institución (Opcional)</label>
                <input {...register('institution')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Saldo Inicial</label>
                <input type="number" step="0.01" {...register('opening_balance')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
                {errors.opening_balance && <p className="text-red-500 text-sm mt-1">{errors.opening_balance.message}</p>}
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition">
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;