import ProgramDetailsPage from '@/pages/all-programs-courses/programDetailsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/all/programs/$programId')({
  component:  ProgramDetailsPage,
  beforeLoad: () => {
    return {
      hideRootPaddingOnMobileOnly: true,
    }
  }
})
