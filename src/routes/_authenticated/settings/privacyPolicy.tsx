import { createFileRoute } from "@tanstack/react-router";
import privacyPolicy from "@/pages/settings/PrivacyPolicy";

export const Route = createFileRoute("/_authenticated/settings/privacyPolicy")({
  component: privacyPolicy,
});
