import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { AxiosError } from "@/lib/api";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useInView } from "react-intersection-observer";
import { useDebouncedCallback } from "use-debounce";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, MoveRight, Image, CircleCheck, CircleAlert, Plus, Check } from "lucide-react";
import { api } from "../../lib/api";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

// interface ProgramData {
//   givenProgramId: string;
//   name: string;
//   description: string;
//   skills: string;
//   duration: number;
//   isActive: boolean;
//   courses: string[];
// }

interface ProgramResponse {
  programId: string;
  name: string;
  givenProgramId: string;
  description: string;
  skills: string;
  duration: number;
  isActive: boolean;
  bannerBase64: string;
}

interface ApiError {
  code: number;
  message: string;
}

interface Course {
  courseId: string;
  givenCourseId: string;
  name: string;
  description: string;
  skills: string;
  duration: number;
  isActive: boolean;
}

interface DraggableCourseProps {
  course: string;
  addCourse: (course: string) => void;
  children: React.ReactNode;
  isSelected: boolean;
}

interface CourseResponse {
  results: Course[];
}

const DraggableCourse: React.FC<DraggableCourseProps> = ({
  course,
  addCourse,
  children,
  isSelected, 
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: "COURSE",
    item: { course },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
        addCourse(course);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: () => !isSelected, 
  });

  return (
    <div
      ref={isSelected ? null : drag} 
      style={{ opacity: isDragging ? 0.5 : 1 ,cursor: isSelected ? "not-allowed" : "pointer",  }} 
      className="tw-py-1 hover:tw-bg-gray-100" 
    >
      {children}
      {isSelected} 
    </div>
  );
};

interface DroppableAreaProps {
  children: React.ReactNode;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ children }) => {
  const [, drop] = useDrop({
    accept: "COURSE",
    drop: () => ({}),
  });

  return (
    <div ref={drop} className="tw-bg-white tw-shadow-sm tw-rounded-md tw-p-4">
      {children}
    </div>
  );
};

interface DraggableSelectedCourseProps {
  course: string;
  index: number;
  moveCourse: (dragIndex: number, hoverIndex: number) => void;
  removeCourse: (course: string) => void;
  children: React.ReactNode;
}

const DraggableSelectedCourse: React.FC<DraggableSelectedCourseProps> = ({
  course,
  index,
  moveCourse,
  removeCourse,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: "SELECTED_COURSE",
    item: { index, course },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "SELECTED_COURSE",
    hover(item: { index: number; course: string }) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveCourse(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`tw-flex tw-items-center tw-bg-gray-200 tw-rounded tw-px-2 tw-py-1 tw-mb-2 ${isDragging ? "tw-opacity-50" : ""}`}
    >
      <span>
        {index + 1}. {children}
      </span>
      <Button variant="ghost" size="sm" onClick={() => removeCourse(course)}>
        <X className="tw-w-4 tw-h-4" />
      </Button>
    </div>
  );
};

function ManageProgramAddPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [description, setDescription] = useState("");
  const [skillsGain, setSkillsGain] = useState("");
  const [programDuration, setProgramDuration] = useState("");
  const [status, setStatus] = useState("Active");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const { ref: infiniteScrollRef, inView } = useInView();
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { permissionSet } = usePolicies();
  const canEditProgram = checkActionScopes(permissionSet, "program:write", ["admin","supervisor","organization"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    description: string;
    icon: React.ReactNode;
    buttonText: string;
  }>({
    title: "",
    description: "",
    icon: null,
    buttonText: "",
  });

  const fetchCourses = async ({ pageParam = 1 }) => {
    const url = searchQuery
      ? `/courses?filters[0][field]=name&filters[0][searchType]=CONTAINS&filters[0][searchKey]=${encodeURIComponent(searchQuery)}`
      : `/courses`;
    const response = await api.get<CourseResponse>(url, {
      params: { page: pageParam, limit: 20 },
    });
    return response.data;
  };

  const {
    data: coursesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingCourses,
    error: coursesError,
  } = useInfiniteQuery({
    queryKey: ["courses", searchQuery],
    queryFn: fetchCourses,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.results.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    },
  });

  const debouncedSearch = useDebouncedCallback((value) => {
    setSearchQuery(value);
  }, 1300);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

  const mutation = useMutation<
    ProgramResponse,
    AxiosError<ApiError>,
    FormData
  >({
    mutationFn: async (formData: FormData): Promise<ProgramResponse> => {
      const response = await api.post<ProgramResponse>(
        `/programs`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: (data) => {
      console.log("Program created successfully:", data);
      setDialogContent({
        title: "Completed",
        description: "The program was successfully created.",
        icon: <CircleCheck className="tw-text-green-500" size={64} />,
        buttonText: "Continue",
      });
      setShowDialog(true);
    },
    onError: (error) => {
      const errorMessage = error.response
      ? `Error creating program: ${error.response.data.message}`
      : "Error creating program: " + error.message;
    setDialogContent({
      title: "Error",
      description: errorMessage,
      icon: <CircleAlert className="tw-text-red-500" size={64} />,
      buttonText: "Close",
    });
    setShowDialog(true);
  },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!programId.trim()) {
      newErrors.programId = "Program ID is required";
    } else if (!/^[A-Za-z0-9-_]+$/.test(programId)) {
      newErrors.programId = "Program ID can only contain letters, numbers, hyphens, and underscores";
    }
    if (!programName.trim()) {
      newErrors.programName = "Program Name is required";
    } else if (programName.length > 100) {
      newErrors.programName = "Program Name must be 100 characters or less";
    }
    if (!description.trim()) {
      newErrors.description = "Description is required";
    }
    else if( description.length <3){
      newErrors.description = "Description must be atleast 3 characters";
    }
    if (!skillsGain.trim()) {
      newErrors.skillsGain = "Skills Gained is required";
    } else if (skillsGain.length <3) {
      newErrors.skillsGain = "Skills Gained must be atleast 3 characters";
    }
  
    if (!programDuration) {
      newErrors.programDuration = "Program Duration is required";
    } else if (parseInt(programDuration) < 1 || parseInt(programDuration) > 12) {
      newErrors.programDuration = "Program Duration must be between 1 and 12 months";
    }
    if (selected.length === 0) {
      newErrors.courses = "At least one course must be selected";
    } else if (selected.length > 50) {
      newErrors.courses = "Maximum 20 courses can be selected";
    }
    if (!bannerFile) {
      newErrors.banner = "Banner image is required";
    } else {
      const img =  document.createElement('img');
      img.src = URL.createObjectURL(bannerFile);
      img.onload = () => {
        if (img.width < 1200 || img.height < 240) {
          newErrors.banner = "Banner image must be at least 1200x240 pixels";
        }
      };
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData = new FormData();
    formData.append('givenProgramId', programId.trim());
    formData.append('name', programName.trim());
    formData.append('description', description.trim());
    formData.append('skills', skillsGain.trim());
    formData.append('duration', programDuration);
    formData.append('isActive', status === "Active" ? 'true' : 'false');
    selected.forEach(courseId => formData.append('courses[]', courseId));
    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    mutation.mutate(formData);
  };

  const resetForm = () => {
    setProgramId("");
    setProgramName("");
    setDescription("");
    setSkillsGain("");
    setProgramDuration("");
    setStatus("Active");
    setSelected([]);
    setSelectedCourses([]);
    setBannerFile(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setBannerFile(file);
    }
  };

  
  const filteredCourses = useMemo(() => {
    return (
      coursesData?.pages.flatMap((page) =>
        page.results.map((course) => ({
          ...course,
          isSelected: selected.includes(course.courseId),
        }))
      ) || []
    );
  }, [coursesData, selected]);
  


  const addCourse = useCallback(
    (courseId: string) => {
      setSelected((prev) => {
        if (!prev.includes(courseId)) {
          const courseToAdd = filteredCourses.find(
            (c) => c.courseId === courseId
          );
          if (courseToAdd) {
            setSelectedCourses((prevSelected) => [
              ...prevSelected,
              courseToAdd,
            ]);
          }
          return [...prev, courseId];
        }
        return prev;
      });
    },
    [filteredCourses]
  );

  const removeCourse = useCallback((courseId: string) => {
    setSelected((prev) => prev.filter((id) => id !== courseId));
    setSelectedCourses((prev) =>
      prev.filter((course) => course.courseId !== courseId)
    );
  }, []);

  const moveCourse = useCallback((dragIndex: number, hoverIndex: number) => {
    setSelected((prevSelected) => {
      const updatedSelected = [...prevSelected];
      const [reorderedItem] = updatedSelected.splice(dragIndex, 1);
      updatedSelected.splice(hoverIndex, 0, reorderedItem);
      return updatedSelected;
    });
    setSelectedCourses((prevSelectedCourses) => {
      const updatedSelectedCourses = [...prevSelectedCourses];
      const [reorderedItem] = updatedSelectedCourses.splice(dragIndex, 1);
      updatedSelectedCourses.splice(hoverIndex, 0, reorderedItem);
      return updatedSelectedCourses;
    });
  }, []);

  return (
    
      <div className="tw-w-full tw-max-w-4xl tw-mx-auto">
        <div className="tw-bg-white tw-shadow-md tw-rounded-lg tw-p-6">
          <form onSubmit={handleSubmit} className="tw-space-y-3">
            <div>
              <Label htmlFor="programName">Program Name</Label>
              <Input
                id="programName"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Analysing Data Scale using Tableau, Power BI"
                disabled={!canEditProgram}
              />
               {errors.programName && (
              <p className="tw-text-red-500 tw-text-sm">{errors.programName}</p>
            )}
            </div>

            <div>
              <Label htmlFor="programId">Create Program ID</Label>
              <Input
                id="programId"
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                placeholder="PROG001"
                disabled={!canEditProgram}
              />
              {errors.programId && (
              <p className="tw-text-red-500 tw-text-sm">{errors.programId}</p>
            )}
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description here"
                disabled={!canEditProgram}
              />
               {errors.description&& (
              <p className="tw-text-red-500 tw-text-sm">{errors.description}</p>
            )}
            </div>

            <div>
              <Label htmlFor="skillsGain">Skills Gained</Label>
              <Textarea
                id="skillsGain"
                value={skillsGain}
                onChange={(e) => setSkillsGain(e.target.value)}
                placeholder="Write Skills"
                disabled={!canEditProgram}
              />
               {errors.skillsGain && (
              <p className="tw-text-red-500 tw-text-sm">{errors.skillsGain}</p>
            )}
            </div>

            <div className="tw-flex tw-space-x-8 tw-items-center">
              <div className="tw-flex-1">
                <Label htmlFor="programDuration">Program Duration</Label>
                <Select
                  value={programDuration}
                  onValueChange={(value) => setProgramDuration(value)}
                  disabled={!canEditProgram}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {days} months
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.programDuration&& (
              <p className="tw-text-red-500 tw-text-sm">{errors.programDuration}</p>
            )}
              </div>

              <div className="tw-flex-1 tw-mt-5 tw-ml-4">
                <div className="tw-flex tw-space-x-4">
                  <div className="tw-flex tw-items-center tw-space-x-2">
                    <Checkbox
                      id="active"
                      checked={status === "Active"}
                      onCheckedChange={() => setStatus("Active")}
                      disabled={!canEditProgram}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="tw-flex tw-items-center tw-space-x-2">
                    <Checkbox
                      id="inactive"
                      checked={status === "Inactive"}
                      onCheckedChange={() => setStatus("Inactive")}
                      disabled={!canEditProgram}
                    />
                    <Label htmlFor="inactive">Inactive</Label>
                  </div>
                </div>
              </div>
            </div>

            <DndProvider backend={HTML5Backend}>

            <div>
              <Label>Tag Courses</Label>
              <div className="tw-flex tw-space-x-4 tw-bg-gray-100 tw-p-4 tw-rounded tw-text-sm">
                <div className="tw-w-1/2">
                  <Label>Courses to Select</Label>
                  <div className="tw-bg-white tw-shadow-sm tw-rounded-md tw-p-4">
                    <Input
                      type="text"
                      onChange={(e) => {
                        debouncedSearch(e.target.value.trimStart());
                      }}
                      placeholder="Search Course Name"
                      className="tw-mb-2"
                      disabled={!canEditProgram}
                    />
                    <Separator className="tw-my-2" />
                    <div className="tw-overflow-y-auto tw-max-h-40 tw-text-sm">
                      {isLoadingCourses ? (
                        <p>Loading courses...</p>
                      ) : coursesError ? (
                        <p>Error loading courses</p>
                      ) : (
                        <>
                          {filteredCourses.map((course) => (
                            <div key={course.courseId} className={`tw-relative ${!canEditProgram ? 'tw-opacity-50 tw-pointer-events-none' : ''}`}>
                            <DraggableCourse
                              //key={course.courseId}
                              course={course.courseId}
                              addCourse={addCourse}
                              isSelected={course.isSelected} 
                            >
                              <div className="tw-flex tw-justify-between tw-items-center">
                                <span>{course.name}</span>
                                {course.isSelected ? <span><Check className="tw-mr-4 tw-line-clamp-1  tw-h-10" /></span> : <Button 
                                onClick={() => addCourse(course.courseId)} 
                                className="tw-bg-transparent hover:tw-bg-transparent tw-text-primary"><Plus /></Button>} {/* modified 14-09-24*/}
                              </div>
                            </DraggableCourse>
                            </div>
                          ))}
                          {isFetchingNextPage && <p>Loading more...</p>}
                          <div ref={infiniteScrollRef} />
                        </>
                      )}
                    </div>
                  </div>
                  {errors.courses&& (
              <p className="tw-text-red-500 tw-text-sm">{errors.courses}</p>
            )}
                </div>

                <div className="tw-flex tw-items-center">
                  <MoveRight className="tw-text-gray-400" />
                </div>

                <div className="tw-w-1/2">
                  <Label>Selected Courses</Label>
                  <div className={`tw-relative ${!canEditProgram ? 'tw-opacity-50 tw-pointer-events-none' : ''}`}>
                  <DroppableArea>
                    <p className="tw-text-sm tw-mb-1">
                      Selected courses for the program
                    </p>
                    <Separator className="tw-my-2" />
                    <div className="tw-overflow-y-auto tw-max-h-40 tw-text-sm">
                      {selectedCourses.map((course, index) => (
                        <DraggableSelectedCourse
                          key={course.courseId}
                          course={course.courseId}
                          index={index}
                          moveCourse={moveCourse}
                          removeCourse={removeCourse}
                        >
                          <span>{course.name}</span>
                        </DraggableSelectedCourse>
                      ))}
                    </div>
                  </DroppableArea>
                  </div>
                </div>
              </div>
            </div>
            </DndProvider>
            <div>

              <Label htmlFor="banner">Banner (Required)</Label>
              <div className="tw-flex tw-items-center tw-space-x-4">
                <div className="tw-bg-gray-50 tw-p-4 tw-rounded tw-text-sm tw-flex tw-items-center tw-justify-start tw-w-1/2">
                  {bannerFile ? (
                    <div className="tw-flex tw-items-center tw-space-x-4">
                      <img
                        src={URL.createObjectURL(bannerFile)}
                        alt="Uploaded banner"
                        className="tw-w-16 tw-h-16 tw-object-cover tw-rounded"
                      />
                      <div>
                        <p className="tw-font-medium">{bannerFile.name}</p>
                        <p className="tw-text-sm tw-text-gray-500">
                          {(bannerFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="link"
                          onClick={() => document.getElementById("fileInput")?.click()}
                          className="tw-p-0"
                          disabled={!canEditProgram}
                        >
                          Change Image
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image className="tw-w-10 tw-h-10 tw-opacity-50 tw-mr-4" />
                      <div>
                        <Button
                          variant="link"
                          onClick={() => document.getElementById("fileInput")?.click()}
                          disabled={!canEditProgram}
                          type="button"
                        >
                          Upload the file
                        </Button>
                        <p className="tw-text-sm tw-text-gray-500">
                          Select an image 1200 x 240 pixels or larger
                        </p>
                      </div>
                    </>
                  )}
                  <Input
                    id="fileInput"
                    type="file"
                    className="tw-hidden"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </div>
                {bannerFile && <CircleCheck className="tw-text-green-400" />}
              </div>
            </div>
            {errors.banner&& (
              <p className="tw-text-red-500 tw-text-sm">{errors.banner}</p>
            )}
            <Separator />


            {canEditProgram && 
              <Button type="submit" className="tw-w-full">
                Submit
              </Button>
            }

             <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="relative tw-max-w-md tw-mx-auto tw-my-auto">
          <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
            {dialogContent.icon}
            <AlertDialogTitle>
              <span>{dialogContent.title}</span>
            </AlertDialogTitle>
            <button
              className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
              onClick={() => setShowDialog(false)}
              aria-label="Close"
            >
              <X className="tw-text-xl" />
            </button>
            <AlertDialogDescription className="tw-mt-4 tw-text-center">
              {dialogContent.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="tw-flex !tw-justify-center">
            <AlertDialogAction
              onClick={() => {
                setShowDialog(false);
                if (dialogContent.title === "Completed") {
                  resetForm();
                }
              }}
            >
              {dialogContent.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </form>
        </div>
      </div>
    
  );
}

export default ManageProgramAddPage;