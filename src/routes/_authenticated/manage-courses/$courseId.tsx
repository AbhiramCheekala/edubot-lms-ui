import ManageCoursesDetailPage from '@/pages/manage-courses/ManageCoursesDetailPage'
import { createFileRoute } from '@tanstack/react-router'


export const Route = createFileRoute('/_authenticated/manage-courses/$courseId')({
  component: ManageCoursesDetailPage
})
