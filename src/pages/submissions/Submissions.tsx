import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronsUpDown, Loader2, Search } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Tailwind CSS styles for nowrap
const cellNowrapClasses = "whitespace-nowrap overflow-hidden text-ellipsis";

interface Assignment {
  assignmentId: string;
  moduleSectionName: string;
  submissionCount: number;
}

interface Module {
  moduleName: string;
  assignments: Assignment[];
}

interface Course {
  courseName: string;
  givenCourseId: string;
  modules: Record<string, Module>;
}

interface Program {
  programName: string;
  givenProgramId: string;
  courses: Record<string, Course>;
}

interface ApiProgram {
  programId: string;
  programName: string;
  givenProgramId: string;
  courseId: string;
  courseName: string;
  givenCourseId: string;
  moduleId: string;
  moduleName: string;
  moduleSectionName: string;
  assignmentId: string;
  submissionCount: number;
}

interface Organization {
  id: string;
  name: string;
}

const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit },
  });
  return data;
};

// Updated fetchData function with sorting
const fetchData = async (
  showProgramsTable: boolean,
  page: number,
  searchQuery: string,
  orgId: string | undefined
) => {
  const field = showProgramsTable ? "programName" : "courseName";
  const params = new URLSearchParams({
    page: page.toString(),
    limit: "20",
    includeSubmissionCount: "true",
    [`include${showProgramsTable ? "Program" : "Course"}`]: "true",
  });

  const filters: { field: string; searchType: string; searchKey: string }[] = [];

  if (searchQuery) {
    filters.push({
      field,
      searchType: "CONTAINS",
      searchKey: searchQuery,
    });
  }

  if (orgId) {
    filters.push({
      field: "organizationId",
      searchType: "EXACT_MATCH",
      searchKey: orgId,
    });
  }

  // Append filters to the URLSearchParams if filters exist
  filters.forEach((filter, index) => {
    params.append(`filters[${index}][field]`, filter.field);
    params.append(`filters[${index}][searchType]`, filter.searchType);
    params.append(`filters[${index}][searchKey]`, filter.searchKey);
  });

  // Add sorting parameters
  const sorts = showProgramsTable
    ? [
        { field: "programName", order: "ASC" },
        { field: "programId", order: "ASC" },
        { field: "courseName", order: "ASC" },
        { field: "courseId", order: "ASC" },
        { field: "moduleName", order: "ASC" },
        { field: "moduleId", order: "ASC" },
        { field: "moduleSectionTitle", order: "ASC" },
      ]
    : [
        { field: "courseName", order: "ASC" },
        { field: "courseId", order: "ASC" },
        { field: "moduleName", order: "ASC" },
        { field: "moduleId", order: "ASC" },
        { field: "moduleSectionTitle", order: "ASC" },
      ];

  sorts.forEach((sort, index) => {
    params.append(`sorts[${index}][field]`, sort.field);
    params.append(`sorts[${index}][order]`, sort.order);
  });

  const apiURL = `/assignments?${params.toString()}`;
  const { data } = await api.get<{
    results: ApiProgram[];
    total: number;
    hasMore: boolean;
  }>(apiURL);
  return data;
};

const groupCourses = (data: ApiProgram[]) => {
  const grouped: Record<string, Course> = {};

  data.forEach((item) => {
    if (!grouped[item.givenCourseId]) {
      grouped[item.givenCourseId] = {
        courseName: item.courseName,
        givenCourseId: item.givenCourseId,
        modules: {},
      };
    }
    if (!grouped[item.givenCourseId].modules[item.moduleId]) {
      grouped[item.givenCourseId].modules[item.moduleId] = {
        moduleName: item.moduleName,
        assignments: [],
      };
    }
    grouped[item.givenCourseId].modules[item.moduleId].assignments.push({
      assignmentId: item.assignmentId,
      moduleSectionName: item.moduleSectionName,
      submissionCount: item.submissionCount,
    });
  });

  return grouped;
};

