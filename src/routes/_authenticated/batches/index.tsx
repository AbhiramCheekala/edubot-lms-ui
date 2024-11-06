import ManageBatchesListPage from "@/pages/batches/manageBatchesListPage";
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/batches/')({
  component:  ManageBatchesListPage,
})