import { createFileRoute } from '@tanstack/react-router'
import ManageProgramAddPage from '@/pages/programs/ManageProgramAddPage'

export const Route = createFileRoute('/_authenticated/programs/add')({
  component: ManageProgramAddPage,
})