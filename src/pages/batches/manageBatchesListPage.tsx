import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Loader2, Search, ChevronsUpDown, Eye } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
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
import { useDebouncedCallback } from "use-debounce";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface Batch {
  mentorName: string;
  studentCount: number;
  name: string;
  status: string;
  orgId: string;
  orgName: string;
  batchId: string;
  semesterId: string;
}

interface Organization {
  id: string;
  name: string;
}

interface Group {
  organization: string;
  batches: {
    batchId: string;
    name: string;
    totalStudents: number;
    status: string;
    mentor: string;
    orgId: string;
    orgName: string;
    semesterId: string;
  }[];
}

const fetchBatches = async (
  orgId: string | undefined,
  page: number,
  filterSearchKey: string
) => {
  const filters = [];

  // Apply the orgId filter if present
  if (orgId) {
    filters.push({
      searchKey: orgId,
      searchType: "EXACT_MATCH",
      field: "orgId",
    });
  }
  // Apply the filterSearchKey filter if orgId is not present and searchKey exists
  if (filterSearchKey && filterSearchKey.length > 0) {
    filters.push({
      searchKey: filterSearchKey,
      searchType: "CONTAINS",
      field: "name",
    });
  }

  const params = {
    page,
    limit: 10,
    includeStudentCount: true,
    ...(filters.length > 0 && { filters }),
  };

  const { data } = await api.get(`/batches`, { params });
  return data;
};

const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit },
  });
  return data;
};
const groupByOrganization = (batches: Batch[]): { [key: string]: Group } => {
  return batches.reduce(
    (acc, batch) => {
      if (!acc[batch.orgId]) {
        acc[batch.orgId] = {
          organization: batch.orgName,
          batches: [],
        };
      }
      acc[batch.orgId].batches.push({
        batchId: batch.batchId,
        name: batch.name,
        totalStudents: batch.studentCount,
        status: batch.status || "Active",
        mentor: batch.mentorName,
        orgId: batch.orgId,
        orgName: batch.orgName,
        semesterId: batch.semesterId,
      });
      return acc;
    },
    {} as { [key: string]: Group }
  );
};

const ManageBatchesListPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const page = 1;
  const limit = 200;
  const { permissionSet } = usePolicies();
  const canEditBatch = checkActionScopes(permissionSet, "batch:write", ["admin","supervisor","organization"]);
  const canViewBatch = checkActionScopes(permissionSet, "batch:read", ["self","admin","organization","supervisor"]);

  const debouncedSearch = useDebouncedCallback((value) => {
    setFilterSearchKey(value);
  }, 1000);
  const {
    data: batchesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["batches", orgId, currentPage, filterSearchKey],
    queryFn: () => fetchBatches(orgId, currentPage, filterSearchKey),
    staleTime: 5000,
  });

  useEffect(() => {
    refetch();
  }, [orgId, filterSearchKey, refetch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearchKey]);

  const { data: organizations } = useQuery({
    queryKey: ["organizations", page, limit],
    queryFn: () => fetchOrganizations(page, limit),
    staleTime: 5000,
  });
  const organizationsPartial =
    organizations?.results.map((org: Organization) => ({
      value: org.id,
      label: org.name,
    })) || [];

  const groupedBatches = batchesData?.results
    ? groupByOrganization(batchesData?.results)
    : {};
  // const totalPages = batchesData ? Math.ceil(batchesData.total / 10) : 1;
  const hasMore = batchesData?.hasMore;

  return (
    <>
      <div className="tw-flex tw-justify-between tw-my-3">
        <div className="tw-flex tw-gap-4 tw-items-center tw-text-l">
          <div className="tw-relative tw-w-auto">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={`tw-w-[200px] tw-h-8 tw-justify-between tw-bg-white `}
                >
                  {label || "Select Organization..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="tw-w-[200px] p-0 bg-white text-black">
                <Command>
                  <CommandInput
                    placeholder="Search..."
                    className="bg-white text-black"
                  />
                  <CommandList>
                    <CommandEmpty>No organization found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        key="no-org"
                        value="Don't filter by org"
                        onSelect={() => {
                          setOrgId(undefined); // or null, depending on how you handle this
                          setLabel("Don't filter by org");
                          setOpen(false);
                        }}
                        className="tw-text-gray-400" // Apply gray color
                      >
                        Don't filter by org
                      </CommandItem>

                      {organizationsPartial?.map((organization) => (
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
          <div className="tw-relative tw-w-60">
            <Input
              type="text"
              className="tw-w-full tw-h-8 tw-px-8 tw-py-2 tw-text-sm tw-border tw-border-primary tw-bg-white tw-rounded-md"
              placeholder="Search Batch Name"
              defaultValue={filterSearchKey}
              onChange={(e) => debouncedSearch(e.target.value)}
            />
            <Search className="tw-absolute tw-h-5 tw-left-2 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-text-gray-400" />
          </div>
        </div>
        <Link to="/batches/manage">
        {canEditBatch &&
          <Button className="tw-h-8 tw-bg-primary tw-rounded-md tw-text-white" >
            + Create Batches
          </Button>
        }
        </Link>
      </div>

      <Table className="tw-bg-white tw-shadow-sm tw-w-full">
        <TableHeader>
          <TableRow className="tw-bg-[#FFDF9B]">
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Organizations
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Batches
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Total Students
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Status
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Mentors
            </TableHead>
            {canEditBatch &&
              <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
                View Student
              </TableHead>
            }
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-center">
              Edit
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="tw-text-center">
                <Loader2 className="tw-h-8 tw-w-8 tw-spin" />
              </TableCell>
            </TableRow>
          ) : (
            Object.values(groupedBatches).map((group, i) =>
              group.batches.map((batch, j) => (
                <TableRow
                  key={`${group.organization}-${batch.name}`}
                  className="tw-h-16"
                >
                  {j === 0 && (
                    <TableCell
                      rowSpan={group.batches.length}
                      className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-border tw-text-center"
                    >
                      {group.organization}
                    </TableCell>
                  )}
                  <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-center tw-text-gray-700 tw-border">
                    {batch.name}
                  </TableCell>
                  <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-center tw-text-gray-700 tw-border">
                    {batch.totalStudents}
                  </TableCell>
                  <TableCell
                    className={`tw-px-4 tw-py-2 tw-font-medium tw-border tw-text-center tw-text-xs ${
                      batch.status === "Active"
                        ? "tw-text-green-500"
                        : "tw-text-red-500"
                    }`}
                  >
                    {batch.status}
                  </TableCell>
                  <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-center tw-text-gray-700 tw-border">
                    {batch.mentor}
                  </TableCell>
                  {canEditBatch &&
                    <TableCell className="tw-px-4 tw-py-2 tw-font-semibold tw-text-center tw-text-primary tw-cursor-pointer tw-border">
                      <Link to={`/batches/${batch.batchId}/students`}>View</Link>
                    </TableCell>
                  }
                  <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-center tw-cursor-pointer tw-border">
                    {canEditBatch ? (
                    <Link to={`/batches/manage?semesterId=${batch.semesterId}`} disabled={!canEditBatch}>
                      <Pencil className="tw-h-5" />
                    </Link>
                    ): (
                      <>
                      <Link to={`/batches/manage?semesterId=${batch.semesterId}`}>
                        <Eye />
                      </Link>
                      </>
                    )  
                  }
                  </TableCell>
                </TableRow>
              ))
            )
          )}
        </TableBody>
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
};
export default ManageBatchesListPage;
