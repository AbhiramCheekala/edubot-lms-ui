import { createFileRoute } from '@tanstack/react-router'
import ReadingMaterials from '@/pages/all-programs-courses/ReadingMaterials'

export const Route = createFileRoute('/_authenticated/my/courses/$courseId/modules/$moduleId/sections/$sectionId/reading-materials/$contentId')({
  component: ReadingMaterials,
  beforeLoad: () => {
    return {
      hideRootPaddingOnMobileOnly: true,
    }
  }
})