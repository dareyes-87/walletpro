import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // La plantilla ya tiene este archivo
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AppLayout from './components/AppLayout';
import type { Session } from '@supabase/supabase-js';
import AccountsPage from './pages/AccountsPage';

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
      <Routes>
        <Route path="/" element={!session ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route 
          path="/dashboard" 
          element={session ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/" />} 
        />
        {/* Aquí irán las otras páginas como /accounts, etc. */}
        <Route 
          path="/accounts" // <-- 2. Añade la nueva ruta
          element={session ? <AppLayout><AccountsPage /></AppLayout> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;