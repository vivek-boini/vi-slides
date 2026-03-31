import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
// Teacher pages
import Dashboard from "./pages/teacher/Dashboard";
import CreateSession from "./pages/teacher/CreateSession";
import LiveSession from "./pages/teacher/LiveSession";
// Student pages
import StudentDashboard from "./pages/Student/dashboard";
import StudentSession from "./pages/Student/Session";
import StudentAssignments from "./pages/Student/Assignments";
import StudentGroupAssignments from "./pages/Student/GroupAssignments";
import StudentAssignmentDetail from "./pages/Student/AssignmentDetail";
import "./App.css";

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={user ? (user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard") : "/login"}
              replace
            />
          }
        />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Teacher Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedRoute role="teacher" />}>
            <Route path="/teacher/dashboard" element={<Dashboard />} />
            <Route path="/teacher/session/create" element={<CreateSession />} />
            <Route path="/teacher/session/:id" element={<LiveSession />} />
            <Route path="/teacher/assignments" element={<Dashboard />} />
          </Route>
        </Route>

        {/* Student Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/session" element={<StudentSession />} />
            <Route path="/student/session/:sessionCode" element={<StudentSession />} />
            <Route path="/student/assignments" element={<StudentAssignments />} />
            <Route path="/student/assignments/group" element={<StudentGroupAssignments />} />
            <Route path="/student/assignments/detail" element={<StudentAssignmentDetail />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
