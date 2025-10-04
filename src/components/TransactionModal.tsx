import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form'; // <-- Cambio 1: Importación de tipo explícita
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../supabaseClient';
import { FiX } from 'react-icons/fi';

// --- Definición de tipos y esquemas ---
type Tab = 'income' | 'expense' | 'transfer';

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: 'income' | 'expense' } // <-- Añadido `type` aquí

// Esquema de validación para Ingresos/Gastos
const transactionSchema = z.object({
  amount: z.preprocess((val) => Number(String(val)), z.number().positive({ message: 'El monto debe ser mayor a cero' })),
  account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta' }),
  category_id: z.string().uuid({ message: 'Debe seleccionar una categoría' }),
  date: z.string().nonempty({ message: 'La fecha es requerida' }),
  note: z.string().optional(),
});

// Esquema de validación para Transferencias
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

// --- Cambio 2: Unión de los tipos de formulario ---
// Hacemos opcionales los campos que no existen en ambos formularios
const combinedSchema = z.union([transactionSchema, transferSchema]);
type FormInputs = z.infer<typeof transactionSchema> & Partial<z.infer<typeof transferSchema>>;


// --- Props del Componente ---
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // Para refrescar datos en el dashboard
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<Tab>('expense');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const currentSchema = activeTab === 'transfer' ? transferSchema : transactionSchema;
  
  // Especificamos el tipo unido en `useForm`
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormInputs>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      date: new Date().toISOString().substring(0, 10),
    }
  });
  
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
      reset({ date: new Date().toISOString().substring(0, 10) });
    }
  }, [isOpen, reset]);

  const onSubmit: SubmitHandler<FormInputs> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (activeTab === 'transfer') {
      const { from_account_id, to_account_id, amount, date, note } = formData;
      ({ error } = await supabase.from('transfers').insert({ from_account_id, to_account_id, amount, date, note, user_id: user.id }));
    } else {
      const kind = activeTab === 'income' ? 'in' : 'out';
      const { account_id, category_id, amount, date, note } = formData;
      ({ error } = await supabase.from('transactions').insert({ account_id, category_id, amount, date, note, user_id: user.id, kind }));
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
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>}
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
            {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
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

const SelectField: React.FC<{ label: string; name: keyof FormInputs; register: any; options: {id: string; name: string}[]; error: any }> = ({ label, name, register, options, error }) => (
  <div>
    <label className="text-sm font-medium">{label}</label>
    <select {...register(name)} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3">
      <option value="">Seleccionar...</option>
      {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
  </div>
);

export default TransactionModal;