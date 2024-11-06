import { createFileRoute } from '@tanstack/react-router'
import ManageProgramListPage from '@/pages/programs/ManageProgramListPage'

export const Route = createFileRoute('/_authenticated/programs/')({
  component: ManageProgramListPage,
})