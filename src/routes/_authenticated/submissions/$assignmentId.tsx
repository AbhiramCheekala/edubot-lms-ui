import { createFileRoute } from '@tanstack/react-router'
import SubmissionAssignment from '@/pages/submissions/SubmissionAssignment'

export const Route = createFileRoute('/_authenticated/submissions/$assignmentId')({
  component: () => SubmissionAssignment()
})
