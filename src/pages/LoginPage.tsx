import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
// Ícono para el logo, instala react-icons: npm install react-icons
import { FiTrendingUp } from 'react-icons/fi';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // La función handleAuth se mantiene igual que en la versión anterior...
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <FiTrendingUp className="mx-auto h-12 w-auto text-indigo-500" />
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {isLogin ? 'Accede a tu cuenta' : 'Crea una nueva cuenta'}
          </h2>
          <p className="mt-2 text-gray-400">
            Y toma el control de tus finanzas hoy mismo.
          </p>
        </div>

        <form className="bg-gray-800 p-8 rounded-xl shadow-2xl space-y-6" onSubmit={handleAuth}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">Correo electrónico</label>
              <input
                id="email"
                type="email"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Contraseña</label>
              <input
                id="password"
                type="password"
                required
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center pt-2">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 transition duration-150 ease-in-out disabled:opacity-50"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="font-medium text-indigo-400 hover:text-indigo-300 transition duration-150 ease-in-out"
          >
            {isLogin ? '¿Aún no tienes cuenta? Regístrate' : '¿Ya tienes una cuenta? Inicia Sesión'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;