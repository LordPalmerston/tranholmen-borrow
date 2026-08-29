import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Signup } from './pages/Signup';

import { Catalog } from './pages/Catalog';
import { ItemDetail } from './pages/ItemDetail';
import { Dashboard } from './pages/Dashboard';
import { ReturnFlow } from './pages/ReturnFlow';
import { Home } from './pages/Home';
import { Profile } from './pages/Profile';
import { AddItem } from './pages/AddItem';
import { EditItem } from './pages/EditItem';
import { Chat } from './pages/Chat';

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/item/:id" element={<ItemDetail />} />
            <Route path="/add-item" element={<AddItem />} />
            <Route path="/edit-item/:id" element={<EditItem />} />
            <Route path="/chat/:id" element={<Chat />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/return/:id" element={<ReturnFlow />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
