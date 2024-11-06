import { createFileRoute, ErrorComponent } from '@tanstack/react-router'
import { z } from 'zod'
import { decodeJWT } from '../../lib/utils'
import { ResetPassword } from '../../pages/login/ResetPasswordPage'

const searchSchema = z.object({
  token: z.string().refine((token) => {
    try {
      const decodedToken = decodeJWT(token);
      if (!decodedToken?.payload?.exp || decodedToken.payload.exp < Date.now() / 1000) {
        throw new Error('Token expired')
      }      
      return true
    } catch (error) {
      return false
    }
  }, { message: "Invalid or expired token" })
})

export const Route = createFileRoute('/_login/reset-password')({
  validateSearch: searchSchema,
  beforeLoad: () => {
    return {
      showSidebar: false,
      showHeader: false,
      hideRootPadding: true,
    }
  },
  component: ResetPassword,
  errorComponent: () => <ErrorComponent error="Invalid or expired token" />
})