import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler, type FieldErrors} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../supabaseClient';
import { FiX } from 'react-icons/fi';
import type { Resolver } from 'react-hook-form';
import type { Path, UseFormRegister } from "react-hook-form";

type Tab = 'income' | 'expense' | 'transfer';

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: 'income' | 'expense' }

// --- Esquemas Zod ---
const transactionSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a cero' }),
  account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta' }),
  category_id: z.string().uuid({ message: 'Debe seleccionar una categoría' }),
  date: z.string().nonempty({ message: 'La fecha es requerida' }),
  note: z.string().optional(),
});

const transferSchema = z.object({
  amount: z.coerce.number().positive({ message: 'El monto debe ser mayor a cero' }),
  from_account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta de origen' }),
  to_account_id: z.string().uuid({ message: 'Debe seleccionar una cuenta de destino' }),
  date: z.string().nonempty({ message: 'La fecha es requerida' }),
  note: z.string().optional(),
}).refine(data => data.from_account_id !== data.to_account_id, {
  message: "Las cuentas no pueden ser las mismas",
  path: ["to_account_id"],
});

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

  // Formularios separados con sus resolvers
  const transactionForm = useForm<TransactionFormInputs>({
  resolver: zodResolver(transactionSchema) as unknown as Resolver<TransactionFormInputs, any>,
  defaultValues: { date: new Date().toISOString().substring(0, 10), note: '' }
});

const transferForm = useForm<TransferFormInputs>({
  resolver: zodResolver(transferSchema) as unknown as Resolver<TransferFormInputs, any>,
  defaultValues: { date: new Date().toISOString().substring(0, 10), note: '' }
});

  // Cambiar entre formularios limpiamente
  const currentForm = activeTab === 'transfer' ? transferForm : transactionForm;
  const { register, handleSubmit, reset, formState: { errors } } = currentForm;

  useEffect(() => {
    transactionForm.reset();
    transferForm.reset();
  }, [activeTab]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('user_id', user.id);

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id);

      setAccounts(accountsData || []);
      setCategories(categoriesData || []);
    };
    fetchData();
  }, [isOpen]);

  const onSubmit: SubmitHandler<TransactionFormInputs | TransferFormInputs> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (activeTab === 'transfer') {
      ({ error } = await supabase.from('transfers').insert({ ...formData, user_id: user.id }));
    } else {
      const kind = activeTab === 'income' ? 'in' : 'out';
      ({ error } = await supabase.from('transactions').insert({ ...formData, user_id: user.id, kind }));
    }

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter(
    c => c.type === (activeTab === 'income' ? 'income' : 'expense')
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md relative text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FiX size={24} />
        </button>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 mb-6">
          <TabButton name="Gasto" tab="expense" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton name="Ingreso" tab="income" activeTab={activeTab} setActiveTab={setActiveTab} />
          <TabButton name="Transferencia" tab="transfer" activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>

        {/* Formulario dinámico */}
{activeTab === 'transfer' ? (
  <form
    onSubmit={transferForm.handleSubmit(onSubmit as SubmitHandler<TransferFormInputs>)}
    className="space-y-4"
  >
    <div>
      <label className="text-sm font-medium">Monto</label>
      <input
        type="number"
        step="0.01"
        {...transferForm.register('amount')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
        placeholder="0.00"
      />
      {transferForm.formState.errors.amount && (
        <p className="text-red-500 text-sm mt-1">
          {String(transferForm.formState.errors.amount.message)}
        </p>
      )}
    </div>

    <SelectField
      label="Desde la cuenta"
      name="from_account_id"
      register={transferForm.register}
      options={accounts}
      error={transferForm.formState.errors.from_account_id}
    />
    <SelectField
      label="Hacia la cuenta"
      name="to_account_id"
      register={transferForm.register}
      options={accounts}
      error={transferForm.formState.errors.to_account_id}
    />

    <div>
      <label className="text-sm font-medium">Fecha</label>
      <input
        type="date"
        {...transferForm.register('date')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
      />
      {transferForm.formState.errors.date && (
        <p className="text-red-500 text-sm mt-1">
          {String(transferForm.formState.errors.date.message)}
        </p>
      )}
    </div>

    <div>
      <label className="text-sm font-medium">Nota (Opcional)</label>
      <input
        {...transferForm.register('note')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
      />
    </div>

    <div className="pt-4">
      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-lg transition"
      >
        Guardar
      </button>
    </div>
  </form>
) : (
  <form
    onSubmit={transactionForm.handleSubmit(onSubmit as SubmitHandler<TransactionFormInputs>)}
    className="space-y-4"
  >
    <div>
      <label className="text-sm font-medium">Monto</label>
      <input
        type="number"
        step="0.01"
        {...transactionForm.register('amount')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
        placeholder="0.00"
      />
      {transactionForm.formState.errors.amount && (
        <p className="text-red-500 text-sm mt-1">
          {String(transactionForm.formState.errors.amount.message)}
        </p>
      )}
    </div>

    <SelectField
      label="Cuenta"
      name="account_id"
      register={transactionForm.register}
      options={accounts}
      error={transactionForm.formState.errors.account_id}
    />
    <SelectField
      label="Categoría"
      name="category_id"
      register={transactionForm.register}
      options={filteredCategories}
      error={transactionForm.formState.errors.category_id}
    />

    <div>
      <label className="text-sm font-medium">Fecha</label>
      <input
        type="date"
        {...transactionForm.register('date')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
      />
      {transactionForm.formState.errors.date && (
        <p className="text-red-500 text-sm mt-1">
          {String(transactionForm.formState.errors.date.message)}
        </p>
      )}
    </div>

    <div>
      <label className="text-sm font-medium">Nota (Opcional)</label>
      <input
        {...transactionForm.register('note')}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
      />
    </div>

    <div className="pt-4">
      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-3 rounded-lg transition"
      >
        Guardar
      </button>
    </div>
  </form>
)}

      </div>
    </div>
  );
};

// Subcomponentes con tipado correcto
interface TabButtonProps {
  name: string;
  tab: Tab;
  activeTab: Tab;
  setActiveTab: React.Dispatch<React.SetStateAction<Tab>>;
}

const TabButton: React.FC<TabButtonProps> = ({ name, tab, activeTab, setActiveTab }) => (
  <button
    type="button"
    onClick={() => setActiveTab(tab)}
    className={`py-2 px-4 text-sm font-medium ${
      activeTab === tab
        ? 'border-b-2 border-indigo-500 text-white'
        : 'text-gray-400'
    }`}
  >
    {name}
  </button>
);

interface SelectFieldProps<T extends Record<string, any>> {
  label: string;
  name: Path<T>;
  register: UseFormRegister<T>;
  options: { id: string; name: string }[];
  error?: { message?: string };
}

function SelectField<T extends Record<string, any>>({
  label,
  name,
  register,
  options,
  error,
}: SelectFieldProps<T>) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <select
        {...register(name)}
        className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3"
      >
        <option value="">Seleccionar...</option>
        {options.map(opt => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </select>
      {error?.message && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  );
}

export default TransactionModal;
