import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Plus, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, UseMutationResult, useQueryClient } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { useDebouncedCallback } from "use-debounce";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";
import { Badge } from "@/components/ui/badge"; // Add this import
import { format } from "date-fns";

const fetchStudents = async ({
  page,
  limit,
  assignmentId,
  searchQuery,
  status,
}) => {
  try {
    const url = `/submissions?includeStudent=true&includeGrade=true`;
    const params = { page, limit };

    const filters = [];

    if (assignmentId) {
      filters.push({
        field: "assignmentId",
        searchType: "EXACT_MATCH",
        searchKey: assignmentId,
      });
    }

    if (searchQuery) {
      filters.push({
        field: "studentName",
        searchType: "CONTAINS",
        searchKey: searchQuery,
      });
    }

    if (status) {
      filters.push({
        field: "status",
        searchType: "EXACT_MATCH",
        searchKey: status,
      });
    }

    if (filters.length > 0) {
      filters.forEach((filter, index) => {
        params[`filters[${index}][field]`] = filter.field;
        params[`filters[${index}][searchType]`] = filter.searchType;
        params[`filters[${index}][searchKey]`] = filter.searchKey;
      });
    }

    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
};

// Define the feedback type
interface Feedback {
  content: string;
}

const getGradeClass = (grade) => {
  if (grade > 70) return "tw-bg-[#52C464] tw-text-black";
  if (grade >= 40 && grade <= 70) return "tw-bg-[#FFDF9B] tw-text-black";
  if (grade < 40 && grade >= 10) return "tw-bg-[#FF7A6B] tw-text-white";
  return "tw-bg-gray-400 tw-text-white";
};

const FeedbackDialog = ({ isOpen, onClose, initialFeedbacks, submissionId }) => {
  const [newFeedbacks, setNewFeedbacks] = useState<Feedback[]>([]);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const queryClient = useQueryClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedbackMutation: UseMutationResult<any, Error, Feedback[], unknown> = useMutation({
    mutationFn: (newFeedbacks: Feedback[]) => {
      const payload = {
        feedback: {
          messages: newFeedbacks.map(feedback => ({ content: feedback.content }))
        },
      };
      return api.put(`/submissions/${submissionId}/grade`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentsAssignments'] });
      setNewFeedbacks([]);
      onClose();
    },
    onError: (error) => {
      console.error('Error updating feedback:', error);
      setErrorMessage("An error occurred while saving feedback. Please try again.");
      setIsErrorDialogOpen(true);
    }
  });
  const { permissionSet } = usePolicies();
  const canEditGrade = checkActionScopes(permissionSet, "grade:write", ["admin","organization","supervisor"]);

  useEffect(() => {
    if (isOpen) {
      setNewFeedbacks([]);
    }
  }, [isOpen]);

  const handleFeedbackChange = (index, value) => {
    const updatedFeedbacks = [...newFeedbacks];
    updatedFeedbacks[index] = { content: value };
    setNewFeedbacks(updatedFeedbacks);
  };

  const handleAddFeedback = () => {
    setNewFeedbacks([...newFeedbacks, { content: "" }]);
  };

  const validateFeedbacks = () => newFeedbacks.every(feedback => feedback.content && feedback.content.trim() !== "");

  const handleSave = (e) => {
    e.preventDefault();
    if (validateFeedbacks()) {
      feedbackMutation.mutate(newFeedbacks);
    } else {
      setErrorMessage("Please fill out all feedback fields before saving.");
      setIsErrorDialogOpen(true);
    }
  };

  return (
    <>
      <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent className="!tw-w-[390px] tw-h-auto tw-text-primary tw-font-montserrat tw-font-semibold tw-text-[12px] tw-absolute tw-rounded-[4px] tw-bg-white tw-p-4">
          <AlertDialogHeader>
            <div className="tw-flex tw-flex-row tw-justify-between tw-items-center">
              <AlertDialogTitle>
                <span className="tw-font-montserrat tw-text-lg tw-font-semibold tw-text-black">
                  Add Feedback
                </span>
              </AlertDialogTitle>
              <AlertDialogCancel className="!tw-ring-[-2] tw-w-6 tw-h-4 !tw-border-white">
                <X className="tw-absolute tw-w-[15px] tw-text-[#999999] tw-h-[15px]" />
              </AlertDialogCancel>
            </div>

            <div className="tw-mt-4 tw-space-y-4 tw-overflow-y-auto tw-max-h-75 tw-max-h-[400px] tw-scrollbar-hide ">
              {initialFeedbacks.map((feedback, index) => (
                <div key={index} className="tw-mb-2">
                  <p className="tw-text-xs tw-text-gray-500">{format(new Date(feedback.createdAt), "do MMM yyyy")}</p>
                  <p className="tw-text-sm">{feedback.content}</p>
                </div>
              ))}
              {newFeedbacks.map((feedback, index) => (
                <Textarea
                  key={index}
                  className={`!tw-bg-white tw-w-full tw-h-24 tw-p-2 tw-border !tw-ring-[-2] tw-rounded placeholder:!tw-text-primary placeholder:text-sm placeholder:font-medium ${
                    feedback.content.trim() === ""
                      ? "tw-border-red-500"
                      : "tw-border-gray-300"
                  } `}
                  placeholder={`Add Feedback`}
                  value={feedback.content}
                  onChange={(e) => handleFeedbackChange(index, e.target.value)}
                  disabled={!canEditGrade}
              />
              ))}

              <div className="!tw-w-[8px] tw-h-[8px] tw-mt-10 tw-border tw-border-0 tw-relative">
                <Separator className="!tw-w-[315px] tw-h-0 tw-mt-6 tw-ml-5 tw-border tw-border-[0.2px] tw-border-[#BDBDBD]" />
                <span className="tw-absolute tw-w-[31px] tw-h-[31px] tw-bg-[#D9D9D9] tw-mt-[-17px] tw-ml-[159px] tw-rounded-full tw-flex tw-items-center tw-justify-center">
                  {canEditGrade && (
                  <Plus
                    onClick={handleAddFeedback}
                    className={`tw-w-[18.33px] tw-h-[18.33px] tw-text-[#8E8E8E] ${!canEditGrade ? "tw-cursor-not-allowed tw-opacity-50" : "tw-cursor-pointer"}`}
                    />
                  )}
              </span>
              </div>

              {canEditGrade && 
              <div className="tw-flex tw-flex-row tw-justify-center tw-gap-4">
                  <AlertDialogCancel className={`tw-px-4 tw-py-2 tw-bg-white tw-ml-[-20px] tw-w-[89px] !tw-ring-[-2] tw-h-[38px] tw-text-[#272864] tw-font-semibold tw-text-[16px] tw-rounded !tw-mt-2 ${!canEditGrade ? "tw-cursor-not-allowed tw-opacity-50" : "tw-cursor-pointer"}`}>
                    Cancel
                  </AlertDialogCancel>
                {newFeedbacks.length > 0 && (
                    <AlertDialogAction
                      onClick={handleSave}
                    className={`tw-px-4 tw-py-2 tw-w-[79px] tw-h-[38px] tw-rounded-4 tw-bg-primary tw-text-white tw-font-semibold tw-mt-2 ${!canEditGrade ? "tw-cursor-not-allowed tw-opacity-50" : "tw-cursor-pointer"}`}
                  >
                      Done
                    </AlertDialogAction>
                )}
                </div>
              }
          </div>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setIsErrorDialogOpen(false)}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const CourseTable = () => {
  const { assignmentId } = useParams({
    from: "/_authenticated/submissions/$assignmentId",
  });
  const [currentStudent, setCurrentStudent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedFeedbacks, setExpandedFeedbacks] = useState(new Set());
  const [filterType, setFilterType] = useState(""); // <-- New State for filter type
  const PAGE_SIZE = 10;
  const [isGradeAlertOpen, setIsGradeAlertOpen] = useState(false);
  // const [gradeAlertMessage, setGradeAlertMessage] = useState("");
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState(false);
  // const [errorMessage, setErrorMessage] = useState('');
  const { permissionSet } = usePolicies();
  const canEditGrade = checkActionScopes(permissionSet, "grade:write", ["admin","organization","supervisor"]);
  const canViewSubmission = checkActionScopes(permissionSet, "submission:read", ["admin","organization","supervisor","self"]);

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
  }, 1000);

  const { data } = useQuery({
    queryKey: [
      "studentsAssignments",
      currentPage,
      PAGE_SIZE,
      assignmentId,
      searchQuery,
      filterType,
    ], // <-- Include filterType in queryKey
    queryFn: () =>
      fetchStudents({
        page: currentPage,
        limit: PAGE_SIZE,
        assignmentId,
        searchQuery,
        status: filterType,
      }), // <-- Pass filterType as status
    staleTime: 5000,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const currentStudents = Array.isArray(data?.results) ? data.results : [];
  const hasMore = data?.hasMore || false;

  const handleOpenDialog = (student) => {
    setCurrentStudent(student);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentStudent(null);
  };

  // const queryClient = useQueryClient();

  // const feedbackMutation = useMutation({
  //   mutationFn: (newFeedbacks: Feedback[]) => {
  //     return api.put(`/submissions/${currentStudent?.submissionId || currentStudent?.id}/grade`, {
  //       feedback: { messages: newFeedbacks.map(feedback => ({ content: feedback.content })) }
  //     });
  //   },
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['studentsAssignments'] });
  //     handleCloseDialog();
  //   },
  //   onError: (error) => {
  //     console.error('Error updating feedback:', error);
  //     setErrorMessage("An error occurred while saving feedback. Please try again.");
  //     setIsErrorDialogOpen(true);
  //   }
  // });

  const toggleExpandFeedback = (studentId) => {
    const newExpandedFeedbacks = new Set(expandedFeedbacks);
    if (newExpandedFeedbacks.has(studentId)) {
      newExpandedFeedbacks.delete(studentId);
    } else {
      newExpandedFeedbacks.add(studentId);
    }
    setExpandedFeedbacks(newExpandedFeedbacks);
  };

  const handleFilterChange = (value) => {
    setFilterType(value);
  };

  const filterTypes = {
    submitted: "Submitted",
    graded: "Graded",
  };

  return (
    <>
      {/* Filter and Search UI */}
      <div className="tw-flex tw-flex-row tw-justify-between tw-items-center tw-mb-4">
        {/* Filters */}
        <div className="tw-flex tw-flex-row tw-items-center tw-space-x-2">
          <div className="tw-relative tw-w-36">
            <Select 
            onValueChange={handleFilterChange} 
            //disabled={!canViewSubmission}   //anyone can view data
            >
              {" "}
              {/* <-- Attach handler */}
              <SelectTrigger className="!tw-border-primary !tw-bg-white !tw-w-full tw-h-8 tw-rounded-md !tw-border-0.5 !tw-py-2.5 !tw-text-primary !tw-ring-[-2]">
                <SelectValue
                  placeholder="Gradings"
                  className="placeholder:!tw-text-primary placeholder:tw-text-[12px] placeholder:tw-font-semibold tw-font-montserrat tw-text-primary tw-font-medium tw-text-xs"
                />
              </SelectTrigger>
              <SelectContent className="tw-w-36">
                <SelectGroup className="tw-rounded-md !tw-border-primary !tw-pt-1">
                  {Object.entries(filterTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="tw-relative tw-w-72">
            <Input
              className="tw-w-full tw-h-8 !tw-ring-[-2] placeholder:tw-text-xs placeholder:!tw-text-primary tw-border-primary !tw-bg-[#FFFFFF] !tw-pl-8"
              type="text"
              placeholder="Search Student"
              value={searchQuery}
              onChange={(e) => debouncedSearch(e.target.value)}
              //disabled={!canViewSubmission}
            />
            <Search className="tw-absolute tw-w-4 tw-h-4 tw-left-2.5 tw-top-2" />
          </div>
        </div>
        {/* <div className="tw-w-72 tw-flex tw-justify-end">
          <Button className="tw-h-10 !tw-rounded-full tw-border !tw-bg-[#FFB384] tw-font-semibold" variant="destructive">
            <span className="tw-font-montserrat tw-text-xs tw-text-[#333333] tw-font-bold">28 of 20 Submitted | 25 To Grade</span>
          </Button>
        </div> */}
      </div>
      {/* Table */}
      <div className="tw-relative">
        <div className="tw-overflow-hidden hide-scrollbar" style={{ width: "auto", height: "auto" }}>
          <table className="tw-bg-white tw-shadow-md tw-w-full tw-h-full tw-table-fixed tw-rounded-lg">
            <thead className="tw-bg-[#FFDF9B] tw-sticky tw-top-0 tw-rounded-t-lg tw-rounded-xl">
              <tr>
                <th className="tw-w-24 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Unique Id</th>
                <th className="tw-w-32 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Student Name</th>
                <th className="tw-w-24 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Status</th>
                <th className="tw-w-24 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Check</th>
                <th className="tw-w-24 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Prompt</th>
                <th className="tw-w-32 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Test Cases</th>
                <th className="tw-w-24 tw-px-2 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Grade</th>
                <th className="tw-w-auto tw-px-6 tw-py-4 tw-text-center tw-leading-6 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold tw-border-b tw-border-[#BDBDBD]">Feedback</th>
              </tr>
            </thead>
            <tbody className="tw-rounded-b-lg">
              {currentStudents.map((student) => (
                <tr key={student.submissionId} className="tw-hover:bg-gray-100" >
                  <td className="tw-w-24 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-medium tw-text-center">{student.givenStudentId}</td>
                  <td className="tw-w-32 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-font-montserrat !tw-font-medium tw-text-sm tw-text-gray-700 tw-text-left">
                    <div className="tw-flex tw-items-center">
                      <span>{student.studentName}</span>
                    </div>
                  </td>
                  <td className="tw-w-24 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-medium tw-text-center">{student.status}</td>
                  <td className="tw-w-24 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-semibold tw-text-center tw-text-primary">
                    <Link to={`/assignments/${assignmentId}/${student.submissionId}`} disabled={!canViewSubmission}>
                      View
                    </Link>
                  </td>
                  <td className="tw-w-24 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-semibold tw-text-center">
                    <a href="#" className="tw-text-primary" >
                      <Link disabled={!canViewSubmission}>
                        Link
                      </Link>
                    </a>
                  </td>
                  <td className="tw-w-32 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-semibold tw-text-center">
                    <a href="#" className="tw-text-primary">
                      <Link disabled={!canViewSubmission}>
                        Link
                      </Link>
                    </a>
                  </td>
                  <td className={`tw-w-20 tw-px-2 tw-py-4 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-medium tw-text-center ${!canEditGrade ? "tw-cursor-not-allowed tw-opacity-50" : "tw-cursor-pointer"}`}>
                    <span className={`tw-inline-block tw-px-3 tw-py-2 tw-rounded-full ${getGradeClass(student.grade)} `}>
                      <span className="tw-flex tw-items-center" >
                        <span>{student.grade != null ? student.grade : "--"}</span>
                        <span className="tw-ml-0.5">/100</span>
                      </span>
                    </span>
                  </td>
                  <td className="tw-px-6 tw-py-4 tw-pl-6 tw-border-b tw-border-[#BDBDBD] tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-medium tw-text-left">
                    {student.feedback && student.feedback.messages && student.feedback.messages.length > 0 ? (
                      <>
                        {student.feedback.messages.slice(0, expandedFeedbacks.has(student.id) ? student.feedback.messages.length : 3).map((fb, fbIndex) => (
                          <div key={`feedback-${student.id}-${fbIndex}`} className="tw-flex tw-items-center tw-mb-2 tw-justify-between">
                            <div className="tw-flex-grow tw-mr-2.5 tw-overflow-hidden feedback-text" style={{ maxWidth: "70%" }}>
                              <div className="tw-truncate">{fbIndex + 1}. {fb.content}</div>
                            </div>
                            <Badge variant="secondary" className="tw-text-xs hover:tw-bg-secondary">
                              {format(new Date(fb.updatedAt), "do MMM yyyy")}
                            </Badge>
                          </div>
                        ))}
                      </>
                    ) : null}
                    <div className="tw-flex tw-items-center tw-justify-between tw-mt-2">
                      {canEditGrade &&
                        <div
                          className="tw-text-primary tw-font-center tw-text-xs tw-cursor-pointer tw-flex tw-items-center"
                          onClick={() => handleOpenDialog(student)}
                        >
                          <Plus className="tw-w-4 tw-h-4 tw-mr-1" />
                          Add Feedback
                        </div>
                      }
                      {student.feedback && student.feedback.messages && student.feedback.messages.length > 3 && (
                        <div 
                          className="tw-text-primary tw-cursor-pointer tw-text-[10px]" 
                          onClick={() => toggleExpandFeedback(student.id)}
                        >
                          {expandedFeedbacks.has(student.id) ? "Show less" : "Show more"}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination Controls */}
      <div className="tw-flex tw-justify-between tw-items-center tw-h-12 tw-p-4">
        <div className="tw-text-gray-700 tw-flex tw-items-center">
          <span className="tw-mr-4">Page</span>
          {currentPage}
        </div>
        <div className="tw-flex tw-items-center">
          <Pagination className="tw-flex tw-place-items-end">
            <PaginationContent className="tw-flex tw-items-center">
              <PaginationItem>
                <PaginationPrevious
                  className="tw-px-3 tw-py-1"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className="tw-px-3 tw-py-1"
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  disabled={!hasMore}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <FeedbackDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        initialFeedbacks={currentStudent && currentStudent.feedback ? currentStudent.feedback.messages : []}
        // onSave={handleSaveFeedback}
        submissionId={currentStudent ? currentStudent.submissionId || currentStudent.id : null}
      />

      <AlertDialog open={isGradeAlertOpen} onOpenChange={setIsGradeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grade Validation</AlertDialogTitle>
            {/* <AlertDialogDescription>{gradeAlertMessage}</AlertDialogDescription> */}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsGradeAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={isErrorDialogOpen} onOpenChange={setIsErrorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            {/* <AlertDialogDescription>{errorMessage}</AlertDialogDescription> */}
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setIsErrorDialogOpen(false)}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CourseTable;