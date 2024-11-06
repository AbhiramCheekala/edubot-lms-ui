import { createFileRoute } from '@tanstack/react-router'
import Profile from '@/pages/settings/profile'

export const Route = createFileRoute('/_authenticated/my/profile/')({
  component: Profile
})