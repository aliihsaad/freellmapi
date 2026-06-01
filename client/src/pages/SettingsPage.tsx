import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, LogOut, ShieldCheck, ShieldOff } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/page-header'

interface DashboardAuthStatus {
  pinEnabled: boolean
  authenticated: boolean
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')

  const { data } = useQuery<DashboardAuthStatus>({
    queryKey: ['auth', 'status'],
    queryFn: () => apiFetch('/api/auth/status'),
  })

  const refreshAuth = () => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'status'] })
  }

  const enablePin = useMutation({
    mutationFn: () =>
      apiFetch<DashboardAuthStatus>('/api/auth/config', {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, pin }),
      }),
    onSuccess: () => {
      setPin('')
      refreshAuth()
    },
  })

  const changePin = useMutation({
    mutationFn: () =>
      apiFetch<DashboardAuthStatus>('/api/auth/config', {
        method: 'PUT',
        body: JSON.stringify({ enabled: true, pin: newPin }),
      }),
    onSuccess: () => {
      setNewPin('')
      refreshAuth()
    },
  })

  const disablePin = useMutation({
    mutationFn: () =>
      apiFetch<DashboardAuthStatus>('/api/auth/config', {
        method: 'PUT',
        body: JSON.stringify({ enabled: false }),
      }),
    onSuccess: refreshAuth,
  })

  const logout = useMutation({
    mutationFn: () => apiFetch<DashboardAuthStatus>('/api/auth/logout', { method: 'POST' }),
    onSuccess: refreshAuth,
  })

  const pinEnabled = data?.pinEnabled ?? false
  const error = enablePin.error ?? changePin.error ?? disablePin.error ?? logout.error

  return (
    <div>
      <PageHeader title="Settings" description="Dashboard access controls." />

      <Card className="max-w-2xl rounded-lg">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Dashboard PIN</CardTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={pinEnabled ? 'default' : 'secondary'}>
                  {pinEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
            <div className="flex size-9 items-center justify-center rounded-lg border bg-muted/40">
              {pinEnabled ? (
                <ShieldCheck className="size-4" aria-hidden="true" />
              ) : (
                <ShieldOff className="size-4" aria-hidden="true" />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!pinEnabled ? (
            <form
              className="flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                enablePin.mutate()
              }}
            >
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <Label className="text-xs" htmlFor="enable-dashboard-pin">New PIN</Label>
                <Input
                  id="enable-dashboard-pin"
                  type="password"
                  value={pin}
                  onChange={event => setPin(event.target.value)}
                  autoComplete="new-password"
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={pin.trim().length < 4 || enablePin.isPending}>
                <KeyRound className="size-3.5" aria-hidden="true" />
                {enablePin.isPending ? 'Enabling...' : 'Enable PIN'}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  changePin.mutate()
                }}
              >
                <div className="min-w-[220px] flex-1 space-y-1.5">
                  <Label className="text-xs" htmlFor="change-dashboard-pin">New PIN</Label>
                  <Input
                    id="change-dashboard-pin"
                    type="password"
                    value={newPin}
                    onChange={event => setNewPin(event.target.value)}
                    autoComplete="new-password"
                    className="font-mono"
                  />
                </div>
                <Button type="submit" variant="outline" disabled={newPin.trim().length < 4 || changePin.isPending}>
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  {changePin.isPending ? 'Changing...' : 'Change PIN'}
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending}>
                  <LogOut className="size-3.5" aria-hidden="true" />
                  {logout.isPending ? 'Signing out...' : 'Sign out'}
                </Button>
                <Button variant="destructive" onClick={() => disablePin.mutate()} disabled={disablePin.isPending}>
                  <ShieldOff className="size-3.5" aria-hidden="true" />
                  {disablePin.isPending ? 'Disabling...' : 'Disable PIN'}
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{(error as Error).message}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
