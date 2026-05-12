import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ShieldCheck, AlertTriangle, MessageSquare, History } from 'lucide-react'
import Overview from './pages/Overview'
import Violations from './pages/Violations'
import Chat from './pages/Chat'
import PipelineHistory from './pages/PipelineHistory'
import './App.css'

function Layout({ children }) {
  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="brand">
          <ShieldCheck size={22} />
          <span>Compliance</span>
        </div>
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <ShieldCheck size={16} /> Overview
        </NavLink>
        <NavLink to="/violations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <AlertTriangle size={16} /> Violations
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <MessageSquare size={16} /> Chat
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <History size={16} /> History
        </NavLink>
      </nav>
      <main className="content">{children}</main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><Overview /></Layout>} />
        <Route path="/violations" element={<Layout><Violations /></Layout>} />
        <Route path="/chat" element={<Layout><Chat /></Layout>} />
        <Route path="/history" element={<Layout><PipelineHistory /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
