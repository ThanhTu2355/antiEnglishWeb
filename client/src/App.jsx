import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/useAuth';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import FolderDetailPage from './pages/FolderDetailPage';
import FlashcardStudyPage from './pages/FlashcardStudyPage';
import FillMeaningPracticePage from './pages/FillMeaningPracticePage';

// Protected layout with Navbar and nested route views
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center text-theme-muted">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-theme-main">Đang tải AntiEnglish Web...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-app text-theme-muted flex flex-col font-sans transition-colors duration-200">
      <Navbar />
      <main className="flex-1 pb-16">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/folders/:id" element={<FolderDetailPage />} />
          <Route path="/flashcards" element={<FlashcardStudyPage />} />
          <Route path="/flashcards/:folderId" element={<FlashcardStudyPage />} />
          <Route path="/practice" element={<FillMeaningPracticePage />} />
          <Route path="/practice/:folderId" element={<FillMeaningPracticePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// Public route for login & register (redirect to home if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

