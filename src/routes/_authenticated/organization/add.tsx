import OrganizationAddPage from "@/pages/organization/OrganizationAddPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/organization/add")({
  component: OrganizationAddPage,
});
