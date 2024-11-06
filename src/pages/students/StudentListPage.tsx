import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Eye } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, UseQueryResult  } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebouncedCallback } from "use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface Organization {
  id: string;
  name: string;
  givenOrgId: string;
  state: string;
  address: string;
  pincode: string;
  email: string;
  isActive: boolean;
  contactPhoneNumber: {
    number: string;
    countryCode: string;
  };
}

const filterMatchTypes: Record<string, string> = {
  EXACT_MATCH: "Equals to",
  STARTS_WITH: "Starts with",
  CONTAINS: "Contains",
};

const filterTypes: Record<string, string> = {
  name: "Name",
  givenStudentId: "Student ID",
  email: "Email",
  orgName: "Organization",
};

const fetchStudents = async (page, limit, filters, sorts) => {
  try {
    const url = `/students?includeMentor=true&includeBatch=true`;
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
    console.error("Error fetching students:", error);
    throw error;
  }
};

const fetchOrganization = async (orgId: string): Promise<Organization | null> => {
  if (!orgId) return null;
  try {
    const response = await api.get<Organization>(`/organizations/${orgId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching organization ${orgId}:`, error);
    return null;
  }
};

function StudentListPage() {
  const [filterType, setFilterType] = useState("name");
  const [filterMatchType, setFilterMatchType] = useState("CONTAINS");
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  const { permissionSet } = usePolicies();
  const canEditStudents = checkActionScopes(permissionSet, "student:write", ["admin","supervisor"]);
  const canCreateStudents = checkActionScopes(permissionSet, "student:write", ["admin"]);
  const queryClient = useQueryClient();

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

  const { data, error, isLoading } = useQuery({
    queryKey: [
      "students",
      currentPage,
      limit,
      filterSearchKey,
      filterType,
      filterMatchType,
    ],
    queryFn: () => fetchStudents(currentPage, limit, filters, sorts),
    staleTime: 5000,
  });

  const students = data?.results || [];
  const hasMore = data?.hasMore || false;

  const organizationQueries = useQueries({
    queries: students.map((student) => ({
      queryKey: ['organization', student.orgId],
      queryFn: () => fetchOrganization(student.orgId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    })),
  }) as UseQueryResult<Organization | null, unknown>[];

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearchKey, filterType, filterMatchType]);

  useEffect(() => {
    if (hasMore) {
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
          "students",
          currentPage + 1,
          limit,
          filterSearchKey,
          filterType,
          filterMatchType,
        ],
        queryFn: () => fetchStudents(currentPage + 1, limit, nextPageFilters, sorts),
      });
    }
  }, [data, currentPage, limit, queryClient, filterSearchKey, filterType, filterMatchType, hasMore]);


  return (
    <>
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
        {canCreateStudents &&
          <div className="tw-flex tw-gap-4 tw-items-center">
            <Link to="/" className="tw-text-primary tw-underline hover:tw-underline">
              Data Import/Export
            </Link>
            <Link to="/students/add">
              <Button variant="default" className="tw-w-full tw-h-8 hover:tw-bg-primary/360">
                <span className="tw-text-lg">+</span>
                <span className="tw-font-montserrat tw-text-xs tw-font-medium tw-leading-3 tw-text-left">
                  Add Student
                </span>
              </Button>
            </Link>
          </div>
        }
      </div>
      <Table className="tw-bg-white tw-shadow-sm tw-p-4 tw-w-full tw-gap-0 tw-opacity-100">
        {isLoading ? (
          <>
            <TableHeader>
              <TableRow className="tw-bg-[#FFDF9B]">
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
              <TableRow className="tw-bg-[#FFDF9B]">
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Student ID</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Name</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Email Address</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Mentor</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Organization</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Status</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tw-bg-[#ffffff]">
              {students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => {
                  const orgQuery = organizationQueries[index];
                  const orgName = (orgQuery.data as Organization | null)?.name || "Loading...";

                  return (
                    <TableRow key={student.studentId} className="tw-h-18">
                      <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                        {student.givenStudentId}
                      </TableCell>
                      <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                        {student.name}
                      </TableCell>
                      <TableCell className="tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-medium tw-text-sm">
                        {student.email}
                      </TableCell>
                      <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                        {student.mentorName}
                      </TableCell>
                      <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                        {orgQuery.isLoading ? (
                          <Skeleton className="tw-h-4 tw-w-24" />
                        ) : orgQuery.isError ? (
                          "Error loading"
                        ) : (
                          orgName
                        )}
                      </TableCell>
                      <TableCell
                        className={`tw-px-4 tw-py-2 tw-font-medium tw-text-sm ${
                          student.isActive ? "tw-text-green-500" : "tw-text-red-500"
                        }`}
                      >
                        {student.isActive ? "Active" : "Inactive"}
                      </TableCell>
                      <TableCell className="tw-px-4 tw-py-2">
                        <Link to={`/students/${student.studentId}`}>
                          {canEditStudents ?
                            <Pencil className="tw-ml-2 tw-h-5" />
                            : <Eye className="tw-ml-2 tw-h-5" />
                          }
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
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
}

export default StudentListPage;