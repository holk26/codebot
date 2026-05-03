import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Onboarding from './pages/Onboarding'
import Install from './pages/Install'
import Configure from './pages/Configure'
import Process from './pages/Process'
import Logs from './pages/Logs'
import Services from './pages/Services'
import Updates from './pages/Updates'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/install" element={<Install />} />
      <Route path="/configure" element={<Configure />} />
      <Route path="/process" element={<Process />} />
      <Route path="/logs" element={<Logs />} />
      <Route path="/services" element={<Services />} />
      <Route path="/updates" element={<Updates />} />
    </Routes>
  )
}
