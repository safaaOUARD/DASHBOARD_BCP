import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

import Layout from './Layout.jsx'
import App from './App.jsx'
import SetupGate from './components/SetupGate.jsx'
import AdministrationPage from './components/AdministrationPage.jsx'
import DashboardSegmentation from './DashboardSegmentation.jsx'
import DashboardZone from './DashboardZone.jsx'

import DashboardSouverains from './DashboardSouverains.jsx'
import DashboardRatingPays from './DashboardRatingPays.jsx'
import DashboardCustom from './DashboardCustom.jsx'
import DashboardEncoursSouverains from './DashboardEncoursSouverains.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SetupGate>
      <BrowserRouter>
        <Routes>
          {/* Layout affiche le Header (menu + connexion) autour de toutes les pages */}
          <Route element={<Layout />}>
            <Route path="/" element={<App />} />
            <Route path="/admin" element={<AdministrationPage />} />
            <Route path="/dashboard/segmentation" element={<DashboardSegmentation />} />
            <Route path="/dashboard/zone" element={<DashboardZone />} />

            <Route path="/dashboard/souverains" element={<DashboardSouverains />} />
            <Route path="/dashboard/rating-pays" element={<DashboardRatingPays />} />
            <Route path="/dashboard/custom" element={<DashboardCustom />} />
            <Route path="/dashboard/encours-souverains" element={<DashboardEncoursSouverains />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SetupGate>
  </React.StrictMode>,
)