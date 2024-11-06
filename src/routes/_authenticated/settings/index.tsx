import { createFileRoute } from "@tanstack/react-router";
import SettingsList from "@/pages/settings/SettingsList";

export const Route = createFileRoute("/_authenticated/settings/")({
  component: SettingsList,
});
