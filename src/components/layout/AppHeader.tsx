import { Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export function AppHeader() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
      <Link to="/" className="text-sm font-medium text-foreground">
        Evolução Plantão Noturno
      </Link>
      <nav className="flex items-center gap-2">
        {user ? (
          <>
            <Button variant="ghost" size="sm" render={<Link to="/admin" />}>
              Registros
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Sair
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" render={<Link to="/login" />}>
            Entrar
          </Button>
        )}
      </nav>
    </header>
  )
}
