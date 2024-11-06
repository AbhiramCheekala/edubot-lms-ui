import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClipboardList, Upload, CheckSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import CustomDateRangePicker from "@/components/custom/shared/CustomDateRangePicker";
import { Link } from "@tanstack/react-router";
import { useInView } from "react-intersection-observer";

interface Course {
  courseId: string;
  name: string;
}

interface Module {
  moduleId: string;
  name: string;
}

interface Submission {
  assignmentId: string;
  submissionId: string;
  assignmentName: string;
  grade: number | null;
  feedback?: {
    messages: Array<{ content: string }>;
  };
  courseId: string;
  courseName: string;
  moduleId: string;
  moduleName: string;
}

interface GroupedSubmissions {
  [courseId: string]: {
    courseName: string;
    modules: {
      [moduleId: string]: {
        moduleName: string;
        assignments: Submission[];
      };
    };
  };
}

interface DateRange {
  from: Date;
  to?: Date;
}

const MySubmissions: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [customDateRange, setCustomDateRange] = useState<DateRange | null>(
    null
  );
  const [courseSearchQuery, setCourseSearchQuery] = useState("");
  const [debouncedCourseSearchQuery, setDebouncedCourseSearchQuery] =
    useState("");
  const { ref: infiniteScrollRef, inView } = useInView();
  const limit = 10;

  const queryClient = useQueryClient();

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
  }, 1300);

  const debouncedCourseSearchQueryUpdate = useDebouncedCallback((value) => {
    setDebouncedCourseSearchQuery(value);
  }, 1000);

  const fetchCourses = async ({ pageParam = 1 }) => {
    const params: Record<string, string> = {
      page: pageParam.toString(),
      limit: "20",
      includeModuleCount: "true",
      includeModules: "true",
      "sorts[0][field]": "name",
      "sorts[0][order]": "ASC",
    };

    if (debouncedCourseSearchQuery) {
      params["filters[0][field]"] = "name";
      params["filters[0][searchType]"] = "CONTAINS";
      params["filters[0][searchKey]"] = debouncedCourseSearchQuery;
    }

    const response = await api.get("/courses", { params });
    return response.data;
  };

  const {
    data: coursesData,
    fetchNextPage: fetchNextCoursesPage,
    hasNextPage: hasNextCoursesPage,
    isFetchingNextPage: isFetchingNextCoursesPage,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useInfiniteQuery({
    queryKey: ["courses", debouncedCourseSearchQuery],
    queryFn: fetchCourses,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.results.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    },
  });

  const { data: selectedCourseData } = useQuery({
    queryKey: ["course", selectedCourse],
    queryFn: () =>
      api.get(
        `/courses/${selectedCourse}?includeModuleCount=true&includeModules=true`
      ),
    enabled: !!selectedCourse,
  });

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value !== "Custom") {
      setCustomDateRange(null);
    }
  };

  const getDateRange = () => {
    if (customDateRange) {
      return [
        customDateRange.from.toISOString(),
        (customDateRange.to || customDateRange.from).toISOString(),
      ];
    }

    if (!dateFilter) return null;
    const now = new Date();
    let start, end;

    switch (dateFilter) {
      case "Today":
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "This Week":
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        break;
      case "Last Week":
        start = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        end = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        break;
      case "This Month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      default:
        return null;
    }

    return [start.toISOString(), end.toISOString()];
  };

  const fetchSubmissions = async (page: number) => {
    const url = "/submissions/my";
    const params: Record<string, string> = {
      limit: limit.toString(),
      page: page.toString(),
      includeAssignment: "true",
      includeGrade: "true",
      includeModule: "true",
      includeCourse: "true",
      "sorts[0][field]": "courseName",
      "sorts[0][order]": "ASC",
      "sorts[1][field]": "courseId",
      "sorts[1][order]": "ASC",
      "sorts[2][field]": "moduleId",
      "sorts[2][order]": "ASC",
      "sorts[3][field]": "moduleName",
      "sorts[3][order]": "ASC",
      "sorts[4][field]": "assignmentName",
      "sorts[4][order]": "ASC",
    };

    let filterIndex = 0;

    if (selectedCourse) {
      params[`filters[${filterIndex}][field]`] = "courseId";
      params[`filters[${filterIndex}][searchKey]`] = selectedCourse;
      params[`filters[${filterIndex}][searchType]`] = "EXACT_MATCH";
      filterIndex++;
    }

    if (selectedModule && selectedModule !== "All") {
      params[`filters[${filterIndex}][field]`] = "moduleId";
      params[`filters[${filterIndex}][searchKey]`] = selectedModule;
      params[`filters[${filterIndex}][searchType]`] = "EXACT_MATCH";
      filterIndex++;
    }

    const dateRange = getDateRange();
    if (dateRange) {
      params[`filters[${filterIndex}][field]`] = "submissionDateRange";
      params[`filters[${filterIndex}][searchKey]`] = JSON.stringify(dateRange);
      params[`filters[${filterIndex}][searchType]`] = "DATE_RANGE";
    }

    const response = await api.get(url, { params });
    return response.data;
  };

  const {
    data: submissionsData,
    isLoading: isLoadingSubmissions,
    error: submissionsError,
  } = useQuery({
    queryKey: [
      "submissions",
      currentPage,
      selectedCourse,
      selectedModule,
      dateFilter,
      customDateRange,
      searchQuery,
    ],
    queryFn: () => fetchSubmissions(currentPage),
    staleTime: 5000,
  });

  const submissions = submissionsData?.results || [];
  const hasMore = submissionsData?.hasMore || false;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedCourse,
    selectedModule,
    dateFilter,
    customDateRange,
    searchQuery,
  ]);

  useEffect(() => {
    if (hasMore) {
      queryClient.prefetchQuery({
        queryKey: [
          "submissions",
          currentPage + 1,
          selectedCourse,
          selectedModule,
          dateFilter,
          customDateRange,
          searchQuery,
        ],
        queryFn: () => fetchSubmissions(currentPage + 1),
      });
    }
  }, [
    submissionsData,
    currentPage,
    queryClient,
    selectedCourse,
    selectedModule,
    dateFilter,
    customDateRange,
    searchQuery,
    hasMore,
  ]);

  useEffect(() => {
    if (inView && hasNextCoursesPage) {
      fetchNextCoursesPage();
    }
  }, [inView, fetchNextCoursesPage, hasNextCoursesPage]);

  const handleCourseChange = (courseId: string) => {
    if (courseId === "all" || courseId === selectedCourse) {
      setSelectedCourse(null);
      setSelectedModule(null);
    } else {
      setSelectedCourse(courseId);
      setSelectedModule(null);
    }
  };

  const handleModuleChange = (moduleId: string) => {
    setSelectedModule(moduleId);
  };

  const courses = coursesData?.pages.flatMap((page) => page.results) || [];
  const modules = selectedCourseData?.data.modules || [];

  const groupedSubmissions: GroupedSubmissions = submissions.reduce(
    (acc: GroupedSubmissions, submission: Submission) => {
      if (!acc[submission.courseId]) {
        acc[submission.courseId] = {
          courseName: submission.courseName,
          modules: {},
        };
      }
      if (!acc[submission.courseId].modules[submission.moduleId]) {
        acc[submission.courseId].modules[submission.moduleId] = {
          moduleName: submission.moduleName,
          assignments: [],
        };
      }
      acc[submission.courseId].modules[submission.moduleId].assignments.push(
        submission
      );
      return acc;
    },
    {}
  );

  return (
    <div className="tw-bg-white tw-p-6">
      <div className="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-mb-6">
        <Card className="tw-bg-white tw-shadow-sm tw-rounded-lg tw-overflow-hidden">
          <CardContent className="tw-p-4 tw-flex tw-items-center tw-justify-between">
            <div>
              <p className="tw-text-sm tw-text-gray-500">Total assignments</p>
              <p className="tw-text-2xl tw-font-semibold tw-text-green-500">
                {submissionsData?.total || 0}
              </p>
            </div>
            <div className="tw-w-10 tw-h-10 tw-bg-green-500 tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <ClipboardList className="tw-w-5 tw-h-5 tw-text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="tw-bg-white tw-shadow-sm tw-rounded-lg tw-overflow-hidden">
          <CardContent className="tw-p-4 tw-flex tw-items-center tw-justify-between">
            <div>
              <p className="tw-text-sm tw-text-gray-500">
                Assignments submitted
              </p>
              <p className="tw-text-2xl tw-font-semibold tw-text-[#E1BE46]">
                {submissions.length}
              </p>
            </div>
            <div className="tw-w-10 tw-h-10 tw-bg-[#E1BE46] tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <Upload className="tw-w-5 tw-h-5 tw-text-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="tw-bg-white tw-shadow-sm tw-rounded-lg tw-overflow-hidden">
          <CardContent className="tw-p-4 tw-flex tw-items-center tw-justify-between">
            <div>
              <p className="tw-text-sm tw-text-gray-500">
                Evaluated Assignments
              </p>
              <p className="tw-text-2xl tw-font-semibold tw-text-red-500">
                {submissions.filter((s: Submission) => s.grade !== null).length}
              </p>
            </div>
            <div className="tw-w-10 tw-h-10 tw-bg-red-500 tw-rounded-full tw-flex tw-items-center tw-justify-center">
              <CheckSquare className="tw-w-5 tw-h-5 tw-text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="tw-flex tw-flex-col md:tw-flex-row tw-gap-4 tw-mb-6">
        <div className="tw-w-full md:tw-w-48">
          <Select
            onValueChange={handleCourseChange}
            value={selectedCourse || ""}
          >
            <SelectTrigger className="tw-border-primary tw-h-10 tw-rounded-md tw-w-full">
              <SelectValue placeholder="Course Filter" />
            </SelectTrigger>
            <SelectContent>
              <div className="tw-p-2">
                <Input
                  type="text"
                  placeholder="Search courses..."
                  value={courseSearchQuery}
                  onChange={(e) => {
                    setCourseSearchQuery(e.target.value);
                    debouncedCourseSearchQueryUpdate(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
              <ScrollArea className="tw-h-[200px]">
                <SelectGroup>
                  <SelectItem
                    value="all"
                    className="tw-text-gray-500 hover:tw-text-gray-900 transition-colors"
                  >
                    Don't filter by course
                  </SelectItem>
                  {isLoadingCourses ? (
                    <div className="tw-text-center tw-py-2">
                      Loading courses...
                    </div>
                  ) : coursesError ? (
                    <div className="tw-text-center tw-py-2 tw-text-red-500">
                      Error loading courses
                    </div>
                  ) : (
                    courses.map((course: Course) => (
                      <SelectItem key={course.courseId} value={course.courseId}>
                        {course.name}
                      </SelectItem>
                    ))
                  )}
                  {isFetchingNextCoursesPage && (
                    <div className="tw-text-center tw-py-2">
                      Loading more...
                    </div>
                  )}
                  <div ref={infiniteScrollRef} />
                </SelectGroup>
                <ScrollBar />
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>

        {selectedCourse && (
          <div className="tw-w-full md:tw-w-48">
            <Select
              onValueChange={handleModuleChange}
              value={selectedModule || undefined}
            >
              <SelectTrigger className="tw-border-primary tw-h-10 tw-rounded-md tw-w-full">
                <SelectValue placeholder="Module Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="All">All Modules</SelectItem>
                  {modules.map((module: Module) => (
                    <SelectItem key={module.moduleId} value={module.moduleId}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="tw-w-full md:tw-w-48">
          <Select
            value={dateFilter || undefined}
            onValueChange={handleDateFilterChange}
          >
            <SelectTrigger className="tw-border-primary tw-h-10 tw-rounded-md tw-w-full">
              <SelectValue placeholder="Date Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="Today">Today</SelectItem>
                <SelectItem value="This Week">This Week</SelectItem>
                <SelectItem value="Last Week">Last Week</SelectItem>
                <SelectItem value="This Month">This Month</SelectItem>
                <SelectItem value="Custom">Custom Period</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {dateFilter === "Custom" && (
          <div className="tw-w-full md:tw-w-48">
            <CustomDateRangePicker
              onSelect={(range) => {
                setCustomDateRange(range);
              }}
            />
          </div>
        )}
      </div>

      <div className="tw-bg-white tw-rounded-lg tw-overflow-hidden tw-shadow">
        <ScrollArea className="tw-w-full tw-overflow-auto">
          <Table className="tw-w-full tw-text-sm tw-text-left tw-text-gray-500">
            <TableHeader className="tw-text-gray-700">
              <TableRow>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Courses
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Modules
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Assignments
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Chat Link
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Test Cases
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Grade
                </TableHead>
                <TableHead className="tw-px-6 tw-py-3 tw-text-center">
                  Feedback
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSubmissions ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-text-center tw-py-4">
                    Loading submissions...
                  </TableCell>
                </TableRow>
              ) : submissionsError ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="tw-text-center tw-py-4 tw-text-red-500"
                  >
                    Error loading submissions
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedSubmissions).map(
                  ([courseId, courseData]) =>
                    Object.entries(courseData.modules).map(
                      ([moduleId, moduleData], moduleIndex) =>
                        moduleData.assignments.map(
                          (submission, assignmentIndex) => (
                            <TableRow
                              key={submission.submissionId}
                              className="tw-border-b"
                            >
                              {moduleIndex === 0 && assignmentIndex === 0 && (
                                <TableCell
                                  className="tw-px-6 tw-py-4 tw-font-medium tw-text-gray-700 tw-border tw-text-start"
                                  rowSpan={Object.values(
                                    courseData.modules
                                  ).reduce(
                                    (acc, mod) => acc + mod.assignments.length,
                                    0
                                  )}
                                >
                                  <Link
                                    to="/all/courses/$courseId"
                                    params={{ courseId: courseId } as any}
                                    className="tw-text-primary tw-font-semibold hover:tw-underline"
                                  >
                                    {courseData.courseName}
                                  </Link>
                                </TableCell>
                              )}
                              {assignmentIndex === 0 && (
                                <TableCell
                                  className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start"
                                  rowSpan={moduleData.assignments.length}
                                >
                                  <Link
                                    to="/all/courses/$courseId"
                                    params={{ courseId: courseId } as any}
                                    search={{ moduleId: moduleId } as any}
                                    className="tw-text-primary tw-font-semibold hover:tw-underline"
                                  >
                                    {moduleData.moduleName}
                                  </Link>
                                </TableCell>
                              )}
                              <TableCell className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start">
                                <Link
                                  to={`/my/assignments/${submission.assignmentId}/submissions`}
                                  className="tw-text-primary tw-font-semibold hover:tw-underline"
                                >
                                  {submission.assignmentName}
                                </Link>
                              </TableCell>
                              <TableCell className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start">
                                <Link
                                  to={`/my/assignments/${submission.assignmentId}/submissions`}
                                  className="tw-text-primary tw-font-semibold hover:tw-underline"
                                >
                                  Link
                                </Link>
                              </TableCell>
                              <TableCell className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start">
                                <Link
                                  to={`/my/assignments/${submission.assignmentId}/submissions`}
                                  className="tw-text-primary tw-font-semibold hover:tw-underline"
                                >
                                  Link
                                </Link>
                              </TableCell>
                              <TableCell className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start">
                                <span
                                  className={`tw-px-2 tw-py-1 tw-rounded-full tw-text-white ${
                                    submission.grade === null
                                      ? "tw-bg-gray-300"
                                      : submission.grade >= 80
                                        ? "tw-bg-green-500"
                                        : submission.grade >= 60
                                          ? "tw-bg-yellow-500"
                                          : "tw-bg-red-500"
                                  }`}
                                >
                                  {submission.grade === null
                                    ? "-- / 100"
                                    : `${submission.grade}/100`}
                                </span>
                              </TableCell>
                              <TableCell className="tw-px-6 tw-py-4 tw-text-gray-700 tw-border tw-text-start">
                                {submission.feedback?.messages.length > 0 ? (
                                  <ul className="tw-list-disc tw-pl-5">
                                    {submission.feedback?.messages.map(
                                      (message, index) => (
                                        <li key={index}>{message.content}</li>
                                      )
                                    )}
                                  </ul>
                                ) : (
                                  <span className="tw-text-gray-300">
                                    No feedback yet
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        )
                    )
                )
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="tw-flex tw-justify-between tw-items-center tw-h-12 tw-top-102 tw-left-1 tw-p-[15px_5px_0_5px] tw-opacity-100">
        <div className="tw-text-gray-700 tw-w-16 tw-h-8 tw-gap-6">
          <span className="tw-mr-4">Page</span>
          {currentPage}
        </div>
        <div className="tw-flex tw-items-center">
          <Pagination className="tw-flex tw-place-items-end">
            <PaginationContent className="tw-flex tw-items-center">
              <PaginationItem>
                <PaginationPrevious
                  className="tw-px-3 tw-py-1"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
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
    </div>
  );
};

export default MySubmissions;
