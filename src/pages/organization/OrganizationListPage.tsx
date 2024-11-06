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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useDebouncedCallback } from "use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import parsePhoneNumberFromString from "libphonenumber-js";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";


const filterMatchTypes: Record<string, string> = {
  EXACT_MATCH: "Equals to",
  STARTS_WITH: "Starts with",
  CONTAINS: "Contains",
};

const filterTypes: Record<string, string> = {
  name: "Name",
  givenOrgId: "Organization ID",
  email: "Email",
};

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


const fetchOrganizations = async (page, limit, filters, sorts) => {
  try {
    const url = `/organizations`;
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
    console.error("Error fetching organizations:", error);
    throw error;
  }
};

function OrganizationListPage() {
  const [filterType, setFilterType] = useState("name");
  const [filterMatchType, setFilterMatchType] = useState("CONTAINS");
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();
  const { permissionSet } = usePolicies();
  const canEditOrganization = checkActionScopes(
    permissionSet, "organization:write", ["admin","organization","supervisor","program"]
  );

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
      "organizations",
      currentPage,
      pageSize,
      filterSearchKey,
      filterType,
      filterMatchType,
    ],
    queryFn: () => fetchOrganizations(currentPage, pageSize, filters, sorts),
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
          "organizations",
          currentPage + 1,
          pageSize,
          filterSearchKey,
          filterType,
          filterMatchType,
        ],
        queryFn: () => fetchOrganizations(currentPage + 1, pageSize, nextPageFilters, sorts),
      });
    }
  }, [data, currentPage, pageSize, queryClient, filterSearchKey, filterType, filterMatchType]);


  if (error) {
    return <ErrorMessage />;
  }

  const organizations = data?.results || [];
  const hasMore = data?.hasMore || false;

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
        {canEditOrganization && 
          <div className="tw-flex tw-gap-4 tw-items-center">
            <Link to="/" className="tw-text-primary tw-underline hover:tw-underline">
              Data Import/Export
            </Link>
            <Link to="/organization/add">
              <Button variant="default" className="tw-w-full tw-h-8 hover:tw-bg-primary/360">
                <span className="tw-text-lg">+</span>
                <span className="tw-font-montserrat tw-text-xs tw-font-medium tw-leading-3 tw-text-left">
                  Add Organisation
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
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Organization</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Organization ID</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Email Address</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Contact</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">State</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Status</TableHead>
                <TableHead className="tw-px-4 tw-py-2 tw-font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tw-bg-[#ffffff]">
              {organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                organizations.map((org) => (
                  <TableRow key={org.id} className="tw-h-18">
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {org.name}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {org.givenOrgId}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-medium tw-text-sm">
                      {org.email}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {formatPhoneNumber(
                        org.contactPhoneNumber.number,
                        org.contactPhoneNumber.countryCode
                      )}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {org.state}
                    </TableCell>
                    <TableCell
                      className={`tw-px-4 tw-py-2 tw-font-medium tw-text-sm ${
                        org.isActive ? "tw-text-green-500" : "tw-text-red-500"
                      }`}
                    >
                      {org.isActive ? "Active" : "Inactive"}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2">
                      <Link to={`/organization/${org.id}`}>
                      {canEditOrganization ?
                        <Pencil className="tw-ml-2 tw-h-5" /> : <Eye className="tw-ml-2 tw-h-5"/>
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

export default OrganizationListPage;