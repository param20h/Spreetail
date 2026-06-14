import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useGroups } from './hooks/useGroups';
import Layout from './components/layout/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import BalanceDetail from './pages/BalanceDetail';
import Members from './pages/Members';
import Import from './pages/Import';
import Spinner from './components/ui/Spinner';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { groups, currentGroup, selectGroup, createGroup, fetchGroups } = useGroups();

  return (
    <Routes>
      {/* Public Landing/Front Page */}
      <Route path="/" element={<Landing />} />

      {/* Public Auth Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" replace />} />

      {/* Protected App Routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout
              groups={groups}
              currentGroup={currentGroup}
              onSelectGroup={selectGroup}
              onCreateGroup={createGroup}
            />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard currentGroup={currentGroup} />} />
        <Route path="/expenses" element={<Expenses currentGroup={currentGroup} />} />
        <Route path="/balance" element={<BalanceDetail currentGroup={currentGroup} />} />
        <Route path="/members" element={<Members currentGroup={currentGroup} onRefreshGroup={fetchGroups} />} />
        <Route path="/import" element={<Import currentGroup={currentGroup} />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

