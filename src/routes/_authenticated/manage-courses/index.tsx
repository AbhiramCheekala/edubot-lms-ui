import CoursesListPage from '@/pages/manage-courses/ManageCoursesListPage'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_authenticated/manage-courses/')({
  component: CoursesListPage
})