const groupAssignments = (data: ApiProgram[]) => {
  const grouped: Record<string, Program> = {};

  data.forEach((item) => {
    if (!grouped[item.givenProgramId]) {
      grouped[item.givenProgramId] = {
        programName: item.programName,
        givenProgramId: item.givenProgramId,
        courses: {},
      };
    }
    if (!grouped[item.givenProgramId].courses[item.givenCourseId]) {
      grouped[item.givenProgramId].courses[item.givenCourseId] = {
        courseName: item.courseName,
        givenCourseId: item.givenCourseId,
        modules: {},
      };
    }
    if (
      !grouped[item.givenProgramId].courses[item.givenCourseId].modules[
        item.moduleId
      ]
    ) {
      grouped[item.givenProgramId].courses[item.givenCourseId].modules[
        item.moduleId
      ] = {
        moduleName: item.moduleName,
        assignments: [],
      };
    }
    grouped[item.givenProgramId].courses[item.givenCourseId].modules[
      item.moduleId
    ].assignments.push({
      assignmentId: item.assignmentId,
      moduleSectionName: item.moduleSectionName,
      submissionCount: item.submissionCount,
    });
  });

  return grouped;
};

interface ProgramTableProps {
  searchQuery: string;
  groupedAssignments: Record<string, Program>;
}

