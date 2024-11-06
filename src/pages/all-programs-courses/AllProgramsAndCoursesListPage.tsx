// AllProgramsAndCoursesListPage.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import ProgramsListPage from './programsListPage';
import CoursesListPage from './coursesListPage';
import SearchComponent from './searchComponent';

const AllProgramsAndCoursesListPage: React.FC = () => {
  const [activeButton, setActiveButton] = useState('programs');
  const [filterSearchKey, setFilterSearchKey] = useState('');

  // Effect to handle when filterSearchKey is updated
  useEffect(() => {
    if (filterSearchKey) {
      // Don't reset activeButton when search is active
      // setActiveButton('');
    }
  }, [filterSearchKey]);


  const handleButtonClick = (renderState: string) => {
    setActiveButton(renderState);
    setFilterSearchKey(''); // Clear search when switching
  };

  return (
    <>
      <div className="md:tw-w-full ">
        <div className="tw-w-full tw-gap-2 tw-flex tw-mb-2">
          <Button
            variant="outline"
            className={`tw-border-primary tw-mt-1 tw-rounded-lg tw-w-24 tw-h-8 tw-text-primary ${activeButton === 'courses' ? 'tw-bg-secondary' : 'tw-bg-white'} hover:tw-bg-secondary`}
            onClick={() => handleButtonClick('courses')}
          >
            <span className="tw-text-xs">All Courses</span>
          </Button>
          <Button
            variant="outline"
            className={`tw-border-primary tw-mt-1 tw-rounded-lg tw-w-24 tw-h-8 tw-text-primary ${activeButton === 'programs' ? 'tw-bg-secondary' : 'tw-bg-white'} hover:tw-bg-secondary`}
            onClick={() => handleButtonClick('programs')}
          >
            <span className="tw-text-xs">All Programs</span>
          </Button>
          <div className="tw-relative tw-w-96 tw-mt-1">
            <Input
              type="text"
              placeholder="Search courses/programs"
              value={filterSearchKey}
              onChange={(e) => setFilterSearchKey(e.target.value)}
              className="md:tw-w-full tw-w-28 tw-h-8 tw-rounded-lg tw-text-primary  tw-pl-6 tw-pr-3 tw-text-xs"
            />
            <Search className="tw-absolute tw-top-1/2 tw-left-2 tw--translate-y-1/2 tw-w-4 tw-h-4 tw-text-primary" />
          </div>
        </div>

        <div className="tw-w-full tw-pt-2">
          {filterSearchKey ? ( 
            <SearchComponent filterSearchKey={filterSearchKey} activeButton={activeButton} />
          ) : activeButton === 'courses' ? (
            <CoursesListPage />
          ) : (
            <ProgramsListPage />
          )}
        </div>
      </div>
    </>
  );
};

export default AllProgramsAndCoursesListPage;
