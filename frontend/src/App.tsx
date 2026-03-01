import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Pages
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import StudentDashboard from './pages/student/StudentDashboard';
import ModulesList from './pages/student/ModulesList';
import SelfAssessment from './pages/student/SelfAssessment';
import SmartGuide from './pages/student/SmartGuide';
import JobsList from './pages/student/JobsList';
import EventsList from './pages/student/EventsList';
import AIAssistant from './pages/AIAssistant';
import MentorDashboard from './pages/mentor/MentorDashboard';
import StudentsList from './pages/mentor/StudentsList';
import AdminDashboard from './pages/admin/AdminDashboard';
import ChatPage from './pages/chat/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Routes */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="modules" element={<ModulesList />} />
                    <Route path="assessment" element={<SelfAssessment />} />
                    <Route path="jobs" element={<JobsList />} />
                    <Route path="events" element={<EventsList />} />
                    <Route path="smartguide" element={<SmartGuide />} />
                    <Route path="ai-assistant" element={<AIAssistant />} />
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/mentor/*"
            element={
              <ProtectedRoute allowedRoles={['MENTOR']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<MentorDashboard />} />
                    <Route path="students" element={<StudentsList />} />
                    {/* Add more mentor routes here */}
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['DEPT_ADMIN', 'SUPER_ADMIN']}>
                <DashboardLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    {/* Add more admin routes here */}
                  </Routes>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Shared Authenticated Routes */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChatPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
