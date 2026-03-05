import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ExamView from './pages/ExamView';
import EvaluationView from './pages/EvaluationView';
import VoiceLogin from './pages/VoiceLogin';
import MathExamView from './pages/MathExamView';
import ErrorBoundary from './components/ErrorBoundary';
import BrowserGuard from './components/BrowserGuard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserGuard>
      <Router>
        <AuthProvider>
          <Routes>
            {/* ── Public routes ─────────────────────────────────────────── */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/voice-login" element={<VoiceLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── Role-protected routes ──────────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* ── Auth-required routes (any logged-in role) ──────────────── */}
            <Route
              path="/exam/:id"
              element={
                <ProtectedRoute>
                  <ExamView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/math-exam/:id"
              element={
                <ProtectedRoute>
                  <ErrorBoundary><MathExamView /></ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/math-exam"
              element={
                <ProtectedRoute>
                  <ErrorBoundary><MathExamView /></ErrorBoundary>
                </ProtectedRoute>
              }
            />
            <Route
              path="/evaluation/:id"
              element={
                <ProtectedRoute>
                  <EvaluationView />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </BrowserGuard>
  );
}

export default App;
