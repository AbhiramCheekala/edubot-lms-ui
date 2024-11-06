import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { api } from "@/lib/api";
import ContentViewer from "@/components/custom/shared/ContentViewer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import config from "../../lib/config";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface CreateContentVariables {
  type: string;
  url?: string;
  file?: File;
  objectType?: string;
}

interface CreateSubmissionVariables {
  assignmentId: string;
  contents: string[];
}

interface Feedback {
  messages: { content: string }[];
}

interface SubmissionWithGrade {
  submissionId: string;
  grade: number | null;
  feedback: Feedback;
  contents: {
    contentId: string;
    binaryObject: {
      originalFileName: string;
      mimeType: string;
    };
    securedFileUrl: string;
  }[];
}

const CreateSubmission = () => {
  const { assignmentId } = useParams({
    from: "/_authenticated/my/assignments/$assignmentId/submissions",
  });
  const [files, setFiles] = useState([]);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const queryClient = useQueryClient();

  // Permission check
  const { permissionSet } = usePolicies();
  const isStudent = permissionSet && checkActionScopes(permissionSet, 'submission:write', ['self']);

  const { data: assignmentData, isLoading: isAssignmentLoading } = useQuery({
    queryKey: ["assignment", assignmentId],
    queryFn: () =>
      api.get(
        `/assignments?limit=10&page=1&filters[2][field]=assignmentId&filters[2][searchKey]=${assignmentId}&filters[2][searchType]=EXACT_MATCH&includeSubmissionCount=true&includeModule=true&includeCourse=true&includeProgram=true`
      ),
  });

  const { data: moduleData, isLoading: isModuleLoading } = useQuery({
    queryKey: ["module", assignmentData?.data?.results[0]?.moduleId],
    queryFn: () =>
      api.get(
        `/modules/${assignmentData?.data?.results[0]?.moduleId}?includeModuleSections=true&includeSectionContents=true`
      ),
    enabled: !!assignmentData?.data?.results[0]?.moduleId,
  });

  const { data: submissionData, isLoading: isSubmissionLoading } = useQuery({
    queryKey: ["submission", assignmentId],
    queryFn: () =>
      api.get(
        `/submissions?limit=10&page=1&filters[0][field]=assignmentId&filters[0][searchKey]=${assignmentId}&filters[0][searchType]=EXACT_MATCH&includeContentGroup=true`
      ),
    enabled: isStudent,
  });

  const { data: submissionWithGrade } = useQuery<SubmissionWithGrade>({
    queryKey: ["submissionGrade", existingSubmission?.submissionId],
    queryFn: async () => {
      const response = await api.get<SubmissionWithGrade>(
        `/submissions/${existingSubmission.submissionId}?includeContentGroup=true&includeStudent=true&includeAssignment=true&includeGrade=true`
      );
      return response.data;
    },
    enabled: !!existingSubmission?.submissionId,
  });
  
  useEffect(() => {
    if (isStudent && submissionData && submissionData.data.results.length > 0) {
      setExistingSubmission(submissionData.data.results[0]);
    }
  }, [submissionData, isStudent]);

  const createContentMutation = useMutation<any, Error, CreateContentVariables>(
    {
      mutationFn: async ({ type, url, file, objectType }) => {
        let endpoint = `/contents/?type=${type}`;
        if (type === "link" && url) {
          endpoint += `&url=${encodeURIComponent(url)}`;
        } else if (type === "file" && objectType) {
          endpoint += `&objectType=${objectType}`;
        }

        const formData = new FormData();
        if (file) {
          formData.append("file", file);
        }

        const response = await api.post(endpoint, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      },
    }
  );

  const createSubmissionMutation = useMutation<
    any,
    Error,
    CreateSubmissionVariables
  >({
    mutationFn: (submissionData) => api.post("/submissions", submissionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["submission", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["assignment", assignmentId] });
    },
  });

  const handleFileChange = (event) => {
    setFiles([...files, ...event.target.files]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const contentIds = [];
      for (const file of files) {
        const content = await createContentMutation.mutateAsync({
          type: "file",
          file,
          objectType: "assignmentContent",
        });
        contentIds.push(content.contentId);
      }

      await createSubmissionMutation.mutateAsync({
        assignmentId,
        contents: contentIds,
      });

      setFiles([]);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAssignmentLoading || isModuleLoading || (isStudent && isSubmissionLoading))
    return <div>Loading...</div>;

  const assignment = assignmentData?.data?.results[0];
  const module = moduleData?.data;

  const relevantSection = module?.moduleSections.find(
    (section) => section.assignmentInfo?.assignmentId === assignmentId
  );

  return (
    <div className="tw-max-w-7xl tw-mx-auto md:tw-p-4">
      <div className="tw-bg-white tw-shadow-lg tw-rounded-lg tw-overflow-hidden">
        <div className="tw-px-6 tw-py-4 tw-bg-gray-50 tw-border-b tw-border-gray-200">
          <div className="tw-flex tw-flex-col md:tw-flex-row tw-justify-between tw-items-start md:tw-items-center">
            <div className="tw-flex tw-flex-col">
              <h1 className="tw-text-lg tw-font-semibold tw-text-gray-800">
                Course: {assignment?.courseName}
              </h1>
              <h2 className="tw-text-sm tw-text-gray-600">
                Module: {module?.title}
              </h2>
              <h2 className="tw-text-sm tw-text-gray-600">
                Assignment: {relevantSection?.title}
              </h2>
            </div>
            <Button 
              className="tw-bg-green-500 hover:tw-bg-green-600 tw-text-white tw-px-4 tw-py-2 tw-rounded-full tw-flex tw-items-center tw-mt-4 md:tw-mt-0"
              onClick={() => window.open(`${config.CHAT_PLATFORM_BASE_URL}/dashboard?assignmentId=${assignmentId}`, '_blank')}
            >
              <span className="tw-mr-2">Launch platform</span>
              <ArrowRight className="tw-h-4 tw-w-4" />
            </Button>
          </div>
        </div>

        <div className="tw-p-6">
          <div className="tw-mb-8">
            <h2 className="tw-text-lg tw-font-bold tw-mb-4">
              Assignment Files
            </h2>
            <Accordion type="multiple" className="tw-w-full">
              {relevantSection?.contents.map((content) => (
                <AccordionItem
                  key={content.contentId}
                  value={content.contentId}
                >
                  <AccordionTrigger className="tw-w-full tw-flex tw-justify-between tw-items-center tw-px-2 tw-text-sm tw-py-2">
                    <div className="tw-w-full tw-flex tw-justify-between tw-items-center">
                      <span className="tw-font-bold tw-text-start">
                        {content.binaryObject?.originalFileName || "Untitled"}
                      </span>
                      <div className="tw-flex tw-items-center">
                        <Download
                          size={34}
                          className="tw-cursor-pointer tw-px-2 tw-mr-5"
                          onClick={(event) => {
                            event.stopPropagation();
                            window.open(content.securedFileUrl, "_blank");
                          }}
                        />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="tw-w-full tw-px-4 tw-py-2">
                    <React.Suspense fallback={<div>Loading content...</div>}>
                      <ContentViewer
                        binaryObjectMimeType={content.binaryObject.mimeType}
                        securedFileUrl={content.securedFileUrl}
                      />
                    </React.Suspense>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {isStudent && (
            <>
              {existingSubmission ? (
                <div>
                  <div className="tw-flex tw-flex-col md:tw-flex-row tw-justify-between tw-items-start md:tw-items-center tw-mb-4">
                    <h2 className="tw-text-lg tw-font-bold tw-mb-2 md:tw-mb-0 tw-flex tw-items-center">
                      Your Submission
                      <span className={`tw-ml-2 tw-px-2 tw-py-1 tw-rounded-full tw-text-white ${
                        submissionWithGrade?.grade == null ? 'tw-bg-gray-300' :
                        submissionWithGrade.grade >= 80 ? 'tw-bg-green-500' :
                        submissionWithGrade.grade >= 60 ? 'tw-bg-yellow-500' : 'tw-bg-red-500'
                      }`}>
                        {submissionWithGrade?.grade == null ? '0 / 100' : `${Math.min(Math.max(submissionWithGrade.grade, 0), 100)}/100`}
                      </span>
                    </h2>
                    {submissionWithGrade?.feedback && (
                      <div className="tw-relative tw-w-full md:tw-w-auto">
                      <Button
                        onClick={() => setIsFeedbackOpen(!isFeedbackOpen)}
                        className="tw-bg-blue-600 tw-text-white tw-flex tw-items-center tw-justify-between tw-w-full"
                      >
                        <span>Feedback</span>
                        <ChevronDown className={`tw-h-4 tw-w-4 tw-ml-2 tw-transition-transform ${isFeedbackOpen ? 'tw-rotate-180' : ''}`} />
                      </Button>
                      {isFeedbackOpen && (
                        <div className="tw-absolute tw-left-0 tw-right-0 tw-mt-1 tw-bg-white tw-rounded-md tw-shadow-lg tw-z-10 tw-p-4 tw-border tw-border-gray-200">
                          {submissionWithGrade.feedback.messages.map((message, index) => (
                            <p key={index} className="tw-mb-2 tw-text-sm tw-break-words">
                              <span className="tw-font-bold">Feedback {index + 1}:</span> {message.content}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  <Accordion type="multiple" className="tw-w-full">
                    {existingSubmission.contents.map((content) => (
                      <AccordionItem
                        key={content.contentId}
                        value={content.contentId}
                      >
                        <AccordionTrigger className="tw-w-full tw-flex tw-justify-between tw-items-center tw-px-2 tw-text-sm tw-py-2">
                          <div className="tw-w-full tw-flex tw-justify-between tw-items-center">
                            <span className="tw-font-bold md:tw-text-sm">
                              {content.binaryObject?.originalFileName || "Untitled"}
                            </span>
                            <div className="tw-flex tw-items-center">
                              <Download
                                size={34}
                                className="tw-cursor-pointer tw-px-2 tw-mr-5"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  window.open(content.securedFileUrl, "_blank");
                                }}
                              />
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="tw-w-full tw-px-4 tw-py-2">
                          <React.Suspense fallback={<div>Loading content...</div>}>
                            <ContentViewer
                              binaryObjectMimeType={content.binaryObject.mimeType}
                              securedFileUrl={content.securedFileUrl}
                            />
                          </React.Suspense>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <div>
                  <h2 className="tw-text-lg tw-font-bold tw-mb-4">
                    Submit Assignment
                  </h2>
                  <div className="tw-flex tw-justify-between tw-items-center tw-mb-4">
                    <Input
                      type="file"
                      id="fileInput"
                      className="tw-hidden"
                      onChange={handleFileChange}
                      multiple
                    />
                    <Button
                      onClick={() => document.getElementById("fileInput").click()}
                      className="tw-bg-blue-600 tw-text-white"
                    >
                      Upload Files
                    </Button>
                  </div>

                  {files.length > 0 && (
                    <div className="tw-overflow-x-auto tw-mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>File Name</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                          </TableHeader>
                        <TableBody>
                          {files.map((file, index) => (
                            <TableRow key={index}>
                              <TableCell>{file.name}</TableCell>
                              <TableCell>
                                {(file.size / 1024).toFixed(2)} KB
                              </TableCell>
                              <TableCell>{file.type}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="tw-flex tw-justify-end">
                    <Button
                      className="tw-bg-blue-600 tw-text-white"
                      onClick={handleSubmit}
                      disabled={isSubmitting || files.length === 0}
                    >
                      {isSubmitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateSubmission;