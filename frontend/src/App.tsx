import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/teacher/Dashboard'
import CreateSession from './pages/teacher/CreateSession'
import LiveSession from './pages/teacher/LiveSession'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/teacher/dashboard" replace />} />
            <Route path="/teacher/dashboard" element={<Dashboard />} />
            <Route path="/teacher/session/create" element={<CreateSession />} />
            <Route path="/teacher/session/:id" element={<LiveSession />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
