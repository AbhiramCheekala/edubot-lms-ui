import { createFileRoute } from "@tanstack/react-router";
import FaqPage from "@/pages/settings/Faq";

export const Route = createFileRoute("/_authenticated/settings/faq")({
  component: FaqPage,
});
