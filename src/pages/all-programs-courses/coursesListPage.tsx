import { Card } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Loader} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import React, { useEffect, useState } from 'react'
import { api } from '../../lib/api';

interface Course {
    name: string;
    skills: string;
    courseId: string;
    duration: number;
    isActive: boolean;
    createdAt: string;
    description: string;
    givenCourseId: string;
    moduleCount: number;
    bannerBase64: string;
}
  
interface CoursesWithModules extends Course {
  modules: Module[];
}

interface Module {
  name: string;
  summary: string;
  moduleId: string;
  position: number;
}

// Fetch course details by courseId (with modules)
const fetchAllCoursesWithModules = async (page: number, limit: number, sorts: any[]) => {
  const { data } = await api.get(
    `/courses?includeModules=true&includeModuleCount=true&onlyDangling=true`,{params: { page, limit, sorts },
  });
  return data;
};

const sorts =[{ field: 'name', order:'ASC'}];

const CoursesListPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 9;
  const queryClient = useQueryClient();

  // Fetch all courses details
  const { data, isLoading: isCourseLoading } = useQuery({
    queryKey: ['programdetails', currentPage, limit, sorts, 'onlyDangling'],
    queryFn: () => fetchAllCoursesWithModules(currentPage, limit, sorts),
  });

  const courses = data?.results || [];
  const hasMore = data?.hasMore || false;

  // Prefetch next page data if more programs are available
  useEffect(() => {
    if (hasMore) {
      queryClient.prefetchQuery({
        queryKey: ['programsDetails', currentPage + 1, limit, sorts],
        queryFn: () => fetchAllCoursesWithModules(currentPage + 1, limit, sorts),
      });
    }
  }, [data, currentPage, limit, queryClient, hasMore]);

  if (isCourseLoading) {
    return <div><Loader /></div>;
  }

  return (
    <div className="md:tw-flex md:tw-flex-wrap tw-gap-8 tw-mt-4 md:tw-ml-0 tw-ml-0 tw-mr-2">
      {courses.map((item: Course, index: number) => (
        <Link
          to={`/all/courses/${item.courseId}`}
          key={item.courseId}
        >
          <Card className="tw-w-full md:tw-w-80 tw-mb-4 tw-h-52 tw-transition-all tw-rounded-lg tw-border tw-border-gray-200  tw-duration-300 hover:tw-scale-105">
            <img
              src={item.bannerBase64} 
              alt={item.name}
              className="tw-w-full md:tw-w-80 tw-h-24 tw-object-cover tw-rounded-t-lg"
            />
            <div className='tw-flex md:tw-w-full'>
            <div className="tw-px-3 tw-py-3 ">
              <div className="">
                <p className="tw-text-xs tw-font-semibold">
                  {item.name}
                </p>
              </div>
              <p className="tw-text-xs tw-mt-1">
                <span className='tw-font-semibold'>Skills you'll gain:</span> 
                <span className="tw-overflow-hidden tw-text-ellipsis tw-w-44 tw-line-clamp-2">{item.skills}</span>
              </p>
            </div>
            <div className="tw-flex tw-gap-1 tw-ml-auto tw-pr-3 md:tw-mr-0 tw-mr-0 tw-whitespace-nowrap tw-mt-3">
                <Boxes className="tw-w-3 tw-h-3 tw-mt-0.5" />
                <p className="tw-text-xs">
                    {item.moduleCount} Modules
                </p>
            </div>
            </div>
          </Card>
        </Link>
      ))}
      {/* Pagination */}
      <div className="tw-flex tw-justify-between tw-items-center tw-w-full tw-mb-5 ">
        <div className="tw-text-gray-700 tw-flex tw-items-center">
            <span className="tw-mr-2">Page</span>
            {currentPage}
        </div>
        <div className="tw-flex tw-items-center tw-ml-auto md:tw-mr-3">
            <Pagination className="tw-flex">
            <PaginationContent className="tw-flex tw-items-center">
                {/* Previous Button */}
                <PaginationItem>
                <PaginationPrevious
                    className="tw-px-3 tw-py-1 tw-border-gray-300 tw-rounded hover:tw-bg-gray-100"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                >
                    Previous
                </PaginationPrevious>
                </PaginationItem>

                {/* Next Button */}
                <PaginationItem>
                <PaginationNext
                    className="tw-px-3 tw-py-1 tw-border-gray-300 tw-rounded hover:tw-bg-gray-100"
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                    disabled={!hasMore}
                >
                    Next
                </PaginationNext>
                </PaginationItem>
            </PaginationContent>
            </Pagination>
        </div>
        </div>

    </div>
  )
}

export default CoursesListPage
