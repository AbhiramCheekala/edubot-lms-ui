import { createFileRoute } from '@tanstack/react-router'
import { LoginPage } from '../../pages/login/LoginPage'

export const Route = createFileRoute('/_login/login')({
  component:  LoginPage,
  beforeLoad: () => {
    return {
      showSidebar: false,
      showHeader: false,
      hideRootPadding: true,
    }
  }
})