import OrganizationListPage from "@/pages/organization/OrganizationListPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/organization/")({
  component: OrganizationListPage,
});
