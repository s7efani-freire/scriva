import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Historico from './pages/Historico.jsx'
import DetalheDaily from './pages/DetalheDaily.jsx'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout><Home /></Layout>,
  },
  {
    path: '/historico',
    element: <Layout><Historico /></Layout>,
  },
  {
    path: '/historico/:id',
    element: <Layout><DetalheDaily /></Layout>,
  },
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)