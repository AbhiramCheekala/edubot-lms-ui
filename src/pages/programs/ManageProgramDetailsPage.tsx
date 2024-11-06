import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { AxiosError } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useInView } from "react-intersection-observer";
import { useDebouncedCallback } from "use-debounce";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, MoveRight, Image, CircleCheck, CircleAlert, Check, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface ProgramData {
  givenProgramId: string;
  name: string;
  description: string;
  skills: string;
  duration: number;
  isActive: boolean;
  courses: string[];
  // Remove bannerBase64
}

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

interface ApiError {
  code: number;
  message: string;
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

interface CourseResponse {
  results: Course[];
}

interface DraggableCourseProps {
  course: string;
  addCourse: (course: string) => void;
  children: React.ReactNode;
  isSelected: boolean;
}

interface DroppableAreaProps {
  children: React.ReactNode;
}

interface DraggableSelectedCourseProps {
  course: string;
  index: number;
  moveCourse: (dragIndex: number, hoverIndex: number) => void;
  removeCourse: (course: string) => void;
  children: React.ReactNode;
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
  });

  return (
    <div
      ref={isSelected ? null : drag}
      style={{ opacity: isDragging ? 0.5 : 1 ,cursor: isSelected ? "not-allowed" : "pointer",  }}
      className="tw-cursor-pointer tw-py-1 hover:tw-bg-gray-100"
    >
      {children}
    </div>
  );
};

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
      className={`tw-flex tw-items-center tw-bg-gray-200 tw-rounded tw-px-2 tw-py-1 tw-mb-2 ${
        isDragging ? "tw-opacity-50" : ""
      }`}
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

function ManageProgramDetailsPage() {
  const params = useParams({ from: "/_authenticated/programs/$programId" });

  const { programId } = params;
 // const [errorMessage, setErrorMessage] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const { ref: infiniteScrollRef, inView } = useInView();
  const [searchQuery, setSearchQuery] = useState("");
  const { permissionSet } = usePolicies();
  const canEditProgram = checkActionScopes(permissionSet, "program:write", ["admin","supervisor","organization"]);
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
  const {
    control,
    setValue,
    handleSubmit,
    watch,
    formState: { dirtyFields,isDirty },
    reset,
  } = useForm<ProgramData>({
    defaultValues: {
      givenProgramId: "",
      name: "",
      description: "",
      skills: "",
      duration: 0,
      isActive: false,
      courses: [],
    },
  });

  const watchedCourses = watch("courses");

  const {
    data: programData,
    isLoading: isProgramLoading,
    error: programError,
    refetch: refetchProgram
  } = useQuery({
    queryKey: ["program", programId],
    queryFn: async () => {
      const response = await api.get<ProgramResponse>(
        `/programs/${programId}?includeCourses=true`
      );
      return response.data;
    },
  });

  useEffect(() => {
    if (programData) {
      setValue("givenProgramId", programData.givenProgramId, {
        shouldDirty: false,
      });
      setValue("name", programData.name, { shouldDirty: false });
      setValue("description", programData.description, { shouldDirty: false });
      setValue("skills", programData.skills, { shouldDirty: false });
      setValue("duration", programData.duration, { shouldDirty: false });
      setValue("isActive", programData.isActive, { shouldDirty: false });
      setValue(
        "courses",
        programData.courses.map((course) => course.courseId),
        { shouldDirty: false }
      );
      setSelectedCourses(programData.courses);
    }
  }, [programData, setValue]);

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.patch(
        `/programs/${programId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      setDialogContent({
        title: "Completed",
        description: "The program was successfully updated.",
        icon: <CircleCheck className="tw-text-green-500" size={64} />,
        buttonText: "Continue",
      });
      setShowDialog(true);
      refetchProgram();    
    },
    onError: (error: AxiosError<ApiError>) => {
      setDialogContent({
        title: "Error",
        description: `Error updating program: ${error.response?.data?.message || error.message}`,
        icon: <CircleAlert className="tw-text-red-500" size={64} />,
        buttonText: "Close",
      });
      setShowDialog(true);
      if (programData) {
        reset({
          givenProgramId: programData.givenProgramId,
          
          name: programData.name,
          description: programData.description,
          skills: programData.skills,
          duration: programData.duration,
          isActive: programData.isActive,
          courses: programData.courses.map(course => course.courseId),
        });
        setSelectedCourses(programData.courses);
      }
     
    },
  });

  const onSubmit = (data: ProgramData) => {
    const formData = new FormData();
    
    Object.keys(dirtyFields).forEach((key) => {
      const typedKey = key as keyof ProgramData;
      if (typedKey === 'courses') {
        selectedCourses.forEach(course => formData.append('courses[]', course.courseId));
      } else {
        formData.append(typedKey, data[typedKey].toString());
      }
    });

    if (bannerFile) {
      formData.append('banner', bannerFile);
    }

    // Always include isActive in the update
    if (!formData.has('isActive')) {
      formData.append('isActive', data.isActive.toString());
    }

    if (formData.entries().next().done) {
      // No changes to update
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setBannerFile(file);
    }
  };

  const fetchCourses = async ({ pageParam = 1 }) => {
    const url = searchQuery
      ? `/courses?filters[0][field]=name&filters[0][searchType]=CONTAINS&filters[0][searchKey]=${encodeURIComponent(
          searchQuery
        )}`
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
  }, 300);

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

  const filteredCourses = useMemo(() => {
    return (
      coursesData?.pages.flatMap((page) =>
        page.results.map((course) => ({
          ...course,
          isSelected: selectedCourses.some(
            (selectedCourse) => selectedCourse.courseId === course.courseId
          )
        }))
      ) || []
    );
  }, [coursesData, selectedCourses]);

  const addCourse = useCallback(
    (courseId: string) => {
      const courseToAdd = filteredCourses.find((c) => c.courseId === courseId);
      if (courseToAdd) {
        setValue("courses", [...(watchedCourses || []), courseToAdd.courseId], {
          shouldDirty: true,
        });
        setSelectedCourses((prev) => [...prev, courseToAdd]);
      }
    },
    [filteredCourses, setValue, watchedCourses]
  );

  const removeCourse = useCallback(
    (courseId: string) => {
      setValue(
        "courses",
        (watchedCourses || []).filter((id) => id !== courseId),
        { shouldDirty: true }
      );
      setSelectedCourses((prev) =>
        prev.filter((course) => course.courseId !== courseId)
      );
    },
    [setValue, watchedCourses]
  );

  const moveCourse = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const newCourses = [...(watchedCourses || [])];
      const [reorderedItem] = newCourses.splice(dragIndex, 1);
      newCourses.splice(hoverIndex, 0, reorderedItem);
      setValue("courses", newCourses, { shouldDirty: true });

      setSelectedCourses((prev) => {
        const newSelectedCourses = [...prev];
        const [reorderedCourse] = newSelectedCourses.splice(dragIndex, 1);
        newSelectedCourses.splice(hoverIndex, 0, reorderedCourse);
        return newSelectedCourses;
      });
    },
    [setValue, watchedCourses]
  );

  if (isProgramLoading) return <div>Loading...</div>;
  if (programError) return <div>Error loading program data</div>;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="tw-w-full tw-max-w-4xl">
        <div className="tw-bg-white tw-shadow-md tw-rounded-lg tw-p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="tw-space-y-3">
            {/* Form fields */}
            <div>
              <Label htmlFor="programName">Program Name</Label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="programName"
                    placeholder="Analysing Data Scale using Tableau, Power BI"
                    disabled={!canEditProgram}
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="programId">Program ID</Label>
              <Controller
                name="givenProgramId"
                control={control}
                render={({ field }) => (
                  <Input {...field} id="programId" placeholder="PROG001" disabled={!canEditProgram}/>
                )}
              />
            </div>

            <div>
              <Label htmlFor="description">Description (optional)</Label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="description"
                    placeholder="Enter description here"
                    disabled={!canEditProgram}
                  />
                )}
              />
            </div>

            <div>
              <Label htmlFor="skillsGain">Skills Gained</Label>
              <Controller
                name="skills"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="skillsGain"
                    placeholder="Write Skills"
                    disabled={!canEditProgram}
                  />
                )}
              />
            </div>

            <div className="tw-flex tw-space-x-8 tw-items-center">
              <div className="tw-flex-1">
                <Label htmlFor="programDuration">Program Duration</Label>
                <Controller
                  name="duration"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value?.toString()}
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
                  )}
                />
              </div>

              <div className="tw-flex-1 tw-mt-5 tw-ml-4">
                <div className="tw-flex tw-space-x-4">
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <>
                        <div className="tw-flex tw-items-center tw-space-x-2">
                          <Checkbox
                            id="active"
                            checked={field.value === true}
                            onCheckedChange={(checked) => {
                              const isActive = checked === true;
                              field.onChange(isActive);
                              setValue("isActive", isActive, {
                                shouldDirty: true,
                              });
                            }}
                            disabled={!canEditProgram}
                          />
                          <Label htmlFor="active">Active</Label>
                        </div>
                        <div className="tw-flex tw-items-center tw-space-x-2">
                          <Checkbox
                            id="inactive"
                            checked={field.value === false}
                            onCheckedChange={(checked) => {
                              const isActive = checked !== true;
                              field.onChange(isActive);
                              setValue("isActive", isActive, {
                                shouldDirty: true,
                              });
                            }}
                            disabled={!canEditProgram}
                          />
                          <Label htmlFor="inactive">Inactive</Label>
                        </div>
                      </>
                    )}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Tag Courses</Label>
              <div className="tw-flex tw-space-x-4 tw-bg-gray-100 tw-p-4 tw-rounded tw-text-sm">
                <div className="tw-w-1/2">
                  <Label>Courses to Select</Label>
                  <div className="tw-bg-white tw-shadow-sm tw-rounded-md tw-p-4">
                    <Input
                      type="text"
                      onChange={(e) =>
                        debouncedSearch(e.target.value.trimStart())
                      }
                      placeholder="Search Course Name"
                      className="tw-mb-2"
                      disabled={!canEditProgram}
                    />
                    <div className={`tw-relative ${!canEditProgram ? 'tw-opacity-50 tw-pointer-events-none' : ''}`}>
                    <Separator className="tw-my-2" />
                    <div className="tw-overflow-y-auto tw-max-h-40 tw-text-sm ">
                      {isLoadingCourses ? (
                        <p>Loading courses...</p>
                      ) : coursesError ? (
                        <p>Error loading courses</p>
                      ) : (
                        <>
                          {filteredCourses.map((course) => (
                            <DraggableCourse
                              key={course.courseId}
                              course={course.courseId}
                              addCourse={addCourse}
                              isSelected={course.isSelected}
                            >
                              <div className="tw-flex tw-justify-between tw-items-center">
                                <span>{course.name}</span>
                                {course.isSelected ? 
                                <span>
                                  <Check className="tw-mr-4 tw-line-clamp-1  tw-h-10" />
                                </span> : 
                                <Button 
                                onClick={() => addCourse(course.courseId)} 
                                className="tw-bg-transparent hover:tw-bg-transparent tw-text-primary"
                                disabled={!canEditProgram}
                                ><Plus /></Button>} {/* modified 14-09-24*/}
                              </div>
                            </DraggableCourse>
                          ))}
                          {isFetchingNextPage && <p>Loading more...</p>}
                          <div ref={infiniteScrollRef} />
                        </>
                      )}
                    </div>
                    </div>
                  </div>
                </div>

                <div className="tw-flex tw-items-center">
                  <MoveRight className="tw-text-gray-400" />
                </div>
                
                <div className="tw-w-1/2">
                
                <div className={`tw-relative ${!canEditProgram ? 'tw-opacity-50 tw-pointer-events-none' : ''}`}>
                  <Label>Selected Courses</Label>
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

            <div>
              <Label htmlFor="banner">Banner</Label>
              <div className="tw-space-x-4">
                <div className="tw-w-1/2 tw-bg-gray-50 tw-p-4 tw-rounded tw-text-sm tw-inline-flex tw-items-center tw-justify-start">
                  {bannerFile || programData?.bannerBase64 ? (
                    <div className="tw-flex tw-items-center tw-space-x-4">
                      <img
                        src={
                          bannerFile
                            ? URL.createObjectURL(bannerFile)
                            : programData?.bannerBase64
                        }
                        alt="Program banner"
                        className="tw-w-16 tw-h-16 tw-object-cover tw-rounded"
                      />
                      <div>
                        <p className="tw-font-medium">
                          {bannerFile?.name || "Current Banner"}
                        </p>
                        <Button
                          variant="link"
                          onClick={() => document.getElementById("fileInput")?.click()}
                          className="tw-p-0"
                          disabled={!canEditProgram}
                          type="button"
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
              </div>
            </div>
            <Separator />

            {/* {errorMessage && (
              <div className="tw-flex tw-items-center tw-text-red-500">
                <CircleAlert className="tw-w-4 tw-h-4 tw-mr-2" />
                {errorMessage}
              </div>
            )} */}

            {canEditProgram && 
              <Button type="submit" className="tw-w-full"   disabled={!isDirty || updateMutation.isPending}>
                {updateMutation.isPending ? 'Updating...' : 'Update Program'}
              </Button>
            }
          </form>
        </div>
      </div>

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
              }}
            >
              {dialogContent.buttonText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DndProvider>
  );
}

export default ManageProgramDetailsPage;