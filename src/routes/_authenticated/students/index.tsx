import { createFileRoute } from "@tanstack/react-router";
import StudentListPage from "@/pages/students/StudentListPage";

export const Route = createFileRoute("/_authenticated/students/")({
  component: StudentListPage,
});
