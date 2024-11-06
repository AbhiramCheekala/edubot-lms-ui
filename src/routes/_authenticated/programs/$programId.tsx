import { createFileRoute } from '@tanstack/react-router'
import ManageProgramDetailsPage from '@/pages/programs/ManageProgramDetailsPage'

export const Route = createFileRoute('/_authenticated/programs/$programId')({
  component: ManageProgramDetailsPage,
})