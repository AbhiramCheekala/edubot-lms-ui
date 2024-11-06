import { OrganizationDetailPage } from "@/pages/organization/OrganizationDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/organization/$organizationId")({
  component: OrganizationDetailPage,
});
