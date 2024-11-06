import StudentDetailPage from "@/pages/students/StudentDetailPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/students/$studentId")({
  component: StudentDetailPage,
});
