import UserAddPage from '@/pages/users/UserAddPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/users/add')({
  component: UserAddPage
})