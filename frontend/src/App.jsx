import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Historico from './pages/Historico.jsx'
import DetalheDaily from './pages/DetalheDaily.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/historico" element={<Historico />} />
        <Route path="/historico/:id" element={<DetalheDaily />} />
      </Routes>
    </Layout>
  )
}