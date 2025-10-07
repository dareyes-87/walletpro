import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FiPlus, FiTrash2, FiEdit, FiX, FiTag } from 'react-icons/fi';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color?: string | null;
}

// SOLUCIÓN: Hacer el color opcional y permitir que sea nulo en el esquema
const categorySchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  type: z.enum(['income', 'expense']),
  color: z.string().optional().nullable(),
});

type CategoryFormInputs = z.infer<typeof categorySchema>;

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CategoryFormInputs>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', type: 'expense', color: '#888888' }
  });

  const fetchCategories = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
    } else if (data) {
      setCategories(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openModalForNew = () => {
    reset({ name: '', type: 'expense', color: '#888888' });
    setEditingCategory(null);
    setShowModal(true);
  };

  const openModalForEdit = (category: Category) => {
    setEditingCategory(category);
    reset(category); // reset ya puede manejar `null` gracias al esquema
    setShowModal(true);
  };

  const deleteCategory = async (categoryId: string) => {
    if (window.confirm('¿Estás seguro?')) {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) {
        alert('Error al eliminar la categoría.');
      } else {
        fetchCategories();
      }
    }
  };

  const onSubmit: SubmitHandler<CategoryFormInputs> = async (formData) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dataToSubmit = { ...formData, user_id: user.id };
    let error;

    if (editingCategory) {
      ({ error } = await supabase.from('categories').update(dataToSubmit).eq('id', editingCategory.id));
    } else {
      ({ error } = await supabase.from('categories').insert(dataToSubmit));
    }

    if (error) {
      alert(error.message);
    } else {
      setShowModal(false);
      fetchCategories();
    }
  };

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold">Categorías</h1>
          <p className="text-gray-400 mt-1">Clasifica tus ingresos y gastos.</p>
        </div>
        <button
          onClick={openModalForNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg flex items-center transition"
        >
          <FiPlus className="mr-2" /> Añadir Categoría
        </button>
      </div>

      {loading ? <p>Cargando...</p> : (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <ul className="divide-y divide-gray-700">
            {categories.map(category => (
              <li key={category.id} className="py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="p-2 bg-gray-700 rounded-full">
                    <FiTag style={{ color: category.color || '#FFFFFF' }} />
                  </span>
                  <div>
                    <p className="font-semibold text-lg">{category.name}</p>
                    <p className={`text-sm font-bold ${category.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {category.type === 'income' ? 'Ingreso' : 'Gasto'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => openModalForEdit(category)} className="text-gray-400 hover:text-white"><FiEdit size={18} /></button>
                  <button onClick={() => deleteCategory(category.id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={18} /></button>
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
            <h2 className="text-2xl font-bold mb-6">{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Nombre</label>
                <input {...register('name')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3" />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Tipo</label>
                <select {...register('type')} className="mt-1 w-full bg-gray-700 border-gray-600 rounded-lg p-3">
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
                {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Color</label>
                <input type="color" {...register('color')} className="mt-1 w-full h-10 p-1 bg-gray-700 border-gray-600 rounded-lg" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition">
                  Guardar Categoría
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;