import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Pencil } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "use-debounce";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  // PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

function formatPhoneNumber(rawNumber, countryCode) {
  try {
    const phoneNumber = parsePhoneNumberFromString(rawNumber, countryCode);
    if (phoneNumber) {
      return phoneNumber.format("E.164");
    }
  } catch (error) {
    console.error("Error formatting phone number:", error);
  }
  return rawNumber; // Fallback to raw number if formatting fails
}

//filters

const filterMatchTypes: Record<string, string> = {
  EXACT_MATCH: "Equals to",
  STARTS_WITH: "Starts with",
  CONTAINS: "Contains",
};

const filterTypes: Record<string, string> = {
  name: "Name",
  organization: "Organization",
  role: "Role",
  isActive: "Status",
  givenUserId: "User ID",
};

const fetchUsers = async (page, limit, filters, sorts) => {
  try {
    const url = `/users`;
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
    console.error("Error fetching users:", error);
    throw error;
  }
};

function UserListPage() {
  const [filterType, setFilterType] = useState("name");
  const [filterMatchType, setFilterMatchType] = useState("CONTAINS");
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const { permissionSet } = usePolicies();
  const canEditUsers = checkActionScopes(permissionSet, "user:write", ["admin"]);
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

  const sorts = [
    { field: "name", order: "ASC" },
    { field: "joiningDate", order: "DESC" },
  ];

  const { data, error, isLoading } = useQuery({
    queryKey: [
      "users",
      currentPage,
      pageSize,
      filterSearchKey,
      filterType,
      filterMatchType,
    ],
    queryFn: () => fetchUsers(currentPage, pageSize, filters, sorts),
    staleTime: 5000,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearchKey, filterType, filterMatchType]);

  // Prefetch the next page's data in the background
  useEffect(() => {
    if (data?.hasMore) {
      const filters = filterSearchKey
        ? [
            {
              field: filterType,
              searchType: filterMatchType,
              searchKey: filterSearchKey,
            },
          ]
        : [];

      const sorts = [
        { field: "name", order: "ASC" },
        { field: "joiningDate", order: "DESC" },
      ];
      queryClient.prefetchQuery({
        queryKey: [
          "users",
          currentPage + 1,
          pageSize,
          filterSearchKey,
          filterType,
          filterMatchType,
        ],
        queryFn: () => fetchUsers(currentPage + 1, pageSize, filters, sorts),
      });
    }
  }, [
    data,
    currentPage,
    pageSize,
    queryClient,
    filterSearchKey,
    filterType,
    filterMatchType,
  ]);


  // Display error message if an error occurs during data fetching
  if (error) {
    return <ErrorMessage />;
  }

  const users = data?.results || [];
  const hasMore = data?.hasMore || false;

  return (
    <>
      <div className="tw-flex tw-justify-between tw-items-center tw-my-3">
        <div className="tw-flex tw-gap-4 tw-items-center tw-text-xl">
          <div className="tw-w-36">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="tw-flex tw-h-8 tw-px-2 tw-py-2 tw-w-full tw-border-primary tw-items-center tw-justify-between tw-bg-white ">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(filterTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="tw-w-36">
            <Select
              value={filterMatchType}
              onValueChange={(value) => setFilterMatchType(value)}
            >
              <SelectTrigger className="tw-flex tw-h-8 tw-px-2 tw-w-full tw-py-2 tw-border-primary tw-items-center tw-justify-between tw-rounded-md tw-border tw-bg-white tw-text-sm">
                <SelectValue placeholder="Contains" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(filterMatchTypes).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
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
        {
          canEditUsers &&
          <div className="tw-flex tw-gap-4 tw-items-center">
            <Link
              to="/"
              className="tw-text-primary tw-underline hover:tw-underline"
            >
              Data Import/Export
            </Link>
            <Link to="/users/add">
              <Button variant="default" className="">
                <span className="tw-text-lg">+</span>
                <span className="tw-text-base tw-font-medium tw-leading-3 tw-text-left">
                  Add User
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
              {Array.from({ length: 20 }).map((_, index) => (
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
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Full Name</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Email Address</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Contact</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Organization</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Roles</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Status</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tw-bg-[#ffffff]">
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} className="tw-h-18">
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      <span>{user.name}</span>
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {formatPhoneNumber(
                        user.contactPhoneNumber.number,
                        user.contactPhoneNumber.countryCode
                      )}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700">
                      {user.orgName}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700">
                      {user.roleName}
                    </TableCell>
                    <TableCell
                      className={`tw-px-4 tw-py-2 tw-font-medium tw-text-sm ${
                        user.isActive ? "tw-text-green-500" : "tw-text-red-500"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2">
                      <Link to={`/users/${user.id}`}>
                        {canEditUsers ? 
                          <Pencil className="tw-ml-2 tw-h-5" /> :
                          <Eye className="tw-ml-2 tw-h-5" />
                        }
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </>
        )}
      </Table>

      <div className="tw-flex tw-justify-between tw-items-center tw-h-12 tw-top-102  tw-opacity-100">
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
    </>
  );
}

export default UserListPage;
