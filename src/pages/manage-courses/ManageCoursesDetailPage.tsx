import React, { useState, useEffect } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CircleCheck, CircleX, Eye, X } from "lucide-react";
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
import {
  CircleArrowUp,
  CircleArrowDown,
  ArrowUp,
  ArrowDown,
  Trash,
  Pencil,
  Image,
} from "lucide-react";
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import AddModule from "./AddModule";
import EditModule from "./EditModule";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

const formSchema = z.object({
  name: z.string().min(1, "Course Name is required"),
  givenCourseId: z.string().min(1, "Course ID is required"),
  description: z.string().optional(),
  skills: z.string().min(1, "Skills are required"),
  duration: z.number().min(1, "Duration is required"),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface StoredModule extends ModuleData {
  moduleId: string;
  name: string;
  position: number;
}

interface Section {
  moduleSectionId?: string;
  id: number;
  title: string;
  type: string;
  content: {
    readingMaterials?: Array<{
      name: string;
      lastModified: string;
      size: string;
      contentId: string;
    }>;
    links?: Array<{
      link: string;
      lastModified: string;
      contentId: string;
    }>;
    assignments?: Array<{
      name: string;
      lastModified: string;
      size: string;
      contentId: string;
    }>;
  };
  templateRepository?: string;
  platformType?: string;
  autoGrading?: boolean;
  testCaseGrading?: boolean;
}

interface ModuleData {
  title: string;
  summary: string;
  autoAnalysis: boolean;
  testCases: boolean;
  sections: Section[];
}

interface CourseData {
  // ... existing fields
  bannerBase64?: string;
}

function ManageCoursesDetailsPage() {
  const { courseId } = useParams({
    from: "/_authenticated/manage-courses/$courseId",
  });

  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [modules, setModules] = useState<StoredModule[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(
    null
  );
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { permissionSet } = usePolicies();
  const canEditCourse = checkActionScopes(permissionSet, "course:write", [
    "admin",
    "supervisor",
    "organization",
  ]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const fetchCourse = async (courseId: string) => {
    const response = await api.get(
      `/courses/${courseId}?includeModuleCount=true&includeModules=true`
    );
    return response;
  };

  const {
    data: course,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "course",
      courseId,
      { includeModuleCount: true, includeModules: true },
    ],
    queryFn: () => fetchCourse(courseId),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      givenCourseId: "",
      description: "",
      skills: "",
      duration: 1,
      isActive: true,
    },
  });

  useEffect(() => {
    if (course?.data) {
      const courseDetail = course.data;

      form.reset({
        name: courseDetail.name,
        givenCourseId: courseDetail.givenCourseId,
        description: courseDetail.description || "",
        skills: courseDetail.skills,
        duration: courseDetail.duration,
        isActive: courseDetail.isActive,
      });

      // Sort modules by position before setting state
      const sortedModules = courseDetail.modules
        .map((module: any) => ({
          ...module,
          autoAnalysis: module.autoAnalysis || false,
          testCases: module.testCases || false,
          sections: module.sections || [],
        }))
        .sort((a: StoredModule, b: StoredModule) => a.position - b.position);

      setModules(sortedModules);
    }
  }, [course, form]);

  const mutation = useMutation<
    FormData,
    AxiosError,
    Partial<FormData> & { modules: string[] }
  >({
    mutationFn: (updatedCourse) =>
      api.patch(`/courses/${courseId}`, updatedCourse),
    onSuccess: () => {
      refetch();
      setDialogMessage("Course updated successfully!");
      setShowDialog(true);
    },
    onError: (error) => {
      console.error("Error updating course:", error);
      setErrorMessage("Failed to update course. Please try again.");
      setShowErrorDialog(true);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setBannerFile(file);
    }
  };

  const onSubmit = (data: FormData) => {
    const formData = new FormData();
    const dirtyFields = form.formState.dirtyFields;

    // if (dirtyFields.name) patchPayload.name = data.name;
    // if (dirtyFields.givenCourseId)
    //   patchPayload.givenCourseId = data.givenCourseId;
    // if (dirtyFields.description) patchPayload.description = data.description;
    // if (dirtyFields.skills) patchPayload.skills = data.skills;
    // if (dirtyFields.duration) patchPayload.duration = data.duration;
    // if (dirtyFields.isActive) patchPayload.isActive = data.isActive;
    
    Object.keys(data).forEach((key) => {
      const typedKey = key as keyof FormData;
      if (typedKey !== 'banner' && data[typedKey] !== undefined && dirtyFields?.[typedKey]) {
        formData.append(typedKey, data[typedKey].toString());
      }
    });

    // Handle banner file
    // if (bannerFile) {
    //   formData.append('banner', bannerFile);
    // } 
    modules.forEach(module => formData.append('modules[]', module.moduleId));
    // Always include isActive in the update
    // if (!formData.has('isActive')) {
    //   formData.append('isActive', data.isActive.toString());
    // }

    if (formData.entries().next().done) {
      // No changes to update
      return;
    }

    mutation.mutate(formData);
  };

  const handleAddModule = async (moduleData: ModuleData) => {
    try {
      const formattedSections = moduleData.sections.map((section) => {
        const sectionData: any = {
          title: section.title,
          type: section.type,
          contents: Object.values(section.content)
            .flat()
            .filter((item) => item && item.contentId)
            .map((item) => item.contentId),
        };

        // Only include assignment-specific fields for assignment type sections
        if (section.type === "assignment") {
          sectionData.templateRepository = section.templateRepository || "";
          sectionData.platformType = section.platformType || "Text";
          sectionData.autoGrading = section.autoGrading || false;
          sectionData.testCaseGrading = section.testCaseGrading || false;
        }

        return sectionData;
      });

      const formattedModuleData = {
        title: moduleData.title,
        summary: moduleData.summary,
        sections: formattedSections,
        courseId: courseId,
      };

      const response = await api.post(`/modules`, formattedModuleData);
      const newModule = response.data;
      setModules((prevModules) => [
        ...prevModules,
        {
          ...newModule,
          name: newModule.title, // Use title as name initially
        },
      ]);
      setIsAddingModule(false);
    } catch (error) {
      console.error("Error adding module:", error);
    }
  };

  const handleEditModule = (updatedModuleData: ModuleData) => {
    setModules((prevModules) =>
      prevModules.map((module) =>
        module.moduleId === editingModuleId
          ? { ...module, ...updatedModuleData }
          : module
      )
    );
    setEditingModuleId(null);
  };

  const deleteModule = (moduleId: string) => {
    setModules((prevModules) =>
      prevModules.filter((module) => module.moduleId !== moduleId)
    );
  };

  const moveModule = (
    index: number,
    direction: "top" | "up" | "down" | "bottom"
  ) => {
    if (index === null || index < 0 || index >= modules.length) return;

    setModules((prevModules) => {
      const newModules = [...prevModules];
      const [movedModule] = newModules.splice(index, 1);

      switch (direction) {
        case "top":
          newModules.unshift(movedModule);
          setSelectedModuleIndex(0);
          break;
        case "up":
          if (index > 0) {
            newModules.splice(index - 1, 0, movedModule);
            setSelectedModuleIndex(index - 1);
          } else {
            newModules.push(movedModule);
            setSelectedModuleIndex(newModules.length - 1);
          }
          break;
        case "down":
          if (index < newModules.length) {
            newModules.splice(index + 1, 0, movedModule);
            setSelectedModuleIndex(index + 1);
          } else {
            newModules.unshift(movedModule);
            setSelectedModuleIndex(0);
          }
          break;
        case "bottom":
          newModules.push(movedModule);
          setSelectedModuleIndex(newModules.length - 1);
          break;
      }

      return newModules;
    });
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  if (isAddingModule) {
    return (
      <AddModule
        onAddModule={handleAddModule}
        onCancel={() => setIsAddingModule(false)}
      />
    );
  }

  if (editingModuleId) {
    return (
      <EditModule
        moduleId={editingModuleId}
        onEditModule={handleEditModule}
        onCancel={() => setEditingModuleId(null)}
      />
    );
  }

  return (
    <div className="tw-w-full tw-max-w-3xl">
      <div className="tw-bg-white tw-shadow-md tw-rounded-lg tw-p-6">
        <h1 className="tw-text-2xl tw-font-bold tw-mb-6">Edit Course</h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="tw-space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input
                      className="tw-w-full"
                      placeholder="Programming fundamentals"
                      {...field}
                      disabled={!canEditCourse}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="givenCourseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course ID</FormLabel>
                  <FormControl>
                    <Input
                      className="tw-w-full"
                      placeholder="583RT"
                      {...field}
                      disabled={!canEditCourse}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="tw-text-gray-400">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="tw-w-full"
                      placeholder="Programming fundamentals are the essential principles and concepts that form the foundation of writing and understanding code in any programming language."
                      {...field}
                      disabled={!canEditCourse}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="skills"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills Gain</FormLabel>
                  <FormControl>
                    <Textarea
                      className="tw-w-full"
                      placeholder="Problem-solving, logical thinking, debugging, code optimization, understanding algorithms, and proficiency in various programming languages and tools."
                      {...field}
                      disabled={!canEditCourse}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="tw-flex tw-items-center tw-space-x-6">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem className="tw-flex-1">
                    <FormLabel>Course Duration</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      disabled={!canEditCourse}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 54 }, (_, i) => i + 1).map(
                          (weeks) => (
                            <SelectItem key={weeks} value={weeks.toString()}>
                              {weeks} {weeks === 1 ? "week" : "weeks"}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="tw-flex tw-items-center tw-mt-8 tw-space-x-4">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={() => field.onChange(true)}
                        disabled={!canEditCourse}
                      />
                      <Label>Active</Label>
                      <Checkbox
                        checked={!field.value}
                        onCheckedChange={() => field.onChange(false)}
                        disabled={!canEditCourse}
                      />
                      <Label>Inactive</Label>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="tw-text-sm tw-text-gray-500 tw-mb-2">
                You can create as many modules as required, click the button
                below.
              </p>
              <Button
                onClick={() => setIsAddingModule(true)}
                type="button"
                variant="outline"
                className="tw-border-2 tw-border-primary tw-text-primary"
                disabled={!canEditCourse}
              >
                Create Module
              </Button>
            </div>

            <div className="tw-flex tw-items-center tw-space-x-4">
              <div className="tw-flex-1 tw-bg-gray-100 tw-border tw-border-gray-200 tw-rounded-md">
                <h3 className="tw-text-medium tw-font-medium tw-p-2">
                  Modules
                </h3>
                <Separator />
                <div className="tw-max-h-36 tw-overflow-y-auto tw-p-4">
                  {modules.map((module, moduleIndex) => (
                    <div key={module.moduleId}>
                      <div
                        className={`tw-flex tw-items-center tw-justify-between tw-text-sm tw-py-1 tw-font-normal ${
                          selectedModuleIndex === moduleIndex
                            ? "tw-bg-blue-50"
                            : ""
                        }`}
                        onClick={() => setSelectedModuleIndex(moduleIndex)}
                      >
                        <span>
                          {moduleIndex + 1}. {module.name || module.title}
                        </span>
                        <div>
                          {canEditCourse ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="tw-p-1"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingModuleId(module.moduleId);
                                }}
                              >
                                <Pencil className="tw-h-3 tw-w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteModule(module.moduleId);
                                }}
                                className="tw-p-1"
                              >
                                <Trash className="tw-h-3 tw-w-3" />
                              </Button>
                            </>
                          ):(<>
                            <Link to={`/all/courses/${courseId}`}>
                              <Eye />
                            </Link>
                          </>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tw-flex tw-flex-col tw-justify-center tw-space-y-2">
                <Button
                  type="button"
                  onClick={() =>
                    selectedModuleIndex !== null &&
                    moveModule(selectedModuleIndex, "top")
                  }
                  variant="secondary"
                  size="sm"
                  disabled={
                    selectedModuleIndex === null ||
                    selectedModuleIndex === 0 ||
                    !canEditCourse
                  }
                >
                  <CircleArrowUp className="tw-h-5 tw-w-5" />
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    selectedModuleIndex !== null &&
                    moveModule(selectedModuleIndex, "up")
                  }
                  variant="secondary"
                  size="sm"
                  disabled={
                    selectedModuleIndex === null ||
                    selectedModuleIndex === 0 ||
                    !canEditCourse
                  }
                >
                  <ArrowUp className="tw-h-5 tw-w-5" />
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    selectedModuleIndex !== null &&
                    moveModule(selectedModuleIndex, "down")
                  }
                  variant="secondary"
                  size="sm"
                  disabled={
                    selectedModuleIndex === null ||
                    selectedModuleIndex === modules.length - 1 ||
                    !canEditCourse
                  }
                >
                  <ArrowDown className="tw-h-5 tw-w-5" />
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    selectedModuleIndex !== null &&
                    moveModule(selectedModuleIndex, "bottom")
                  }
                  variant="secondary"
                  size="sm"
                  disabled={
                    selectedModuleIndex === null ||
                    selectedModuleIndex === modules.length - 1 ||
                    !canEditCourse
                  }
                >
                  <CircleArrowDown className="tw-h-5 tw-w-5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <Label htmlFor="banner">Banner</Label>
              <div className="tw-space-x-4">
                <div className="tw-w-1/2 tw-bg-gray-50 tw-p-4 tw-rounded tw-text-sm tw-inline-flex tw-items-center tw-justify-start">
                  {bannerFile || course?.data?.bannerBase64 ? (
                    <div className="tw-flex tw-items-center tw-space-x-4">
                      <img
                        src={
                          bannerFile
                            ? URL.createObjectURL(bannerFile)
                            : course?.data?.bannerBase64
                        }
                        alt="Course banner"
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
                          disabled={!canEditCourse}
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

            <div className="tw-flex tw-justify-start">
              {canEditCourse && (
                <Button type="submit" className="tw-px-6">
                  Update Course
                </Button>
              )}
            </div>
          </form>
          <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
            <AlertDialogContent className="tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
              <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
                <button
                  className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
                  onClick={() => setShowDialog(false)}
                  aria-label="Close"
                >
                  <X className="tw-text-xl" />
                </button>
                <CircleCheck className="tw-text-green-500" size={64} />
                <AlertDialogTitle>
                  <span>Completed</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="tw-mt-4 tw-text-center">
                  {dialogMessage}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="tw-flex !tw-justify-center">
                <AlertDialogAction onClick={() => setShowDialog(false)}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
            <AlertDialogContent className="tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
              <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
                <button
                  className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
                  onClick={() => setShowErrorDialog(false)}
                  aria-label="Close"
                >
                  <X className="tw-text-xl" />
                </button>
                <CircleX className="tw-text-red-500" size={64} />
                <AlertDialogTitle>
                  <span>Error</span>
                </AlertDialogTitle>
                <AlertDialogDescription className="tw-mt-4 tw-text-center">
                  {errorMessage}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="tw-flex !tw-justify-center">
                <AlertDialogAction onClick={() => setShowErrorDialog(false)}>
                  Try Again
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Form>
      </div>
    </div>
  );
}

export default ManageCoursesDetailsPage;