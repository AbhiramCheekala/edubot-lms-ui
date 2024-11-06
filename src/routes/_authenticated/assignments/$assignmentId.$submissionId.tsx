import { createFileRoute } from '@tanstack/react-router'
import SubmissionView from '@/pages/submissions/SubmissionView'

export const Route = createFileRoute(
  '/_authenticated/assignments/$assignmentId/$submissionId',
)({
  component: SubmissionView,
   
})
