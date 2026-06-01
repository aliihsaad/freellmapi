import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DashboardAuthStatus {
  pinEnabled: boolean
  authenticated: boolean
}

function AuthShell({
  pin,
  setPin,
  onSubmit,
  isPending,
  error,
}: {
  pin: string
  setPin: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  isPending: boolean
  error: string | null
}) {
  const logoSrc = `${import.meta.env.BASE_URL}logo-mark.svg`

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm flex-col justify-center">
        <div className="mb-5 flex items-center gap-2.5">
          <img src={logoSrc} alt="" className="size-6 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-tight">FreeLLMAPI</span>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <div className="mb-1 flex size-9 items-center justify-center rounded-lg border bg-muted/40">
              <LockKeyhole className="size-4" aria-hidden="true" />
            </div>
            <CardTitle>Dashboard locked</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="dashboard-pin">PIN</Label>
                <Input
                  id="dashboard-pin"
                  type="password"
                  value={pin}
                  onChange={event => setPin(event.target.value)}
                  autoFocus
                  autoComplete="current-password"
                  className="font-mono"
                />
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={pin.trim().length < 4 || isPending}>
                <KeyRound className="size-3.5" aria-hidden="true" />
                {isPending ? 'Unlocking...' : 'Unlock'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [pin, setPin] = useState('')

  const { data, isLoading, isError, error } = useQuery<DashboardAuthStatus>({
    queryKey: ['auth', 'status'],
    queryFn: () => apiFetch('/api/auth/status'),
    retry: false,
  })

  const login = useMutation({
    mutationFn: () =>
      apiFetch<DashboardAuthStatus>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      }),
    onSuccess: () => {
      setPin('')
      queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
    },
  })

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-sm text-destructive">
        {(error as Error).message}
      </div>
    )
  }

  if (!data?.pinEnabled || data.authenticated) return <>{children}</>

  return (
    <AuthShell
      pin={pin}
      setPin={setPin}
      onSubmit={(event) => {
        event.preventDefault()
        login.mutate()
      }}
      isPending={login.isPending}
      error={login.isError ? (login.error as Error).message : null}
    />
  )
}
