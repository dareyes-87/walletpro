import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../supabaseClient';
import { FiX } from 'react-icons/fi';

// --- Definición de tipos y esquemas ---
type Tab = 'income' | 'expense' | 'transfer';

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: 'income' | 'expense' }

// Esquema para Ingresos/Gastos
const transactionSchema = z.object({
  amount: z.preprocess((val) => Number(String(val)), z.number().positive({ message: 'El monto debe ser mayor a cero' })),
  account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta' }),
  category_id: z.string().uuid({ message: 'Debe seleccionar una categoría' }),
  date: z.string().nonempty({ message: 'La fecha es requerida' }),
  note: z.string().optional(),
});

// Esquema para Transferencias
const transferSchema = z.object({
  amount: z.preprocess((val) => Number(String(val)), z.number().positive({ message: 'El monto debe ser mayor a cero' })),
  from_account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta de origen' }),
  to_account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta de destino' }),
  date: z.string().nonempty({ message: 'La fecha es requerida' }),
  note: z.string().optional(),
}).refine(data => data.from_account_id !== data.to_account_id, {
  message: "Las cuentas de origen y destino no pueden ser las mismas",
  path: ["to_account_id"],
});

// Tipos inferidos
type TransactionFormInputs = z.infer<typeof transactionSchema>;
type TransferFormInputs = z.infer<typeof transferSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<Tab>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Función para obtener el esquema y el resolver correctos
  const getFormConfig = (tab: Tab) => {
    const schema = tab === 'transfer' ? transferSchema : transactionSchema;
    return {
      resolver: zodResolver(schema),
      defaultValues: {
        date: new Date().toISOString().substring(0, 10),
        amount: 0,
        note: '',
        ...(tab === 'transfer'
          ? { from_account_id: '', to_account_id: '' }
          : { account_id: '', category_id: '' }),
      },
    };
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm(getFormConfig(activeTab));

  // Efecto para reiniciar el formulario cuando cambia la pestaña
  useEffect(() => {
    reset(getFormConfig(activeTab).defaultValues);
  }, [activeTab, reset]);

  // Efecto para cargar datos cuando se abre el modal
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: accountsData } = await supabase.from('accounts').select('id, name').eq('user_id', user.id);
      const { data: categoriesData } = await supabase.from('categories').select('id, name, type').eq('user_id', user.id);
      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    };
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const onSubmit: SubmitHandler<any> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (activeTab === 'transfer') {
      const data: TransferFormInputs & { user_id: string } = { ...formData, user_id: user.id };
      ({ error } = await supabase.from('transfers').insert(data));
    } else {
      const kind = activeTab === 'income' ? 'in' : 'out';
      const data: TransactionFormInputs & { user_id: string, kind: 'in' | 'out' } = { ...formData, user_id: user.id, kind };
      ({ error } = await supabase.from('transactions').insert(data));
    }

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(c => c.type === (activeTab === 'income' ? 'income' : 'expense'));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md relative text-white">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><FiX size={24} /></button>
        <div className="flex border-b border-gray-700 mb-6">
          <TabButton name="Gasto" tab="expense" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton name="Ingreso" tab="income" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton name="Transferencia" tab="transfer" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Monto</label>
            <input type="number" step="0.01" {...register('amount')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" placeholder="0.00" />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{String(errors.amount.message)}</p>}
          </div>
          {activeTab === 'transfer' ? (
            <>
              <SelectField label="Desde la cuenta" name="from_account_id" register={register} options={accounts} error={errors.from_account_id} />
              <SelectField label="Hacia la cuenta" name="to_account_id" register={register} options={accounts} error={errors.to_account_id} />
            </>
          ) : (
            <>
              <SelectField label="Cuenta" name="account_id" register={register} options={accounts} error={errors.account_id} />
              <SelectField label="Categoría" name="category_id" register={register} options={filteredCategories} error={errors.category_id} />
            </>
          )}
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <input type="date" {...register('date')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
            {errors.date && <p className="text-red-500 text-sm mt-1">{String(errors.date.message)}</p>}
          </div>
          <div>
            <label className="text-sm font-medium">Nota (Opcional)</label>
            <input {...register('note')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
          </div>
          <div className="pt-4">
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-lg transition">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ name: string; tab: Tab; activeTab: Tab; setActiveTab: (tab: Tab) => void }> = ({ name, tab, activeTab, setActiveTab }) => (
  <button type="button" onClick={() => setActiveTab(tab)} className={`py-2 px-4 text-sm font-medium ${activeTab === tab ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>
    {name}
  </button>
);

const SelectField: React.FC<any> = ({ label, name, register, options, error }) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <select {...register(name)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3">
      <option value="">Seleccionar...</option>
      {options.map((opt: {id: string; name: string}) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
  </div>
);

export default TransactionModal;