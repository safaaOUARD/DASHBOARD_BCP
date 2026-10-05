import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import LoginPage from './components/LoginPage'
import { getUser, logout as logoutSession } from './utils/auth'
import { DateArretProvider } from './context/DateArretContext'
import AssistantChat from './components/AssistantChat'


export default function Layout() {
  const [utilisateur, setUtilisateur] = useState(getUser())

  if (!utilisateur) {
    return <LoginPage onLoggedIn={setUtilisateur} />
  }

  const handleLogout = () => {
    logoutSession()
    setUtilisateur(null)
  }

  return (
    <DateArretProvider>
      <div className="bcp-shell">
        <Sidebar />
        <div className="bcp-shell-body">
          <Header utilisateur={utilisateur} onLogout={handleLogout} />
          <div className="page-content">
            <Outlet context={{ utilisateur, setUtilisateur }} />
          </div>
          <AssistantChat utilisateur={utilisateur} />
        </div>
      </div>
    </DateArretProvider>
  )
}
