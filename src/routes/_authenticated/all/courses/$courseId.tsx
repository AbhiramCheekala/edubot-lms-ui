import CourseDetailsPage from '@/pages/all-programs-courses/courseDetailsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/all/courses/$courseId')({
  component:  CourseDetailsPage,
  beforeLoad: () => {
    return {
      hideRootPaddingOnMobileOnly: true,
    }
  }
})
