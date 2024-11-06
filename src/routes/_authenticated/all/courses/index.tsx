import coursesListPage from '@/pages/all-programs-courses/coursesListPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/all/courses/')({
  component:  coursesListPage
})
