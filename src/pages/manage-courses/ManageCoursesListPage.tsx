import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@tanstack/react-router";
import { Copy, Eye, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";
import DragandDrop from "../students/DragandDrop";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";
import { format } from 'date-fns';

const fetchCourses = async (page, limit, filters, sorts) => {
  try {
    const url = `/courses?includeModuleCount=true&includeModules=true&markDangling=true`;
    const params = { page, limit };

    if (filters && filters.length > 0) {
      filters.forEach((filter, index) => {
        params[`filters[${index}][field]`] = filter.field;
        params[`filters[${index}][searchType]`] = filter.searchType;
        params[`filters[${index}][searchKey]`] = filter.searchKey;
      });
    }

    if (sorts && sorts.length > 0) {
      sorts.forEach((sort, index) => {
        params[`sorts[${index}][field]`] = sort.field;
        params[`sorts[${index}][order]`] = sort.order;
      });
    }

    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching courses:", error);
    throw error;
  }
};
const filterMatchTypes: Record<string, string> = {
  EXACT_MATCH: "Equals to",
  STARTS_WITH: "Starts with",
  CONTAINS: "Contains",
};

const filterTypes: Record<string, string> = {
  name: "Name",
  givenCourseId: "Course ID",
};


const CoursesListPage = () => {
  const [filterType, setFilterType] = useState("name");
  const [filterMatchType, setFilterMatchType] = useState("CONTAINS");
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { permissionSet } = usePolicies();
  const canEditCourse = checkActionScopes(permissionSet, "course:write", ["admin","supervisor","organization"]);

  const [openComponent, setOpenComponent] = useState<"programs" | "courses" | "students" | null>(null);


  const userInSinglePage = 10;
  const debouncedSearch = useDebouncedCallback((value) => {
    setFilterSearchKey(value);
  }, 1000);

  const filters = filterSearchKey
  ? [
      {
        field: filterType,
        searchType: filterMatchType,
        searchKey: filterSearchKey,
      },
    ]
  : [];

  const sorts = [{ field: "name", order: "ASC" }];

  const { data, error,isLoading } = useQuery({
    queryKey: [
      "courses",
      currentPage,
      userInSinglePage,
      filterSearchKey,
      filterType,
      filterMatchType,
    ],
    queryFn: () => fetchCourses(currentPage, userInSinglePage, filters, sorts),
    staleTime: 5000,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearchKey, filterType, filterMatchType]);

  useEffect(() => {
    if (data?.hasMore) {
      const nextPageFilters = filterSearchKey
        ? [
            {
              field: filterType,
              searchType: filterMatchType,
              searchKey: filterSearchKey,
            },
          ]
        : [];

      queryClient.prefetchQuery({
        queryKey: [
          "courses",
          currentPage + 1,
          userInSinglePage,
          filterSearchKey,
          filterType,
          filterMatchType,
        ],
        queryFn: () => fetchCourses(currentPage + 1, userInSinglePage, nextPageFilters, sorts),
      });
    }
  }, [data, currentPage, userInSinglePage, queryClient, filterSearchKey, filterType, filterMatchType]);


  if (error) {
    return <ErrorMessage />;
  }

  const courses = data?.results || [];
  const hasMore = data?.hasMore || false;

  const handleOpenComponent = (type: "programs" | "courses" | "students") => {
    setOpenComponent(type);
  };


  return (
    <>
      {/* Filter Section */}
      <div className="tw-flex tw-justify-between tw-my-3">
        <div className="tw-flex tw-gap-4 tw-items-center tw-text-xl">
          <div className="tw-w-36">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="tw-flex tw-h-8 tw-px-2 tw-py-2 tw-w-full tw-border-primary tw-items-center tw-justify-between tw-bg-white ">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
              <SelectGroup>
                  {Object.entries(filterTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="tw-w-36">
            <Select value={filterMatchType} onValueChange={setFilterMatchType}>
              <SelectTrigger className="tw-flex tw-h-8 tw-px-2 tw-w-full tw-py-2 tw-border-primary tw-items-center tw-justify-between tw-rounded-md tw-border tw-bg-white tw-text-sm">
                <SelectValue placeholder="Contains" />
              </SelectTrigger>
              <SelectContent>
              <SelectGroup>
                  {Object.entries(filterMatchTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="tw-w-44">
            <Input
              type="text"
              className="tw-h-8 tw-w-full tw-px-2 tw-py-1 tw-rounded-md tw-border tw-border-primary tw-bg-white tw-opacity-100"
              placeholder="Write..."
              defaultValue={filterSearchKey}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="tw-flex  tw-items-center">
          {canEditCourse && 
          <Link to="/manage-courses/add">
            <Button variant="default"  className=" tw-rounded-lg tw-h-8">
              <span className="">+ </span>
              Add Course
            </Button>
          </Link>
          }
        </div>
      </div>

      {/* Table Section */}
      <Table className="tw-bg-white tw-shadow-sm tw-p-4 tw-w-full tw-gap-0 tw-opacity-100">
      {isLoading ? (
          <>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 7 }).map((_, index) => (
                  <TableHead key={index} className="tw-px-4 tw-py-2">
                    <Skeleton className="tw-h-6 tw-w-32" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index} className="tw-h-18">
                  {Array.from({ length: 7 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="tw-h-4 tw-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : error ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                <ErrorMessage />
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (  
        <>
          <TableHeader>
            <TableRow>
              <TableHead className="tw-px-4 tw-py-2">Course ID</TableHead>
              <TableHead className="tw-px-4 tw-py-2">Course Name</TableHead>
              <TableHead className="tw-px-4 tw-py-2 tw-text-center">No.Of Modules</TableHead>
              <TableHead className="tw-px-4 tw-py-2 tw-text-start">Date Created</TableHead>
              <TableHead className="tw-px-4 tw-py-2 tw-text-start">Status</TableHead>
              {canEditCourse && <TableHead className="tw-px-4 tw-py-2 tw-text-center">Add Student</TableHead>}
              <TableHead className="tw-px-4 tw-py-2">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tw-bg-[#ffffff]">
              {courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                    No courses found
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.courseId} className="tw-h-18">
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {course.givenCourseId}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {course.name}
                    </TableCell>
                    <TableCell className=" tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-semibold tw-text-sm tw-text-center ">
                     {course.moduleCount}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-semibold tw-text-sm tw-text-start">
                    {format(new Date(course.createdAt), "do MMM yyyy")}
                     </TableCell>
                    <TableCell
                      className={`tw-px-4 tw-py-2 tw-font-medium tw-text-sm tw-text-start ${
                        course.isActive ? "tw-text-green-500" : "tw-text-red-500"
                      }`}
                    >
                      {course.isActive ? "Active" : "Inactive"}
                    </TableCell>
                {canEditCourse &&
                <TableCell className="tw-pb-2 tw-pt-4 tw-font-semibold tw-text-primary tw-text-sm tw-text-center">
                  {course?.isDangling ? (
                    <AlertDialog>
                      <AlertDialogTrigger onClick={() => handleOpenComponent("students")}>Add</AlertDialogTrigger>
                      <AlertDialogContent className='!tw-bg-white tw-rounded-sm !tw-w-[910px] !tw-max-w-none tw-h-50%'>
                        <AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="tw-h-15 tw-w-15">
                              <X className="tw-w-4 tw-h-4" />
                            </AlertDialogCancel>
                          </AlertDialogFooter>
                          <AlertDialogTitle></AlertDialogTitle> 
                          <AlertDialogDescription>
                           {openComponent && (
                            <DragandDrop courseId={course.courseId}type={openComponent} />)}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="tw-text-gray-400 tw-cursor-not-allowed">Add</TooltipTrigger>
                        <TooltipContent>
                          <p>Student assignment is managed through the program for courses within a program</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                }
                <TableCell className="tw-px-8 tw-py-2 ">
                    <div className="tw-flex">
                        {canEditCourse ? (<>
                          <Link to={`/manage-courses/${course.courseId}`} >
                            <Pencil className="tw-w-4 tw-h-4" />
                          </Link>
                          {/* <Link>
                              <Copy />
                          </Link> */}
                        </>):(<>
                          <Link to={`/all/courses/${course.courseId}`} >
                            <Eye className="tw-w-4 tw-h-4 tw-ml-4" />
                          </Link>
                        </>)}
                    </div>
                </TableCell>
              </TableRow>
             ))
            )}
      </TableBody>
      </>
       )}
    </Table>
      
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
    </>
  );
};

export default CoursesListPage;
