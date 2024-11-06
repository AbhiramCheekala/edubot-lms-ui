import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'

const LogoutPage = () => {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return <div>Logging out...</div>
}

export const Route = createFileRoute('/_authenticated/logout')({
  component: LogoutPage,
})