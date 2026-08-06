import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail } from 'lucide-react'

import { loginWithEmail } from '../../services/authService'
import './LoginPage.scss'

export function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Ingresa tu correo electrónico y contraseña.')
      return
    }

    try {
      setLoading(true)

      await loginWithEmail(email.trim(), password)

      navigate('/admin', { replace: true })
    }  catch (error) {
  console.error('Error al iniciar sesión:', error)

  setError(
    error instanceof Error
      ? error.message
      : 'Ocurrió un error al iniciar sesión.',
  )
}
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="login-logo">I</div>

        <div>
          <h1>Inventra</h1>
          <p>Gestión comercial para negocios que quieren crecer.</p>
        </div>
      </section>

      <section className="login-card">
        <header className="login-card__header">
          <span>Bienvenido</span>
          <h2>Inicia sesión en tu cuenta</h2>
          <p>Accede al panel administrativo de Inventra.</p>
        </header>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Correo electrónico
            <div className="login-input">
              <Mail size={19} />

              <input
                type="email"
                placeholder="nombre@correo.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
              />
            </div>
          </label>

          <label>
            Contraseña
            <div className="login-input">
              <LockKeyhole size={19} />

              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
              />
            </div>
          </label>

          {error && <div className="login-error">{error}</div>}

          <div className="login-options">
            <label className="login-remember">
              <input type="checkbox" disabled={loading} />
              Recordarme
            </label>

            <button type="button" className="login-link" disabled={loading}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <footer className="login-card__footer">
          © 2026 Inventra. Todos los derechos reservados.
        </footer>
      </section>
    </main>
  )
}