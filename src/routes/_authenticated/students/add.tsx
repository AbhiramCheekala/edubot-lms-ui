import StudentAddPage from "@/pages/students/StudentAddPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/students/add")({
  component: StudentAddPage,
});
