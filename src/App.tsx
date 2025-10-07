import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppLayout from './components/AppLayout';
import type { Session } from '@supabase/supabase-js';
import AccountsPage from './pages/AccountsPage';
import CategoriesPage from './pages/CategoriesPage';

function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <Routes> {/* <-- El contenedor principal de rutas */}
        
        {/* Ruta pública */}
        <Route path="/" element={!session ? <LoginPage /> : <Navigate to="/dashboard" />} />
        
        {/* Rutas Protegidas */}
        <Route 
          path="/dashboard" 
          element={session ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/" />} 
        />
        <Route 
          path="/accounts"
          element={session ? <AppLayout><AccountsPage /></AppLayout> : <Navigate to="/" />} 
        />
        {/* --- SOLUCIÓN: La ruta de categorías debe estar aquí dentro --- */}
        <Route 
          path="/categories"
          element={session ? <AppLayout><CategoriesPage /></AppLayout> : <Navigate to="/" />} 
        />
        
      </Routes> {/* <-- Aquí cierra el contenedor de rutas */}
    </BrowserRouter>
  );
}

export default App;