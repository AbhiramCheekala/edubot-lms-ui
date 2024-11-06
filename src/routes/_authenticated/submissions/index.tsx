import { createFileRoute } from '@tanstack/react-router'
import Submissions from '@/pages/submissions/Submissions'

export const Route = createFileRoute('/_authenticated/submissions/')({
  component:Submissions
})