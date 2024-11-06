import UserListPage from '@/pages/users/UserListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/')({
  component: UserListPage
})
