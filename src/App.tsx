import { Navigate, Route, Routes } from "react-router-dom"

import { AppHeader } from "@/components/layout/AppHeader"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { EvolucaoFormPage } from "@/pages/EvolucaoFormPage"
import { LoginPage } from "@/pages/LoginPage"
import { AdminListPage } from "@/pages/AdminListPage"
import { AdminEditPage } from "@/pages/AdminEditPage"

function App() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<EvolucaoFormPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminListPage />} />
            <Route path="/admin/:id" element={<AdminEditPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
