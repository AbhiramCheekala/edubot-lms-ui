import { createFileRoute } from "@tanstack/react-router";
import ChangePassword from "@/pages/settings/ChangePassword";

export const Route = createFileRoute("/_authenticated/settings/changePassword")(
  {
    component: ChangePassword,
  }
);
