import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
  beforeLoad: () => {
    throw redirect({
      to: '/login'
    })
  },
})

function Index() {
  return null
}