import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
// prettier-ignore
import { FiHome, FiList, FiPieChart, FiTag, FiCreditCard, FiSettings, FiLogOut, FiMenu } from 'react-icons/fi'; // <-- SOLUCIÓN: Añadimos los iconos que faltaban

// Items del menú (sin cambios)
const navItems = [
  { icon: FiHome, text: 'Inicio', path: '/dashboard' },
  { icon: FiCreditCard, text: 'Cuentas', path: '/accounts' },
  { icon: FiTag, text: 'Categorías', path: '/categories' },
  { icon: FiList, text: 'Registros', path: '/transactions' },
  { icon: FiPieChart, text: 'Estadísticas', path: '/stats' },
];

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-white">
      <div className="px-6 py-4">
        <h1 className="text-2xl font-bold text-white">WalletGT</h1>
      </div>
      <nav className="flex-grow px-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                isActive ? 'bg-indigo-600 font-semibold' : 'hover:bg-gray-700'
              }`
            }
          >
            <item.icon className="mr-4 text-xl" />
            <span>{item.text}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button className="flex items-center w-full px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors duration-200">
          <FiSettings className="mr-4 text-xl" /> Configuración
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 mt-2 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors duration-200"
        >
          <FiLogOut className="mr-4 text-xl" /> Cerrar Sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-shrink-0 w-64 bg-gray-800 shadow-lg">
        <SidebarContent />
      </aside>

      {/* Overlay Móvil */}
      <div
        className={`fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar Móvil */}
      <aside
        className={`fixed top-0 left-0 z-30 h-full w-64 bg-gray-800 transform transition-transform duration-300 ease-in-out md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Contenido Principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="flex items-center justify-between p-4 bg-gray-800/50 backdrop-blur-sm md:justify-end">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden text-2xl text-white">
            <FiMenu />
          </button>
          <div className="text-white">dhreyes03@gmail.com</div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;