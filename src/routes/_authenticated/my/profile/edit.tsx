import { createFileRoute } from '@tanstack/react-router'
import EditProfile from '@/pages/profile/EditProfile'

export const Route = createFileRoute('/_authenticated/my/profile/edit')({
  component: EditProfile,
})