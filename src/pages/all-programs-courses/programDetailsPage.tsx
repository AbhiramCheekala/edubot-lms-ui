import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { api } from "@/lib/api";
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";


interface ProgramResponse {
  programId: string;
  createdAt: string;
  name: string;
  givenProgramId: string;
  description: string;
  skills: string;
  duration: number;
  isActive: boolean;
  bannerBase64: string;
  courses: Course[];
}

interface Course {
  name: string;
  skills: string;
  courseId: string;
  duration: number;
  isActive: boolean;
  createdAt: string;
  description: string;
  givenCourseId: string;
}

interface CourseWithModules extends Course {
  modules: Module[];
}

interface Module {
  name: string;
  summary: string;
  moduleId: string;
  position: number;
}

const colorClasses = [
  { light: 'tw-bg-red-100', dark: 'tw-border-red-400', darker:'tw-bg-red-400' },
  { light: 'tw-bg-blue-100', dark: 'tw-border-blue-400', darker:'tw-bg-blue-400' },
  { light: 'tw-bg-green-100', dark: 'tw-border-green-400', darker:'tw-bg-green-400' },
  { light: 'tw-bg-yellow-100', dark: 'tw-border-yellow-400', darker:'tw-bg-yellow-400' },
  { light: 'tw-bg-pink-100', dark: 'tw-border-pink-400', darker:'tw-bg-pink-400' },
  { light: 'tw-bg-purple-100', dark: 'tw-border-purple-400', darker:'tw-bg-purple-400' },
  { light: 'tw-bg-indigo-100', dark: 'tw-border-indigo-400', darker:'tw-bg-indigo-400' },
  { light: 'tw-bg-gray-100', dark: 'tw-border-gray-400', darker:'tw-bg-gray-400' },
];

const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getRandomColorClasses = (): { light: string; dark: string; darker: string }[] => {
  return shuffleArray([...colorClasses]);
};

// Fetch program details
const fetchProgramDetails = async (programId: string) => {
  const { data } = await api.get<ProgramResponse>(
    `/programs/${programId}?includeCourses=true`
  );
  return data;
};

// Fetch course details by courseId (with modules)
const fetchCourseWithModules = async (courseId: string) => {
  const { data } = await api.get<CourseWithModules>(
    `/courses/${courseId}?includeModules=true`
  );
  return data;
};

