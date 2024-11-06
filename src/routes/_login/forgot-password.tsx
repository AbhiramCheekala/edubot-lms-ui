import { createFileRoute } from '@tanstack/react-router'
import { ForgotPasswordPage } from '../../pages/login/ForgotPasswordPage'

export const Route = createFileRoute('/_login/forgot-password')({
  beforeLoad: () => {
    return {
      showSidebar: false,
      showHeader: false,
      hideRootPadding: true,
    }
  },
  component: () => ForgotPasswordPage()
})