const ProgramTable: React.FC<ProgramTableProps> = ({
  searchQuery,
  groupedAssignments,
}) => {
  const filteredPrograms = Object.entries(groupedAssignments).reduce(
    (acc: Record<string, Program>, [programId, program]) => {
      if (
        (program.programName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        acc[programId] = program;
        return acc;
      }

      const filteredCourses = Object.entries(program.courses).reduce(
        (acc: Record<string, Course>, [courseId, course]) => {
          if (
            (course.courseName || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase())
          ) {
            acc[courseId] = course;
            return acc;
          }

          const filteredModules = Object.entries(course.modules).reduce(
            (acc: Record<string, Module>, [moduleId, module]) => {
              const filteredAssignments = module.assignments.filter(
                (assignment) =>
                  (assignment.moduleSectionName || "")
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase())
              );

              if (filteredAssignments.length > 0) {
                acc[moduleId] = {
                  ...module,
                  assignments: filteredAssignments,
                };
              }

              return acc;
            },
            {}
          );

          if (Object.keys(filteredModules).length > 0) {
            acc[courseId] = {
              ...course,
              modules: filteredModules,
            };
          }

          return acc;
        },
        {}
      );

      if (Object.keys(filteredCourses).length > 0) {
        acc[programId] = {
          ...program,
          courses: filteredCourses,
        };
      }

      return acc;
    },
    {}
  );

  return (
    <div className="tw-overflow-x-auto">
      <table className="tw-w-full tw-border-collapse tw-border tw-border-[#BDBDBD]">
        <thead className="tw-bg-[#FFDF9B]">
          <tr>
            <th className="tw-py-4 tw-px-4 tw-w-1/9 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Program ID
            </th>
            <th className="tw-py-4 tw-px-4 tw-w-1/7 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Program Name
            </th>
            <th className="tw-py-4 tw-px-4 tw-w-1/7 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Courses Name
            </th>
            <th className="tw-py-4 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Modules
            </th>
            <th className="tw-py-4 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Assignments
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(filteredPrograms).map(([programId, program]) =>
            Object.entries(program.courses).map(([, course], courseIndex) =>
              Object.entries(course.modules).map(([, module], moduleIndex) => (
                <tr
                  key={`${programId}-${courseIndex}-${moduleIndex}`}
                  className="tw-border-b tw-border-[#BDBDBD] tw-bg-white"
                >
                  {courseIndex === 0 && moduleIndex === 0 && (
                    <>
                      <td
                        rowSpan={Object.values(program.courses).reduce(
                          (sum, c) => sum + Object.values(c.modules).length,
                          0
                        )}
                        className={`tw-border tw-px-4 tw-py-4 tw-text-gray-700 tw-font-montserrat tw-font-medium tw-text-sm tw-text-left ${cellNowrapClasses}`}
                      >
                        {program.givenProgramId}
                      </td>
                      <td
                        rowSpan={Object.values(program.courses).reduce(
                          (sum, c) => sum + Object.values(c.modules).length,
                          0
                        )}
                        className={`tw-border tw-px-4 tw-py-4 tw-text-primary tw-font-montserrat tw-font-medium tw-text-sm tw-text-left ${cellNowrapClasses}`}
                      >
                        {program.programName}
                      </td>
                    </>
                  )}
                  {moduleIndex === 0 && (
                    <td
                      rowSpan={Object.values(course.modules).length}
                      className={`tw-border tw-px-4 tw-py-4 tw-text-primary tw-font-montserrat tw-font-medium tw-text-sm tw-text-left ${cellNowrapClasses}`}
                    >
                      {course.courseName}
                    </td>
                  )}
                  <td
                    className={`tw-border tw-px-4 tw-py-4 tw-text-gray-700 tw-font-montserrat tw-font-medium tw-text-sm tw-text-left ${cellNowrapClasses}`}
                  >
                    {module.moduleName}
                  </td>
                  <td
                    className={`tw-border tw-px-4 tw-py-4 tw-text-left tw-text-gray-700 ${cellNowrapClasses}`}
                  >
                    {module.assignments.map((assignment, assignmentIndex) => (
                      <div
                        key={assignmentIndex}
                        className={`tw-font-montserrat tw-text-sm tw-cursor-pointer tw-font-medium tw-text-gray-700 tw-my-2 ${cellNowrapClasses}`}
                      >
                        <Link to={`/submissions/${assignment.assignmentId}`}>
                          {assignment.moduleSectionName + " "}
                          <span
                            className={`tw-text-primary tw-font-montserrat tw-font-bold tw-text-sm ${cellNowrapClasses}`}
                          >
                            (Submissions: {assignment.submissionCount})
                          </span>
                        </Link>
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

interface CourseTableProps {
  searchQuery: string;
  groupedCourses: Record<string, Course>;
}

const CourseTable: React.FC<CourseTableProps> = ({
  searchQuery,
  groupedCourses,
}) => {
  const filteredCourses = Object.entries(groupedCourses).reduce(
    (acc: Record<string, Course>, [courseId, course]) => {
      if (
        (course.courseName || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        Object.entries(course.modules).some(
          ([, module]) =>
            (module.moduleName || "")
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            module.assignments.some((assignment) =>
              (assignment.moduleSectionName || "")
                .toLowerCase()
                .includes(searchQuery.toLowerCase())
            )
        )
      ) {
        acc[courseId] = course;
      }
      return acc;
    },
    {}
  );

  return (
    <div className="tw-overflow-x-auto">
      <table className="tw-w-full tw-border-collapse tw-border tw-border-[#BDBDBD]">
        <thead className="tw-bg-[#FFDF9B]">
          <tr>
            <th className="tw-py-3 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Course ID
              </th>
            <th className="tw-py-3 tw-w-1/6 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Course Name
            </th>
            <th className="tw-py-3 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Modules
            </th>
            <th className="tw-py-3 tw-px-4 tw-text-black tw-font-montserrat tw-text-sm tw-font-semibold">
              Assignments
            </th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(filteredCourses).map(([courseId, course]) =>
            Object.entries(course.modules).map(
              ([moduleId, module], moduleIndex) => (
                <tr
                  key={`${courseId}-${moduleId}`}
                  className="tw-border-b tw-border-[#BDBDBD] tw-bg-white"
                >
                  {moduleIndex === 0 && (
                    <>
                      <td
                        rowSpan={Object.keys(course.modules).length}
                        className={`tw-border tw-px-4 tw-py-2 tw-text-gray-700 tw-font-medium tw-font-montserrat tw-text-sm tw-text-left ${cellNowrapClasses}`}
                      >
                        {course.givenCourseId}
                      </td>
                      <td
                        rowSpan={Object.keys(course.modules).length}
                        className={`tw-border tw-px-4 tw-py-2 tw-text-primary tw-font-montserrat tw-font-medium tw-text-sm tw-text-left ${cellNowrapClasses}`}
                      >
                        {course.courseName}
                      </td>
                    </>
                  )}
                  <td
                    className={`tw-border tw-px-4 tw-py-2 tw-text-gray-700 tw-font-montserrat tw-text-sm tw-font-medium tw-text-left ${cellNowrapClasses}`}
                  >
                    {module.moduleName}
                  </td>
                  <td
                    className={`tw-border tw-px-4 tw-py-2 tw-text-left tw-text-gray-700 ${cellNowrapClasses}`}
                  >
                    {module.assignments.map((assignment, assignmentIndex) => (
                      <div
                        key={assignmentIndex}
                        className={`tw-font-montserrat tw-text-sm tw-font-medium tw-my-2 ${cellNowrapClasses}`}
                      >
                        <Link to={`/submissions/${assignment.assignmentId}`}>
                          {assignment.moduleSectionName + " "}
                          <span
                            className={`tw-text-primary tw-font-montserrat tw-font-semibold tw-text-sm ${cellNowrapClasses}`}
                          >
                            (Submissions: {assignment.submissionCount})
                          </span>
                        </Link>
                      </div>
                    ))}
                  </td>
                </tr>
              )
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

const Submissions: React.FC = () => {
  const [showProgramsTable, setShowProgramsTable] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchInput, 1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [organizationsMap, setOrganizations] = useState([]);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(""); // Initially empty
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const page = 1;
  const limit = 200;

  const { data: organizationsData, isSuccess } = useQuery({
    queryKey: ["organizations", page, limit],
    queryFn: () => fetchOrganizations(page, limit),
    staleTime: 5000,
  });

  const organizationsPartial =
    organizationsData?.results.map((org: Organization) => ({
      value: org.id,
      label: org.name,
    })) || [];

  useEffect(() => {
    if (isSuccess && organizationsPartial) {
      setOrganizations(organizationsPartial);
    }
  }, [organizationsPartial, isSuccess]);

  const {
    data: data,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "assignmentsData",
      showProgramsTable,
      currentPage,
      debouncedSearchTerm,
      orgId,
    ],
    queryFn: () =>
      fetchData(showProgramsTable, currentPage, debouncedSearchTerm, orgId),
    staleTime: 5000,
  });

  useEffect(() => {
    refetch();
  }, [orgId, showProgramsTable, currentPage, debouncedSearchTerm, refetch]);

  const handleAllCoursesClick = () => {
    setShowProgramsTable(false);
    setSearchInput("");
    setCurrentPage(1);
  };

  const handleProgramsClick = () => {
    setShowProgramsTable(true);
    setSearchInput("");
    setCurrentPage(1);
  };

  if (isLoading) {
    return <Loader2 className="tw-h-8 tw-w-8 tw-spin" />;
  }

  if (error || !data) {
    console.error("Error fetching data:", error);
    return <div>Error loading data</div>;
  }

  const groupedCourses = groupCourses(data.results);
  const groupedAssignments = groupAssignments(data.results);
  const totalPages = Math.ceil(data.total / 10);
  const hasMore = data.hasMore;

  return (
    <>
      <div className="tw-flex tw-justify-between tw-items-center tw-mb-6">
        <div className="tw-flex tw-items-center tw-space-x-2">
          <Button
            className={`tw-rounded-md tw-border tw-border-primary ${
              !showProgramsTable
                ? "tw-bg-secondary hover:tw-bg-secondary"
                : "tw-bg-white"
            }`}
            variant="secondary"
            onClick={handleAllCoursesClick}
          >
            <span className="tw-font-montserrat tw-text-primary tw-text-sm">
              All Courses
            </span>
          </Button>
          <Button
            className={`tw-rounded-md tw-border tw-border-primary ${
              showProgramsTable
                ? "tw-bg-secondary tw-text-primary hover:tw-bg-secondary"
                : "tw-bg-white"
            }`}
            variant="secondary"
            onClick={handleProgramsClick}
          >
            <span className="tw-font-montserrat tw-text-primary tw-text-sm">
              All Programs
            </span>
          </Button>
          <div className="tw-relative">
            <Input
              className="placeholder:tw-text-sm !tw-ring-[-2] placeholder:tw-text-primary tw-border-primary !tw-bg-[#FFFFFF] !tw-pl-8"
              type="text"
              placeholder={
                showProgramsTable ? "Search Programs" : "Search Courses"
              }
              onChange={(e) => setSearchInput(e.target.value.trimStart())}
              value={searchInput}
            />
            <Search className="tw-absolute tw-w-4 tw-h-4 tw-left-2 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-text-gray-400" />
          </div>
          <div className="tw-relative tw-mt-0">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="tw-text-sm tw-justify-between tw-bg-white tw-text-primary"
                >
                  {label || "Select Organization..."}
                  <ChevronsUpDown className="tw-ml-2 tw-h-3 tw-w-3 tw-opacity-90" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="tw-w-[200px] tw-p-0 tw-bg-white tw-text-black">
                <Command>
                  <CommandInput
                    placeholder="Search..."
                    className="tw-bg-white tw-text-gray-400"
                  />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        key="no-org"
                        value="Don't filter by org"
                        onSelect={() => {
                          setOrgId(undefined);
                          setLabel("Don't filter by org");
                          setOpen(false);
                        }}
                        className="tw-text-gray-400"
                      >
                        Don't filter by org
                      </CommandItem>
                      {organizationsMap.map((organization) => (
                        <CommandItem
                          key={organization.value}
                          value={organization.label}
                          onSelect={(currentValue) => {
                            setOrgId(organization.value);
                            setLabel(currentValue);
                            setOpen(false);
                          }}
                        >
                          {organization.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="tw-flex tw-items-center">
          {label && (
            <Button
              className="tw-w-64.2 tw-h-11 !tw-rounded-full tw-border !tw-py-2 tw-px-4 !tw-bg-[#FFB384]"
              variant="destructive"
            >
              <span className="tw-font-montserrat tw-text-sm tw-text-[#333333]">
                Organization Name: <span className="tw-font-bold">{label}</span>
              </span>
            </Button>
          )}
        </div>
      </div>
      {showProgramsTable ? (
        <ProgramTable
          searchQuery={debouncedSearchTerm}
          groupedAssignments={groupedAssignments}
        />
      ) : (
        <CourseTable
          searchQuery={debouncedSearchTerm}
          groupedCourses={groupedCourses}
        />
      )}
      <div className="tw-flex tw-justify-between tw-items-center tw-my-4">
        <div className="tw-text-gray-700 tw-w-16 tw-h-8 tw-flex tw-items-center">
          <span className="tw-mr-2">Page</span>
          {currentPage}
        </div>
        <div className="tw-flex tw-items-center">
          <Pagination className="tw-flex">
            <PaginationContent className="tw-flex tw-items-center tw-justify-center">
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="tw-mr-4"
              >
                Previous
              </PaginationPrevious>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <PaginationItem
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`tw-px-2 tw-py-1 tw-mx-1 ${
                      page === currentPage
                        ? "tw-bg-primary tw-text-white"
                        : "tw-bg-white tw-text-gray-700"
                    }`}
                  >
                    {page}
                  </PaginationItem>
                )
              )}
              <PaginationNext
                onClick={() =>
                  setCurrentPage((prev) => (hasMore ? prev + 1 : prev))
                }
                disabled={!hasMore}
                className="tw-ml-4"
              >
                Next
              </PaginationNext>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </>
  );
};

export default Submissions;
