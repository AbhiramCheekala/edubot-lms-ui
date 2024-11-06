
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { format } from 'date-fns';
import { Eye, Pencil, X } from 'lucide-react';
import React, { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";
import DragandDrop from "../students/DragandDrop";

const fetchPrograms = async (page, limit, filters, sorts) => {
  try {
    const url = `/programs`;
    const params = { page, limit };

    if (filters && filters.length > 0) {
      filters.forEach((filter: { field: any; searchType: any; searchKey: any; }, index: any) => {
        params[`filters[${index}][field]`] = filter.field;
        params[`filters[${index}][searchType]`] = filter.searchType;
        params[`filters[${index}][searchKey]`] = filter.searchKey;
      });
    }

    if (sorts && sorts.length > 0) {
      sorts.forEach((sort: { field: any; order: any; }, index: any) => {
        params[`sorts[${index}][field]`] = sort.field;
        params[`sorts[${index}][order]`] = sort.order;
      });
    }

    const response = await api.get(url, { params });
    return response.data;
  } catch (error) {
    console.error("Error fetching programs:", error);
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
  givenProgramId: "Program ID",
};



const ProgramListPage = () => {

  const [filterType, setFilterType] = useState("name");
  const [filterMatchType, setFilterMatchType] = useState("CONTAINS");
  const [filterSearchKey, setFilterSearchKey] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const queryClient = useQueryClient();
  const { permissionSet } = usePolicies();
  const canEditProgram = checkActionScopes(permissionSet, "program:write", ["admin","supervisor","organization"]);

  const [openComponent, setOpenComponent] = useState<"programs" | "courses" | "students" | null>(null);


  

  const userInSinglePage = 10;
  const debouncedSearch = useDebouncedCallback((value) => {
    setFilterSearchKey(value);
    
  }, 1300);


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

  const { data: programsData, error: programsError, isLoading } = useQuery({
    queryKey: [
      "programs",
      currentPage,
      userInSinglePage,
      filterSearchKey,
      filterType,
      filterMatchType,
    ],
    queryFn: () => fetchPrograms(currentPage, userInSinglePage, filters, sorts),
    staleTime: 5000,
  }); 


  useEffect(() => {
    setCurrentPage(1);
  }, [filterSearchKey, filterType, filterMatchType]);

  useEffect(() => {
    if (programsData?.hasMore) {
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
          "programs",
          currentPage + 1,
          userInSinglePage,
          filterSearchKey,
          filterType,
          filterMatchType,
        ],
        queryFn: () => fetchPrograms(currentPage + 1, userInSinglePage, nextPageFilters, sorts),
      });
    }
  }, [programsData, currentPage, userInSinglePage, queryClient, filterSearchKey, filterType, filterMatchType]);


  if (programsError) {
    return <ErrorMessage />;
  }

  const programs = programsData?.results || [];
  const hasMore = programsData?.hasMore || false;

  const handleOpenComponent = (type: "programs" | "courses" | "students") => {
    setOpenComponent(type);
  };




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
        {canEditProgram && 
          <div className="tw-flex tw-gap-4 tw-items-center">
            <Link to="/programs/add">
              <Button variant="default" className="tw-w-full tw-h-8 hover:tw-bg-primary/360">
                <span className="tw-text-lg">+</span>
                <span className="tw-font-montserrat tw-text-xs tw-font-medium tw-leading-3 tw-text-left">
                  Add Program
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
        ) : programsError ? (
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
          <TableRow className="tw-bg-[#FFDF9B]" >
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold">
            Program ID
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold">
            Program Name
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold tw-text-start">
              Date Created
            </TableHead>
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold">
              State
            </TableHead>
            {canEditProgram && 
              <TableHead className="tw-py-2 tw-font-bold tw-text-center">
                Add Student
              </TableHead>
            }
            <TableHead className="tw-px-4 tw-py-2 tw-font-bold">
              Action
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="tw-bg-[#ffffff]">
              {programs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="tw-px-4 tw-py-2 text-center">
                    No programs found
                  </TableCell>
                </TableRow>
              ) : (
                programs.map((program: {
                  initialSelectedStudents: any[]; id: React.Key; givenProgramId: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal; name: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal; createdAt: string; isActive: any; programId: any; 
}) => (
                  <TableRow key={program.programId} className="tw-h-18">
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {program.givenProgramId}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-font-medium tw-text-gray-700 tw-text-sm">
                      {program.name}
                    </TableCell>
                    <TableCell className="tw-px-4 tw-py-2 tw-text-primary tw-text-opacity-1 tw-font-semibold tw-text-sm tw-text-start">
                    {format(new Date(program.createdAt), "do MMM yyyy")}
                  </TableCell>
                    <TableCell
                      className={`tw-px-4 tw-py-2 tw-font-medium tw-text-sm ${
                        program.isActive ? "tw-text-green-500" : "tw-text-red-500"
                      }`}
                    >
                      {program.isActive ? "Active" : "Inactive"}
                    </TableCell>
                    {canEditProgram &&
                    <TableCell className="tw-pb-2 tw-pt-4 tw-font-semibold tw-text-primary tw-text-sm tw-text-center">
                      <AlertDialog>
                        <AlertDialogTrigger onClick={() => handleOpenComponent("students")}>Add</AlertDialogTrigger>
                        <AlertDialogContent className='!tw-bg-white  tw-rounded-sm !tw-w-[910px] !tw-max-w-none tw-h-50% '>
                          <AlertDialogHeader>
                          <AlertDialogFooter>
                              <AlertDialogCancel className="tw-h-15 tw-w-15">
                                <X className="tw-w-4 tw-h-4" />
                              </AlertDialogCancel>
                            </AlertDialogFooter>
                            <AlertDialogTitle></AlertDialogTitle> 
                           <AlertDialogDescription>
                            {openComponent && (
                              <DragandDrop programId={program.programId} type={openComponent} />)}
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                    }
                    <TableCell className="tw-px-8 tw-py-2 ">
                     <div className="tw-flex">
                      {canEditProgram ? 
                      (<>
                        <Link to={`/programs/${program.programId}`} >
                            <Pencil className="tw-w-4 tw-h-4" />
                        </Link>
                        {/* <BookCopy className='tw-w-4 tw-h-4'/> */}
                      </>):(<>
                        <Link to={`/all/programs/${program.programId}`} >
                          <Eye className='tw-w-4 tw-h-4 tw-ml-4'/>
                        </Link>
                      </>)
                      }
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
}

export default ProgramListPage;