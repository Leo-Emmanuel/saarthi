import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminHome from './pages/admin/AdminHome';
import AdminStudents from './pages/admin/AdminStudents';
import AdminExams from './pages/admin/AdminExams';
import AdminStaff from './pages/admin/AdminStaff';
import AdminSettings from './pages/admin/AdminSettings';
import DashboardLayout from './layouts/DashboardLayout';
import ExamView from './pages/ExamView';
import EvaluationView from './pages/EvaluationView';
import VoiceLogin from './pages/VoiceLogin';
import MathExamView from './pages/MathExamView';
import ErrorBoundary from './components/ErrorBoundary';
import BrowserGuard from './components/BrowserGuard';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalAlert from './components/GlobalAlert';
import usePageVoice from './hooks/usePageVoice';

function PageVoiceAnnouncer() {
  usePageVoice();
  return null;
}

function App() {
  return (
    <BrowserGuard>
      <Router>
        <AuthProvider>
          <PageVoiceAnnouncer />
          <Routes>
            {/* ── Public routes ─────────────────────────────────────────── */}
            <Route path="/login" element={<Login />} />
            <Route path="/voice-login" element={<VoiceLogin />} />
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* ── Role-protected routes ──────────────────────────────────── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminHome />} />
              <Route path="students" element={<AdminStudents />} />
              <Route path="exams" element={<AdminExams />} />
              <Route path="staff" element={<AdminStaff />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            <Route
              path="/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<TeacherDashboard />} />
            </Route>
            <Route
              path="/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<StudentDashboard />} />
            </Route>

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
      <GlobalAlert />
    </BrowserGuard>
  );
}

export default App;
