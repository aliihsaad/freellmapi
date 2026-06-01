import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import KeysPage from '@/pages/KeysPage'
import PlaygroundPage from '@/pages/PlaygroundPage'
import IntegrationsPage from '@/pages/IntegrationsPage'
import FallbackPage from '@/pages/FallbackPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import CapabilitiesPage from '@/pages/CapabilitiesPage'
import LogsPage from '@/pages/LogsPage'
import SettingsPage from '@/pages/SettingsPage'
import { AuthGate } from '@/components/auth-gate'

const queryClient = new QueryClient()

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative text-sm px-1 py-4 transition-colors ${
          isActive
            ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-px after:bg-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
  )
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('theme')
    return stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle theme">
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      )}
    </Button>
  )
}

function Brand() {
  const logoSrc = `${import.meta.env.BASE_URL}logo-mark.svg`

  return (
    <div className="flex items-center gap-2.5">
      <img src={logoSrc} alt="" className="size-5 shrink-0" aria-hidden="true" />
      <span className="font-semibold tracking-tight text-sm">FreeLLMAPI</span>
      <span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
        Pro Max
      </span>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthGate>
          <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
              <div className="max-w-6xl mx-auto px-6 flex items-center">
                <Brand />
                <nav className="flex items-center gap-5 ml-10">
                  <NavItem to="/playground">Playground</NavItem>
                  <NavItem to="/integrations">Integrations</NavItem>
                  <NavItem to="/keys">Keys</NavItem>
                  <NavItem to="/fallback">Fallback</NavItem>
                  <NavItem to="/capabilities">Capabilities</NavItem>
                  <NavItem to="/logs">Logs</NavItem>
                  <NavItem to="/analytics">Analytics</NavItem>
                  <NavItem to="/settings">Settings</NavItem>
                </nav>
                <div className="ml-auto py-2">
                  <DarkModeToggle />
                </div>
              </div>
            </header>
            <main className="max-w-6xl mx-auto px-6 py-8">
              <Routes>
                <Route path="/" element={<Navigate to="/playground" replace />} />
                <Route path="/playground" element={<PlaygroundPage />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/keys" element={<KeysPage />} />
                <Route path="/fallback" element={<FallbackPage />} />
                <Route path="/capabilities" element={<CapabilitiesPage />} />
                <Route path="/logs" element={<LogsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/test" element={<Navigate to="/playground" replace />} />
                <Route path="/health" element={<Navigate to="/keys" replace />} />
              </Routes>
            </main>
          </div>
        </AuthGate>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
