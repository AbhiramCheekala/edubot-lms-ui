import ContentViewer from '@/components/custom/shared/ContentViewer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, UseMutationResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { format, isValid } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronUp, Download, Plus, Search, Sparkle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { api } from '../../lib/api';
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

const fetchStudents = async ({
  page,
  limit,
  assignmentId,
  searchQuery,
  status,
}) => {
  try {
    const url = `/submissions?includeStudent=true&includeGrade=true&includeContentGroup=true`;
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

// Define the mutation function type
// type MutationFn = (newFeedbacks: Feedback[]) => Promise<any>;

const FeedbackDialog = ({ isOpen, onClose, feedbacks, submissionId }) => {
  const [newFeedbacks, setNewFeedbacks] = useState<Feedback[]>([]);
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
    },
    onError: (error) => {
      console.error('Error updating feedback:', error);
      alert("An error occurred while saving feedback. Please try again.");
    } 
  });

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
      alert("Please fill out all feedback fields before saving.");
    }
  };
  const { permissionSet } = usePolicies();
  const canEditGrade = checkActionScopes(permissionSet, "grade:write", ["admin","organization","supervisor"]);

  return (
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

          <div className="tw-mt-4 tw-space-y-4 tw-overflow-y-auto tw-max-h-75 tw-max-h-[400px] tw-scrollbar-hide">
            {feedbacks.map((feedback, index) => (
              <div key={index} className="tw-mb-2">
                {isValid(new Date(feedback.createdAt)) && (
                  <p className="tw-text-xs tw-text-gray-500">
                    {format(new Date(feedback.createdAt), "do MMM yyyy")}
                  </p>
                )}
                <p className="tw-text-sm">{feedback.content}</p>
              </div>
            ))}
            {newFeedbacks.map((feedback, index) => (
              <Textarea
                key={`new-${index}`}
                className={`!tw-bg-white tw-w-full tw-h-24 tw-p-2 tw-border !tw-ring-[-2] tw-rounded placeholder:!tw-text-primary placeholder:text-sm placeholder:font-medium ${
                  feedback.content.trim() === ""
                    ? "tw-border-red-500"
                    : "tw-border-gray-300"
                }`}
                placeholder={`Add Feedback`}
                value={feedback.content}
                onChange={(e) => handleFeedbackChange(index, e.target.value)}
              />
            ))}
            {canEditGrade &&
              <div className="!tw-w-[8px] tw-h-[8px] tw-mt-10 tw-border tw-border-0 tw-relative">
                <Separator className="!tw-w-[315px] tw-h-0 tw-mt-6 tw-ml-5 tw-border tw-border-[0.2px] tw-border-[#BDBDBD]" />
                <span className="tw-absolute tw-w-[31px] tw-h-[31px] tw-bg-[#D9D9D9] tw-mt-[-17px] tw-ml-[159px] tw-rounded-full tw-flex tw-items-center tw-justify-center">
                  <Plus
                    onClick={handleAddFeedback}
                    className="tw-w-[18.33px] tw-h-[18.33px] tw-text-[#8E8E8E]"
                  />
                </span>
              </div>
            }
            <div className="tw-flex tw-flex-row tw-justify-center tw-gap-4">
                <AlertDialogCancel className="tw-px-4 tw-py-2 tw-bg-white tw-ml-[-20px] tw-w-[89px] !tw-ring-[-2] tw-h-[38px] tw-text-[#272864] tw-font-semibold tw-text-[16px] tw-rounded !tw-mt-2">
                  Cancel
                </AlertDialogCancel>
              {newFeedbacks.length > 0 && (
                <AlertDialogAction
                  onClick={handleSave}
                disabled={feedbackMutation.isPending}
                className={`tw-px-4 tw-py-2 tw-w-[79px] tw-h-[38px] tw-rounded-4 tw-bg-primary tw-text-white tw-font-semibold tw-mt-2 ${
                  feedbackMutation.isPending ? 'tw-opacity-50 tw-cursor-not-allowed' : ''
                }`}
              >
                {feedbackMutation.isPending ? 'Saving...' : 'Done'}
              </AlertDialogAction>
              )}
            </div>
          </div>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const App = () => {
  const { assignmentId, submissionId } = useParams({
    from: "/_authenticated/assignments/$assignmentId/$submissionId",
  });
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  // const [openViewer, setOpenViewer] = useState(false);
  const [isChevronDown, setIsChevronDown] = useState(true);
  const [isStudentsVisible, setIsStudentsVisible] = useState(true);
  const [isLeftDivVisible, setIsLeftDivVisible] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbacks, setFeedbacks] = useState([]); // <-- New feedback state
  const [filterType, setFilterType] = useState(""); // <-- New State for filter type
  const [grade, setGrade] = useState(""); // <-- New state for grade
  const [previousValidGrade, setPreviousValidGrade] = useState(""); // <-- New state for previous valid grade
  const [isGradeAlertOpen, setIsGradeAlertOpen] = useState(false);
  const [gradeAlertMessage, setGradeAlertMessage] = useState("");
  const { permissionSet } = usePolicies();
  const canViewSubmission = checkActionScopes(permissionSet, "submission:read", ["admin","organization","supervisor"]);
  const canEditGrade = checkActionScopes(permissionSet, "grade:write", ["admin","organization","supervisor"]);

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
  }, 1000);

  const handleToggleVisibility = () => {
    setIsChevronDown(!isChevronDown);
    setIsStudentsVisible(!isStudentsVisible);
    setIsLeftDivVisible(!isLeftDivVisible);
  };

  const { data } = useQuery({
    queryKey: ["studentsAssignments", searchQuery, assignmentId, filterType], // Include filterType in queryKey
    queryFn: () =>
      fetchStudents({
        page: 1,
        limit: 100,
        assignmentId,
        searchQuery,
        status: filterType,
      }), // Pass filterType as status
    staleTime: 1000,
  });

  useEffect(() => {
    if (data) {
      const selectedStudent = data.results.find(
        (student) => student.submissionId === submissionId
      );
      if (selectedStudent) {
        setCurrentStudent(selectedStudent);

        setFeedbacks(selectedStudent?.feedback?.messages || []);
      }
      setStudents(data.results);
      setFilteredStudents(data.results);
    }
  }, [data, submissionId]);

  useEffect(() => {
    setFilteredStudents(
      students.filter((student) =>
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, students]);

  useEffect(() => {
    if (currentStudent) {
      setPreviousValidGrade(currentStudent?.grade);
    }
  }, [currentStudent]);

  const handleStudentClick = (student) => {
    setCurrentStudent(student);
    setFeedbacks(student?.feedback?.messages || []);
  };
  const validateGrade = (gradeValue) => {
    if (gradeValue === undefined || gradeValue === null || gradeValue.trim() === "") {
      setGradeAlertMessage("Grade should not be empty");
      setIsGradeAlertOpen(true);
      return false;
    }
  
    const gradeNumber = Number(gradeValue);
  
    if (isNaN(gradeNumber)) {
      setGradeAlertMessage("Invalid grade value");
      setIsGradeAlertOpen(true);
      return false;
    }
  
    if (gradeNumber < 0 || gradeNumber > 100) {
      setGradeAlertMessage("Grade should be between 0 and 100");
      setIsGradeAlertOpen(true);
      return false;
    }
  
    return true;
  };
  
  const queryClient = useQueryClient();

  // Define the mutation input type
  interface GradeMutationVariables {
    submissionId: string;
    gradeValue: string;
  }

  // Define the mutation result type (adjust this based on your API response)
  interface GradeMutationResult {
    // Add properties that your API returns
    success: boolean;
    message?: string;
  }
  
  const undoGradeChange = () => {
    if (currentStudent && previousValidGrade !== undefined) {
      const updatedStudents = students.map((student) => {
        if (student.submissionId === currentStudent.submissionId) {
          return { ...student, grade: previousValidGrade };
        }
        return student;
      });
      setCurrentStudent({ ...currentStudent, grade: previousValidGrade });
      setStudents(updatedStudents);
    }
  };

  const gradeMutation: UseMutationResult<GradeMutationResult, Error, GradeMutationVariables> = useMutation({
    mutationFn: async ({ submissionId, gradeValue }) => {
      const payload = {
        score: Number(gradeValue),
      };
      const response = await api.put<GradeMutationResult>(`/submissions/${submissionId}/grade`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      console.log("Grade submitted successfully:", data);
      setPreviousValidGrade(variables.gradeValue);
      queryClient.invalidateQueries({ queryKey: ["studentsAssignments"] });
    },
    onError: (error) => {
      console.error("Error submitting grade:", error);
      setGradeAlertMessage("An error occurred while submitting the grade.");
      setIsGradeAlertOpen(true);
      undoGradeChange();
    },
  });

  const handleSaveGrade = (submissionId: string, gradeValue: string) => {
    if (validateGrade(gradeValue)) {
      gradeMutation.mutate({ submissionId, gradeValue });
    } else {
      undoGradeChange();
    }
  };

  const handleDownload = (fileUrl) => {
    window.open(fileUrl, "_blank");
  };

  const handleFilterChange = (value) => {
    setFilterType(value);
  };

  return (
    <>
      <div className="tw-flex">
        {isLeftDivVisible ? (
          <div className="tw-relative tw-w-60 tw-top-0 tw-left-0 tw-rounded-tl-md tw-bg-white tw-shadow-md transition-transform duration-300">
            <div className="tw-relative tw-w-[300px]">
              <Input
                className="tw-w-[199px] tw-h-[30px] tw-m-4 !tw-ring-[-2] placeholder:tw-text-[12px] placeholder:!tw-text-primary tw-border-primary !tw-bg-[#FFFFFF] !tw-pl-[25px]"
                type="text"
                placeholder="Search Student"
                value={searchQuery}
                onChange={(e) => debouncedSearch(e.target.value)}
              />
              <Search className="tw-absolute tw-w-[16px] tw-h-[16px] tw-left-[20px] tw-top-[8px]" />
              {isChevronDown ? (
                <ChevronLeft
                  className="tw-absolute tw-w-[20px] tw-h-[16px] tw-left-[217px] tw-top-[8px] tw-text-primary tw-cursor-pointer"
                  onClick={handleToggleVisibility}
                />
              ) : (
                <ChevronUp
                  className="tw-absolute tw-w-[20px] tw-h-[16px] tw-left-[210px] tw-top-[8px] tw-cursor-pointer"
                  onClick={handleToggleVisibility}
                />
              )}
            </div>
            {isStudentsVisible && (
              <div>
                <Select onValueChange={handleFilterChange}>
                  <SelectTrigger className="tw-w-[199px] tw-h-[30px] tw-m-4 !tw-ring-[-2] placeholder:-tw-19 tw-text-[12px] placeholder:!tw-text-primary tw-border-primary !tw-bg-[#FFFFFF] !placeholder:tw-text-primary !tw-pl-[25px]">
                    <span className=" tw-font-montserrat tw-font-medium tw-text-[12px] tw-leading-[14.63px] tw-text-primary">
                      <SelectValue placeholder=" Gradings" />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup className="!tw-w-38 tw-h-[68px] tw-rounded-[6px] !tw-border-primary">
                      <SelectItem className="!tw-py-0" value="submitted">
                        <span className="tw-font-montserrat tw-font-normal tw-text-[13px] tw-text-primary tw-leading-[12.19px]">
                          Submitted
                        </span>
                      </SelectItem>
                      <SelectItem className="!tw-py-0" value="graded">
                        <span className="tw-font-montserrat tw-font-normal tw-mt-3 tw-text-[13px] tw-text-primary tw-leading-[12.19px]">
                          Graded
                        </span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <div className="tw-flex tw-flex-col tw-gap-4 tw-h-[450px] tw-overflow-y-auto">
                  {filteredStudents.map((student, idx) => (
                    <div
                      key={idx}
                      className={`tw-h-[41px] tw-rounded-md tw-flex tw-items-center tw-px-2 ${
                        student.studentName === currentStudent?.studentName
                          ? "tw-bg-[#D3ECFD]"
                          : "tw-bg-white"
                      }`}
                      onClick={() => handleStudentClick(student)}
                    >
                      <div className="tw-w-[25px] tw-h-[25px] tw-mr-2 tw-relative">
                        <img
                          src="https://www.shutterstock.com/image-photo/adult-female-avatar-image-on-260nw-2419909229.jpg"
                          className="tw-w-[25px] tw-h-[25px] tw-rounded-full tw-object-cover"
                          alt="student profile"
                        />
                      </div>
                      <div className="tw-flex tw-flex-col tw-justify-center tw-flex-grow">
                        <div className="tw-font-semibold tw-text-[10px] tw-text-[#000000]">
                          {student.studentName}
                        </div>
                        <div className="tw-text-xs tw-text-[#00000080] tw-text-[10px]">
                          ID:{" "}
                          <a href="#" className="tw-text-blue-500 tw-text-[10px]">
                            {student.givenStudentId}
                          </a>
                        </div>
                      </div>
                      <div
                        className={`tw-w-[50px] tw-h-[25px] tw-px-2 tw-rounded-full tw-py-1 tw-border-b-[0.5px] tw-border-[#BDBDBD] tw-text-[#00000082] tw-font-montserrat tw-text-[10px] tw-font-semibold tw-mr-[10px] tw-text-center tw-flex tw-items-center tw-justify-center ${
                          student.name === currentStudent?.name
                            ? "tw-bg-[#FFDF9B]"
                            : "tw-bg-gray-200"
                        }`}
                      >
                        {student.grade}/100
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div
          className={`tw-w-full tw-h-full ${
            isLeftDivVisible ? "tw-ml-4" : "tw-ml-0"
          } tw-bg-white tw-shadow-md transition-margin duration-300`}
        >
          <div className="tw-w-full tw-h-[57px] tw-bg-[#ECF7FF] tw-flex tw-items-center tw-justify-center tw-px-4">
            <div className="tw-w-full tw-flex tw-flex-row tw-justify-between tw-items-center">
              <div className="tw-flex tw-items-center">
                {!isStudentsVisible && (
                  <ChevronRight
                    onClick={handleToggleVisibility}
                    className="tw-w-[16px] tw-h-[16px]"
                  />
                )}
                <img
                  src="https://www.shutterstock.com/image-photo/adult-female-avatar-image-on-260nw-2419909229.jpg"
                  alt="Profile"
                  className="tw-w-[25px] tw-h-[25px] tw-rounded-full tw-mr-2 tw-ml-4"
                />
                <div className="tw-flex tw-flex-col tw-justify-center">
                  <p className="tw-font-montserrat tw-text-[10px] tw-font-medium tw-leading-[15.7px] tw-text-[#3A3541DE]">
                    {currentStudent?.studentName}
                  </p>
                  <p className="tw-font-montserrat tw-text-[10px] tw-font-medium tw-leading-[15.7px] tw-text-[#3A3541DE]">
                    ID : {currentStudent?.givenStudentId}
                  </p>
                </div>
              </div>
              <div className="tw-flex tw-flex-row tw-justify-between tw-items-center tw-w-auto tw-h-[33.5px] tw-gap-4">
                <div className="tw-flex tw-flex-col tw-justify-center tw-items-end">
                  <p className="tw-text-[#3A3541DE] tw-font-medium tw-text-[10px] tw-leading-[15.7px]">
                    Submitted
                  </p>
                  <p className="tw-inline-flex tw-items-center tw-font-montserrat tw-text-[8px] tw-font-semibold tw-leading-[15.7px] tw-tracking-[0.1px] tw-text-left tw-text-[#00000082]">
                    Submission Receipt: {currentStudent?.submissionId}
                  </p>
                </div>
                <div className="tw-flex tw-items-center tw-justify-center tw-bg-[#FFD79C] tw-px-2 tw-rounded-[20px] tw-w-[60px] tw-h-[30px]">
                  <input
                    type="text"
                    value={currentStudent?.grade?.toString() || ""}
                    onChange={(e) => {
                      const newGrade = e.target.value;
                      setGrade(newGrade);
                      const updatedStudents = students.map((student) => {
                        if (student.submissionId === currentStudent.submissionId) {
                          return { ...student, grade: newGrade };
                        }
                        return student;
                      });
                      setCurrentStudent({ ...currentStudent, grade: newGrade });
                      setStudents(updatedStudents);
                    }}
                    onBlur={() => currentStudent && handleSaveGrade(currentStudent.submissionId, grade)}
                    className={`tw-w-full tw-h-full tw-bg-[#FFD79C] tw-text-sm tw-font-medium tw-text-[#3A3541] tw-ring-0 tw-border-0 tw-outline-none tw-text-center tw-rounded-[20px] ${!canEditGrade ? "tw-cursor-not-allowed tw-opacity-50" : "tw-cursor-pointer"}`}
                    // className="tw-w-full"
                    placeholder="Grade"
                    disabled={gradeMutation.isPending || !canEditGrade}
                  />
                </div>
                <div className="tw-flex tw-flex-row tw-justify-between tw-items-center tw-gap-4">
                                  <span className="tw-font-montserrat tw-font-semibold tw-text-[10px] tw-leading-[15.7px] tw-tracking-[0.1px] tw-text-primary">
                    <button
                      onClick={() => setIsDialogOpen(true)}
                      className="tw-flex tw-justify-center tw-items-center tw-cursor-pointer"
                    >
                      Add Feedback
                    </button>
                    <FeedbackDialog
                      isOpen={isDialogOpen}
                      onClose={() => setIsDialogOpen(false)}
                      feedbacks={feedbacks}
                      submissionId={currentStudent?.submissionId}
                    />
                  </span>
                  <span className="tw-font-montserrat tw-font-semibold tw-text-[10px] tw-leading-[15.7px] tw-tracking-[0.1px] tw-text-primary">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <span className="tw-flex tw-justify-center tw-items-center tw-cursor-pointer">
                          <Sparkle className="tw-w-[10.83px] tw-h-[10.83px] tw-text-[#F0BA4A]" /> Auto Analysis
                        </span>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="tw-w-[380px] tw-h-[320px] tw-absolute tw-rounded-[4px] tw-bg-white">
                        <AlertDialogHeader>
                          <div className="tw-flex tw-justify-between tw-items-center">
                            <AlertDialogTitle>
                              <span className="tw-font-montserrat tw-text-[16px] tw-font-semibold tw-leading-[19.5px] tw-text-primary">
                                Auto Analysis
                              </span>
                            </AlertDialogTitle>
                            <AlertDialogCancel className="!tw-ring-[-2] tw-w-6 tw-h-4 !tw-border-white">
                              <X className="tw-absolute tw-w-[15px] tw-text-[#999999] tw-h-[15px]" />
                            </AlertDialogCancel>
                          </div>
                          <AlertDialogDescription>
                            <Textarea
                              className="!tw-bg-white !tw-ring-[-2] tw-w-[342px] tw-h-[192px] placeholder:tw-text-[14px] tw-font-bold placeholder:tw-text-primary"
                              placeholder="Friends Ipsum is simply dummy text of the printing and typesetting industry. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum"
                              readOnly
                            />
                          </AlertDialogDescription>
                          {canEditGrade &&  //since it is a auto generated
                            <div className="tw-flex tw-flex-row tw-justify-center tw-gap-4">
                              <AlertDialogCancel className="!tw-ring-[-2] tw-w-[89px] tw-h-[39px]">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction className="tw-w-[79px] tw-h-[38px]">
                                Done
                              </AlertDialogAction>
                            </div>
                          }
                        </AlertDialogHeader>
                      </AlertDialogContent>
                    </AlertDialog>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="tw-w-full tw-h-full tw-bg-[#D1D1D1] tw-rounded-[4px] tw-flex tw-items-start tw-justify-center">
            <div className="tw-w-full tw-h-full tw-bg-white tw-rounded-tl-4px_0px_0px_0px">
              <Accordion type="multiple" className="tw-w-full tw-px-4">
                {currentStudent?.contents?.map((content) => (
                  <AccordionItem key={content.contentId} value={content.contentId}>
                    <AccordionTrigger className="tw-w-full tw-flex tw-justify-between tw-items-center tw-px-2 tw-text-[12px] tw-py-2">
                      <div className="tw-w-full tw-flex tw-justify-between tw-items-center">
                        <span className="tw-font-bold">
                          {content.binaryObject?.originalFileName}
                        </span>
                        <div className="tw-flex tw-items-center">
                          <Download
                            size={30}
                            className="tw-cursor-pointer tw-px-2 tw-mr-5"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownload(content.securedFileUrl);
                            }}
                          />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="tw-w-full tw-px-4 tw-py-2">
                      <ContentViewer
                        binaryObjectMimeType={content.binaryObject.mimeType}
                        securedFileUrl={content.securedFileUrl}
                      />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>

        {/* <Dialog open={openViewer} onOpenChange={setOpenViewer}>
          <DialogContent className="tw-w-full tw-h-[80vh]">
            <ContentViewer binaryObjectMimeType={mimeType} securedFileUrl={securedFileUrl} />
          </DialogContent>
        </Dialog> */}
      </div>

      <AlertDialog open={isGradeAlertOpen} onOpenChange={setIsGradeAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grade Validation</AlertDialogTitle>
            <AlertDialogDescription>{gradeAlertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsGradeAlertOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default App;