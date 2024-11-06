// SearchComponent.tsx
import React, { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { api } from '../../lib/api';
import { Loader, Boxes } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Card } from '@/components/ui/card';


const fetchAllPrograms = async (page: number, limit: number, filters: Filter[]) => {
  const { data } = await api.get(`/programs`, {
    params: {
      includeCourses: true,
      includeCourseCount: true,
      page,
      limit: 1000,
      ...filters.reduce((acc: Record<string, string>, filter, index) => {
        acc[`filters[${index}][field]`] = filter.field;
        acc[`filters[${index}][searchType]`] = filter.searchType;
        acc[`filters[${index}][searchKey]`] = filter.searchKey;
        return acc;
      }, {}),
    },
  });
  return data;
};

interface Filter {
  field: string;
  searchType: string;
  searchKey: string;
}

const fetchAllCourses = async (page: number, limit: number, filters: Filter[]) => {
  const { data } = await api.get(`/courses`, {
    params: {
      includeModules: true,
      includeModuleCount: true,
      page,
      limit: 1000,
      ...filters.reduce((acc: Record<string, string>, filter, index) => {
        acc[`filters[${index}][field]`] = filter.field;
        acc[`filters[${index}][searchType]`] = filter.searchType;
        acc[`filters[${index}][searchKey]`] = filter.searchKey;
        return acc;
      }, {}),
    },
  });
  return data;
};

interface SearchComponentProps {
  filterSearchKey: string;
  activeButton: string;
}

type SearchResult = {
  programId?: string;
  courseId?: string;
  name: string;
  bannerBase64?: string;
  skills: string;
  courses?: { length: number };
  moduleCount?: number;
};

const SearchComponent: React.FC<SearchComponentProps> = ({ filterSearchKey, activeButton }) => {
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 9;

  // Debounced search function
  const debouncedSearch = useDebouncedCallback(async (value) => {
    const filters = [{ field: 'name', searchType: 'CONTAINS', searchKey: value }];
    setIsLoading(true);

    try {
      let response;
      if (activeButton === 'programs') {
        response = await fetchAllPrograms(page, limit, filters);
      } else {
        response = await fetchAllCourses(page, limit, filters);
      }
      setSearchResults(response.results);
    } catch (error: unknown) {
      console.error(`Error fetching ${activeButton}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, 1000);

  // Trigger search when filterSearchKey or activeButton changes
  React.useEffect(() => {
    if (filterSearchKey) {
      debouncedSearch(filterSearchKey);
    }
  }, [filterSearchKey, activeButton, debouncedSearch]);

  const paginatedResults = searchResults.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(searchResults.length / limit);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <>
              <div className="md:tw-flex md:tw-flex-wrap tw-gap-8 tw-mt-4 ">
                {paginatedResults?.map((item: SearchResult) => (
                   <Link
                      to={
                        item.programId
                          ? `/all/programs/${item.programId}`
                          : `/all/courses/${item.courseId}`
                      }
                      key={item.programId || item.courseId}
                    >
                   <Card className="md:tw-w-80 tw-w-full tw-mb-4 tw-h-52 tw-rounded-lg tw-border tw-border-gray-200  tw-duration-300 hover:tw-scale-105  tw-transition-all">
                   <img
                       src={item.bannerBase64 || 'https://imgs.search.brave.com/zSXVGPNn64NjxxQICESfaKUduGxZ7apvhCMHM1FZ-WM/rs:fit:500:0:0:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZWVrc2Zvcmdl/ZWtzLm9yZy93cC1j/b250ZW50L3VwbG9h/ZHMvMjAyNDA4MTEy/MjAyNTAvVG9wLVBy/b2dyYW1taW5nLUxh/bmd1YWdlcy0yMDI0/LndlYnA'}
                       alt={item.name}
                       className="md:tw-w-80 tw-w-full tw-h-24 tw-object-cover tw-rounded-t-lg"
                     />
                     <div className="tw-flex md:tw-w-full">
                       <div className="tw-px-3 tw-py-3">
                         <p className="tw-text-xs tw-font-semibold">{item.name}</p>
                         <p className="tw-text-xs tw-mt-1">
                           <span className="tw-font-semibold ">Skills you'll gain:</span> <span className='tw-overflow-hidden tw-text-ellipsis tw-w-44 tw-line-clamp-2'>{item.skills}</span>
                         </p>
                       </div>
                       <div className="tw-flex tw-gap-1 tw-ml-auto tw-pr-3 md:tw-mr-0 tw-mr-0 tw-whitespace-nowrap tw-mt-3">
                         <Boxes className="tw-w-3 tw-h-3 tw-mt-0.5" />
                         <p className="tw-text-xs">{item.courses?.length || item.moduleCount} {item.programId ? 'Courses' : 'Modules'}</p>
                       </div>
                     </div>
                   </Card>
                 </Link>
                 
                ))}
              </div>
              {/* Pagination */}
              <div className="tw-flex tw-justify-between tw-items-center tw-w-full tw-mb-5">
                <div className="tw-text-gray-700 tw-flex tw-items-center">
                  <span className="tw-mr-2">Page</span>
                  {page}
                </div>
              <div className="tw-flex tw-items-center tw-ml-auto md:tw-mr-3">
                <Pagination className="tw-flex">
                  <PaginationContent className="tw-flex tw-items-center">
                  {/* Previous Button */}
                    <PaginationItem key="previous">
                      <PaginationPrevious
                          className="tw-px-3 tw-py-1 tw-border-gray-300 tw-rounded hover:tw-bg-gray-100"
                          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                          disabled={page === 1}
                      >
                          Previous
                      </PaginationPrevious>
                      </PaginationItem>
                        {/* Next Button */}
                      <PaginationItem key="next">
                      <PaginationNext
                          className="tw-px-3 tw-py-1 tw-border-gray-300 tw-rounded hover:tw-bg-gray-100"
                          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={page === totalPages}
                      >
                          Next
                      </PaginationNext>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
              </>
      )}
    </>
  );
};

export default SearchComponent;
