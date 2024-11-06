import { UserDetail } from '@/pages/users/UserDetalisPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/$userId')({
  component: UserDetail
})