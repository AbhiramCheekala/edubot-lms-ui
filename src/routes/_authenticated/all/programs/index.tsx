import ProgramsListPage from '@/pages/all-programs-courses/programsListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/all/programs/')({
  component:  ProgramsListPage
})
