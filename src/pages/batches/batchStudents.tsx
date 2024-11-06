import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from "@/lib/api";
import { useAuthStore } from '@/store/authStore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Pencil, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Link, useParams } from '@tanstack/react-router';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useDebouncedCallback } from 'use-debounce';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import parsePhoneNumberFromString from "libphonenumber-js";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

// API fetch function
const fetchStudentsByBatch = async ({ page, limit, filters, sorts }) => {
  const { data } = await api.get(
    '/students', {
      params: {
        page,
        limit,
        filters,
        sorts,
      }
    }
  );
  return data;
};

const BatchStudents = () => {
  const [page, setPage] = useState(1);
  const { batchId: urlBatchId } = useParams({ from: '/_authenticated/batches/$batchId/students' }) as { batchId: string };
  const { account } = useAuthStore();
  const [filterSearchKey, setFilterSearchKey] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 5;
  const { permissionSet } = usePolicies();
  const canEditBatch = checkActionScopes(permissionSet, "batch:write", ["admin","supervisor","organization"]);

  // Determine the batchId to use and check for invalid scenarios
  const [batchId, error] = (() => {
    if (urlBatchId === 'my') {
      if (account?.accountType !== 'student') {
        return [null, "Access denied. Only students can view their own batch."];
      }
      return [account.student?.batchId || null, null];
    }
    return [urlBatchId, null];
  })();

  // Debounced search for student names
  const debouncedSearch = useDebouncedCallback((value) => {
    setFilterSearchKey(value);
  }, 1000);

  // Debounced search for student status
  const debounceStatusFilter = useDebouncedCallback((value) => {
    setStatusFilter(value);
  }, 100);

  // Filters that depend on the debounced search key
  const filters = [
    { field: 'batchId', searchType: 'EXACT_MATCH', searchKey: batchId }
  ];

  if (filterSearchKey) {
    filters.push({ field: 'name', searchType: 'CONTAINS', searchKey: filterSearchKey })
  }

  if (statusFilter) {
    if (statusFilter === 'Active')
      filters.push({ field: 'isActive', searchType: 'EXACT_MATCH', searchKey: 'true' })
    else if (statusFilter === 'Inactive')
      filters.push({ field: 'isActive', searchType: 'EXACT_MATCH', searchKey: 'false' })
    
  }

  useEffect(() => {
    setPage(1);
  }, [filterSearchKey, statusFilter]);

  
  const sorts = [{ field: 'name', order: 'ASC' }];

  // React Query hook to fetch students data
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['students', page, limit, filters, sorts],
    queryFn: () => fetchStudentsByBatch({ page, limit, filters, sorts }),
  });

  const hasMore = data?.hasMore || false;
  

  // Use React Query's QueryClient for prefetching data
  const queryClient = useQueryClient();

  // Prefetch the next page of data (inside useEffect)
  useEffect(() => {
    if (data?.hasMore) {
      queryClient.prefetchQuery({
        queryKey: ['students', page + 1, limit, filters, sorts],
        queryFn: () => fetchStudentsByBatch({ page: page + 1, limit, filters, sorts }),
      });
    }
  }, [data, page, limit, filters, sorts, queryClient]);

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

  const isStudentView = urlBatchId === 'my' && account?.accountType === 'student';

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!batchId) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Invalid batch ID. Please check the URL and try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <div className="tw-flex tw-mb-4 tw-mr-14">
        <div className="tw-relative tw-w-80">
          <Input
            type="text"
            className="tw-w-full tw-h-8 tw-px-8 tw-py-2 tw-text-sm tw-border tw-border-primary tw-bg-white tw-rounded-md"
            placeholder="Search Students"
            defaultValue={filterSearchKey}
            onChange={(e) => debouncedSearch(e.target.value)} 
          />
          <Search className="tw-absolute tw-h-5 tw-left-2 tw-top-1/2 tw-transform -tw-translate-y-1/2 tw-text-gray-400" />
        </div>
        <div className='tw-w-28 tw-ml-auto'>
          {/* Status Filter */}
          <Select onValueChange={(value) => debounceStatusFilter(value)}>
            <SelectTrigger className="tw-w-40 tw-h-8 tw-bg-white tw-border tw-border-primary">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className='tw-border tw-border-primary'>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table className="tw-bg-white tw-shadow-sm tw-p-4 tw-w-full tw-gap-0 tw-opacity-100">
        {isLoading ? (
          <>
            <TableHeader>
              <TableRow className="tw-px-4 tw-py-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableHead key={index} className="tw-px-4 tw-py-2">
                    <Skeleton className="tw-px-4 tw-py-2 tw-h-6 tw-w-32" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex} className="">
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="tw-h-8 tw-w-32 tw-px-4 tw-py-2" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </>
        ) : queryError ? (
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="tw-px-4 tw-py-2 text-center">
                <ErrorMessage message="Failed to fetch data" />
              </TableCell>
            </TableRow>
          </TableBody>
        ) : (
          <>
            <TableHeader className='tw-rounded-lg'>
              <TableRow className="tw-rounded">
                <TableHead className="tw-px-4 tw-pl-10 tw-py-2 tw-font-bold">Student ID</TableHead>
                <TableHead className="tw-px-2 tw-py-2 tw-font-bold">Student Name</TableHead>
                <TableHead className="tw-px-2 tw-py-2 tw-font-bold">Email Address</TableHead>
                <TableHead className="tw-px-2 tw-py-2 tw-font-bold">Contact</TableHead>
                <TableHead className="tw-px-2 tw-py-2 tw-font-bold">Gender</TableHead>
                <TableHead className="tw-px-2 tw-py-2 tw-font-bold">State</TableHead>
                {(!isStudentView ) && (
                  <TableHead className="tw-px-2 tw-py-2 tw-font-bold">Edit</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody className="">
              {data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isStudentView ? 6 : 7} className="tw-px-4 tw-py-2 text-center">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                data.results.map((student) => (
                  <TableRow key={student.studentId} className="tw-h-18">
                    <TableCell className="tw-py-6 tw-pl-10">{student.givenStudentId}</TableCell>
                    <TableCell className="tw-py-6 tw-px-2 tw-text-primary tw-font-medium ">{student.name}</TableCell>
                    <TableCell className="tw-py-6 tw-px-2 tw-text-primary tw-font-medium">{student.email}</TableCell>
                    <TableCell className="tw-py-6 tw-px-2">
                      {formatPhoneNumber(
                        student.contactPhoneNumber.number,
                        student.contactPhoneNumber.countryCode
                      )}
                    </TableCell>
                    <TableCell className="tw-py-6 tw-px-2">{student.gender}</TableCell>
                    <TableCell className={`tw-py-6 tw-px-2 ${
                      student.isActive 
                      ?"tw-text-green-500"
                      :"tw-text-red-500"
                    }`}>{student.isActive ? 'Active' : 'Inactive'}</TableCell>
                    {(!isStudentView ) && (
                      <TableCell className="tw-px-4 tw-py-2">
                        <Link to={`/students/${student.studentId}`}>
                          {canEditBatch ? (
                            <Pencil className="tw-ml-2 tw-h-5" />
                          ):(
                            <Eye className="tw-ml-2 tw-h-5" />
                          )}
                        </Link>
                      </TableCell>
                    )}
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
          {page}
        </div>
        <div className="tw-flex tw-items-center">
          <Pagination className="tw-flex tw-place-items-end">
            <PaginationContent className="tw-flex tw-items-center">
              <PaginationItem>
                <PaginationPrevious
                  className="tw-px-3 tw-py-1"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page === 1}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className="tw-px-3 tw-py-1"
                  onClick={() => setPage((prev) => prev + 1)}
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

export default BatchStudents;