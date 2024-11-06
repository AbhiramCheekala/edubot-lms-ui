import { createFileRoute } from '@tanstack/react-router'
import MySubmissions from '@/pages/my/MySubmissions'

export const Route = createFileRoute('/_authenticated/my/submissions')({
  component: MySubmissions,
})