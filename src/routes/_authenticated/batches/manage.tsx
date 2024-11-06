import { createFileRoute } from '@tanstack/react-router'
import ManageBatchesManagePage from "@/pages/batches/manageBatchesManagePage";

export const Route = createFileRoute('/_authenticated/batches/manage')({
  component: ManageBatchesManagePage,
})