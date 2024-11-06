import { createFileRoute } from '@tanstack/react-router'
import AllProgramsAndCoursesListPage from '@/pages/all-programs-courses/AllProgramsAndCoursesListPage'

export const Route = createFileRoute('/_authenticated/all/')({
  component:  AllProgramsAndCoursesListPage
})
