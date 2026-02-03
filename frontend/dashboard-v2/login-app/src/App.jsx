import { usePrivy } from '@privy-io/react-auth'
import { useEffect } from 'react'

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://sorted-backend.onrender.com'
const DASHBOARD_ENTRY = '/dashboard.html?flow=setup'

export default function App() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy()

  // Handle successful authentication
  useEffect(() => {
    async function handleAuth() {
      if (ready && authenticated && user) {
        try {
          // Get access token
          const accessToken = await getAccessToken()

          // Verify with backend and get/create developer
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          })

          if (res.ok) {
            const data = await res.json()

            // Store auth data
            localStorage.setItem('sorted_privy_token', accessToken)
            localStorage.setItem('sorted_developer', JSON.stringify(data.developer))

            // Redirect to dashboard
            window.location.href = DASHBOARD_ENTRY
          } else {
            console.error('Backend auth failed:', await res.text())
          }
        } catch (err) {
          console.error('Auth error:', err)
        }
      }
    }

    handleAuth()
  }, [ready, authenticated, user, getAccessToken])

  // Check for existing session on load
  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem('sorted_privy_token')
      if (token && !authenticated) {
        try {
          const res = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          })
          if (res.ok) {
            window.location.href = DASHBOARD_ENTRY
          } else {
            // Token invalid, clear it
            localStorage.removeItem('sorted_privy_token')
            localStorage.removeItem('sorted_developer')
          }
        } catch (err) {
          console.error('Session check failed:', err)
        }
      }
    }

    if (ready) {
      checkSession()
    }
  }, [ready, authenticated])

  if (!ready) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#6b6779' }}>
        Loading...
      </div>
    )
  }

  if (authenticated) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#22c55e', marginBottom: '16px' }}>
          Logged in. Redirecting...
        </p>
        <button
          onClick={logout}
          style={{
            background: 'transparent',
            border: '1px solid #27252b',
            color: '#6b6779',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Sign out instead
        </button>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <button
        onClick={login}
        style={{
          background: '#22c55e',
          border: 'none',
          color: '#0e0e10',
          padding: '14px 32px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: 'Inter, -apple-system, sans-serif',
        }}
      >
        Sign in
      </button>
      <p style={{
        marginTop: '16px',
        fontSize: '13px',
        color: '#6b6779'
      }}>
        Email, Google, or wallet
      </p>
    </div>
  )
}