const ProgramDetailsPage = () => {
  const { programId } = useParams({ from: '/_authenticated/all/programs/$programId' });

  const [coursesWithModules, setCoursesWithModules] = useState<
    CourseWithModules[]
  >([]);
  const [isCoursesLoading, setCoursesLoading] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const [shuffledColors, setShuffledColors] = useState([]);
  const { permissionSet } = usePolicies();
  const canEditProgram = checkActionScopes(permissionSet, "course:write", ["admin","supervisor","organization"]);

  useEffect(() => {
    setShuffledColors(getRandomColorClasses());
  }, []);

  // Fetch program details
  const { data: programDetails, isLoading: isProgramLoading } = useQuery({
    queryKey: ['programdetails', programId],
    queryFn: () => fetchProgramDetails(programId),
  });

  // Fetch course details for each course in the program
  useEffect(() => {
    const fetchAllCoursesWithModules = async () => {
      if (programDetails?.courses?.length) {
        setCoursesLoading(true);
        try {
          const courseData = await Promise.all(
            programDetails.courses.map((course) =>
              fetchCourseWithModules(course.courseId)
            )
          );
          setCoursesWithModules(courseData);
        } catch (error) {
          console.error('Error fetching course data:', error);
        } finally {
          setCoursesLoading(false);
        }
      }
    };

    fetchAllCoursesWithModules();
  }, [programDetails]);

  if (isProgramLoading || isCoursesLoading) {
    return <div>Loading...</div>;
  }

  const handleToggle = (courseId) => {
    setOpenItem(openItem === courseId ? null : courseId);
  };

  return (
    <div className='tw-p-4 tw-rounded-lg tw-bg-white tw-shadow-lg lg:tw-w-10/12'>
      <div className=''>
        {/* Program Header */}
        <div className='tw-flex tw-pb-4 tw-pt-3'>
          <h3 className='tw-text-md'>
            <span className='tw-text-primary tw-font-medium'>
              Program ID :{' '}
            </span>
            <span className='tw-text-gray-600'>
              {programDetails?.givenProgramId}
            </span>
          </h3>
          <div className='tw-ml-auto'>
            {canEditProgram && 
            <Link to={`/programs/${programDetails.programId}`}>
              <Button className='tw-h-8 tw-p-2'>
                <Pencil className='tw-w-6 tw-h-6 tw-pr-2'/>
                  Edit
              </Button>
            </Link>
            }
          </div>
        </div>
        <div className='tw-pb-4'>
          <Separator />
        </div>

        {/* Program Information */}
        <div className=''>
          <div className=''>
            <p className='tw-text-xl tw-pb-4 tw-font-semibold'>
              {programDetails?.name}
            </p>

            {/* Banner Image */}
            <div className='tw-pb-4 tw-w-auto tw-h-full tw-overflow-hidden'>
              {programDetails?.bannerBase64 ? (
                <img
                  src={programDetails?.bannerBase64}
                  alt={programDetails?.name || 'Program Banner'}
                  className='tw-object-contain  '
                />
              ) : (
                <p>No image available</p>
              )}
            </div>

            {/* Program Description */}
            <div className='tw-pb-4'>
              <p className=''>{programDetails?.description}</p>
            </div>

            {/* Skills Gained */}
            <h2 className='tw-text-md tw-pb-4'>
              <span className='tw-font-semibold '>Skills gain :</span>
              <span className='tw-whitespace-break-spaces'>{programDetails?.skills}</span>
            </h2>
          </div>
        </div>

        {/* Courses Accordion */}
        <h1 className='tw-text-lg tw-pb-4 tw-font-semibold'>Courses</h1>
        <div>
          {coursesWithModules.length > 0 ? (
            <Accordion type='single' collapsible className=''>
              <div className='tw-w-1 tw-rounded-tl-sm tw-rounded-bl-sm tw-text-black'></div>
              {coursesWithModules.map((course, index) => {
                const color = shuffledColors[index % shuffledColors.length]; // Get color once per course
                const isOpen = openItem === course.courseId;
                return (
                  <AccordionItem
                    key={course.courseId}
                    value={course.courseId}
                    className={`tw-rounded-lg ${color.light} tw-overflow-hidden tw-border-l-4 tw-border-b-0 ${color.dark} tw-mb-2`}
                    onClick={() => handleToggle(course.courseId)}
                  >
                    <AccordionTrigger className='tw-flex tw-justify-items-start tw-overflow-hidden tw-text-base tw-text-gray-800 tw-py-3 lg:tw-px-4 tw-px-2'>
                    <Link 
                      to={`/all/courses/${course.courseId}`}
                      className={`tw-overflow-hidden ${isOpen ? 'tw-break-words tw-whitespace-normal tw-text-left' : 'tw-whitespace-nowrap tw-text-ellipsis'}`}>
                      <span >
                        {course.name}
                      </span>
                    </Link>
                    </AccordionTrigger>
                    <AccordionContent className='tw-py-4 lg:tw-px-4 tw-px-2 tw-overflow-hidden'>
                      {/* Display Modules Only */}
                      <div>
                        {course.modules.length > 0 ? (
                          <ul>
                            {course.modules.map((module) => (
                              <li
                                key={module.moduleId}
                                className='tw-pb-4'
                              >
                                <div className='tw-flex'>
                                  <div className='tw-pr-4'>
                                    <Checkbox disabled={true} checked={true} className={`tw-rounded-full ${color.dark} ${color.darker} data-[state=checked]:${color.darker} lg:tw-w-5 lg:tw-h-5 tw-w-4 tw-h-4 lg:tw-mt-0 tw-mt-1`} />
                                  </div>
                                  <div>
                                    <Link>
                                      <span 
                                        className='tw-overflow-hidden'
                                      >
                                        {module.name}:
                                      </span>
                                    </Link>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>No modules available</p>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <p>No courses available</p>
          )}
        </div>
        <div className='tw-pt-4'>
          {canEditProgram && 
          <Link to='/manage-courses/add'>
            <Button className='tw-h-8'><span className='tw-pr-2'>+</span> Create Course</Button>
          </Link> 
          }
        </div>
      </div>
    </div>
  );
};

export default ProgramDetailsPage;