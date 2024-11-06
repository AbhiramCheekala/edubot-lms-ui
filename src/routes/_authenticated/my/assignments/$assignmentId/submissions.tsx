import { createFileRoute } from '@tanstack/react-router'
import CreateSubmission from '@/pages/all-programs-courses/CreateSubmission'

export const Route = createFileRoute('/_authenticated/my/assignments/$assignmentId/submissions')({
  component: CreateSubmission,
  beforeLoad: () => {
    return {
      hideRootPaddingOnMobileOnly: true,
    }
  }
})