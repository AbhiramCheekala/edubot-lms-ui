import { createFileRoute } from "@tanstack/react-router";
import AdminPage from "@/pages/settings/AdminProfile";
export const Route = createFileRoute("/_authenticated/settings/adminProfile")({
  component: AdminPage,
});
