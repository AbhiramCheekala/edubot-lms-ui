import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Link as LinkIcon, FileCheck, Edit } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface CourseResponse {
  courseId: string;
  givenCourseId: string;
  name: string;
  description: string;
  skills: string;
  modules: Module[];
}

// Define the expected search params type
interface CourseSearchParams {
  moduleId?: string;
}

interface Module {
  title: string;
  moduleId: string;
  name: string;
  summary: string;
  position: number;
  moduleSections: ModuleSection[];
}

interface ModuleSection {
  moduleSectionId: string;
  title: string;
  sectionType: string;
  contents: Content[];
  assignmentInfo?: AssignmentInfo;
}

interface Content {
  contentId: string;
  type: string;
  url?: string;
  binaryObject?: {
    originalFileName: string;
    fileSize: string;
    metadata: {
      uploadedAt: string;
    };
  };
}

interface AssignmentInfo {
  assignmentId: string;
  platformType: string;
  templateRepository: string;
  autoGrading: boolean;
  testCaseGrading: boolean;
}

const CourseDetailsPage = () => {
  const { courseId } = useParams({
    from: "/_authenticated/all/courses/$courseId",
  });

  const search = useSearch({
    from: "/_authenticated/all/courses/$courseId",
  }) as CourseSearchParams;

  const moduleId = search.moduleId;
  const [openModule, setOpenModule] = useState(moduleId || "");
  const screenSize = useScreenSize();

  const navigate = useNavigate();
  const { permissionSet } = usePolicies();
  const canEditCourse = checkActionScopes(permissionSet, "course:write", [
    "admin",
    "supervisor",
    "organization",
  ]);

  const handleEditCourse = () => {
    navigate({
      to: "/manage-courses/$courseId",
      params: { courseId } as any,
    });
  };

  const handleAssignmentClick = (assignmentId) => {
    navigate({ to: `/my/assignments/${assignmentId}/submissions` });
  };

  const handleContentClick = (moduleId, sectionId, content) => {
    if (content.type === "file") {
      navigate({
        to: "/my/courses/$courseId/modules/$moduleId/sections/$sectionId/reading-materials/$contentId",
        params: {
          courseId,
          moduleId,
          sectionId,
          contentId: content.contentId,
        } as any,
      });
    } else if (content.type === "link") {
      window.open(content.url, "_blank");
    }
  };

  const { data: courseDetails, isLoading: isCourseLoading } = useQuery({
    queryKey: ["coursedetails", courseId],
    queryFn: () =>
      api
        .get<CourseResponse>(`/courses/${courseId}?includeModules=true`)
        .then((res) => res.data),
  });

  const { data: moduleDetails, isLoading: isModuleLoading } = useQuery({
    queryKey: ["moduledetails", courseId],
    queryFn: () =>
      api
        .get<
          Module[]
        >(`/courses/${courseId}/modules?includeSectionContents=true&includeModuleSections=true`)
        .then((res) => res.data),
  });

  function useScreenSize() {
    const [screenSize, setScreenSize] = useState("");

    useEffect(() => {
      function handleResize() {
        if (window.innerWidth < 640) {
          setScreenSize("mobile");
        } else if (window.innerWidth < 1026) {
          setScreenSize("tablet");
        } else {
          setScreenSize("desktop");
        }
      }

      window.addEventListener("resize", handleResize);
      handleResize(); // Call once to set initial size

      return () => window.removeEventListener("resize", handleResize);
    }, []);

    return screenSize;
  }

  const truncateText = (text: string, screenSize: string) => {
    if (!text) return "";

    let maxLength;
    switch (screenSize) {
      case "mobile":
        maxLength = 23;
        break;
      case "tablet":
        maxLength = 18;
        break;
      case "desktop":
        maxLength = 40;
        break;
      default:
        maxLength = 30;
    }

    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength - 8) + "...";
  };

  if (isCourseLoading) return <div>Loading course details...</div>;
  if (!courseDetails) return <div>No course details available</div>;

  return (
    <TooltipProvider>
      <div className="tw-flex tw-flex-col md:tw-flex-row tw-bg-gray-100">
        <div className="tw-w-full lg:tw-w-full">
          <div className="tw-bg-white tw-rounded-lg tw-shadow-md tw-p-8">
            <div className="tw-flex tw-flex-col sm:tw-flex-row tw-items-start sm:tw-items-center tw-justify-between tw-mb-4">
              <div className="tw-flex tw-items-center tw-mb-4 sm:tw-mb-0">
                <div className="tw-bg-green-500 tw-rounded-full tw-p-2 tw-mr-3">
                  <FileText className="tw-text-white" size={24} />
                </div>
                <h1 className="lg:tw-text-xl md:tw-text-md tw-font-bold">
                  {`Course: ${courseDetails.name}`}
                </h1>
              </div>
              {canEditCourse && (
                <Button
                  onClick={handleEditCourse}
                  className="tw-flex tw-items-center tw-ml-2 tw-text-sm sm:tw-text-base"
                >
                  <Edit className="tw-mr-2 tw-text-sm" size={14} />
                  Edit Course
                </Button>
              )}
            </div>
            <Separator className="tw-my-4" />
            <h2 className="tw-text-sm tw-mb-2">
              CourseID: {courseDetails.givenCourseId}
            </h2>
            <p className="tw-text-gray-700 tw-mb-2">
              <span className="tw-font-semibold">Course Overview:</span>{" "}
              {courseDetails.description}
            </p>
            <p className="tw-text-gray-700 tw-mb-2">
              <span className="tw-font-semibold">Skills Gained:</span>{" "}
              {courseDetails.skills}
            </p>

            <Accordion
              type="single"
              collapsible
              value={openModule}
              onValueChange={setOpenModule}
            >
              {moduleDetails
                ?.sort((a, b) => a.position - b.position)
                ?.map((module, position) => (
                  <React.Fragment key={module.moduleId}>
                    <AccordionItem value={module.moduleId}>
                      <div>
                        <AccordionTrigger>
                          <h2 className="tw-text-lg tw-font-bold tw-text-start">{`Module ${position + 1}: ${module.title}`}</h2>
                        </AccordionTrigger>
                        <AccordionContent className="tw-p-2">
                          <h4 className="tw-text-gray-700 tw-mb-6">
                            <span className="tw-font-bold">
                              Module Summary :{" "}
                            </span>
                            {module.summary}
                          </h4>
                          <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-2 xl:tw-grid-cols-3 tw-gap-6">
                            {module.moduleSections.map((section) => (
                              <div
                                key={section.moduleSectionId}
                                className={`tw-rounded-lg tw-p-4 tw-shadow-[0_0_8px_0_rgba(0,0,0,0.15)] ${
                                  section.sectionType === "assignment"
                                    ? "tw-cursor-pointer"
                                    : ""
                                }`}
                                onClick={() =>
                                  section.sectionType === "assignment" &&
                                  section.assignmentInfo &&
                                  handleAssignmentClick(
                                    section.assignmentInfo.assignmentId
                                  )
                                }
                              >
                                <h3 className="tw-text-md tw-font-semibold tw-mb-3 tw-flex tw-items-center">
                                  {section.sectionType ===
                                    "readingMaterial" && (
                                    <FileText
                                      className="tw-mr-2 tw-text-blue-500"
                                      size={14}
                                    />
                                  )}
                                  {section.sectionType === "links" && (
                                    <LinkIcon
                                      className="tw-mr-2 tw-text-green-500"
                                      size={14}
                                    />
                                  )}
                                  {section.sectionType === "assignment" && (
                                    <FileCheck
                                      className="tw-mr-2 tw-text-orange-500"
                                      size={14}
                                    />
                                  )}
                                  {section.title}
                                </h3>
                                <ScrollArea className="md:tw-h-36">
                                  {section.contents.map(
                                    (content, contentIndex) => {
                                      const displayText =
                                        content.type === "file"
                                          ? content.binaryObject
                                              ?.originalFileName
                                          : content.url;
                                      const truncatedText = truncateText(
                                        displayText || "",
                                        screenSize
                                      );

                                      return (
                                        <Tooltip key={content.contentId}>
                                          <TooltipTrigger asChild>
                                            <div
                                              className="tw-flex tw-items-center tw-mb-2 tw-bg-[#D3ECFD] tw-p-2 tw-rounded tw-cursor-pointer tw-overflow-hidden"
                                              onClick={() =>
                                                handleContentClick(
                                                  module.moduleId,
                                                  section.moduleSectionId,
                                                  content
                                                )
                                              }
                                            >
                                              <span className="tw-flex tw-items-center tw-justify-center tw-text-gray-500 tw-text-xs tw-bg-white tw-rounded-full tw-w-6 tw-h-6 tw-mr-2 tw-flex-shrink-0">
                                                {contentIndex + 1}
                                              </span>
                                              <div className="tw-flex-grow tw-min-w-0">
                                                <span className="tw-truncate tw-text-xs tw-block">
                                                  {truncatedText}
                                                </span>
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>{displayText}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      );
                                    }
                                  )}
                                </ScrollArea>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </div>
                    </AccordionItem>
                  </React.Fragment>
                ))}
            </Accordion>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default CourseDetailsPage;
