// ManageCoursesAddPage.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, CircleX, Image, X } from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  CircleArrowDown,
  CircleArrowUp,
  Pencil,
  Trash,
} from "lucide-react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";
import AddModule from "./AddModule";
import EditModule from "./EditModule";

const formSchema = z.object({
  name: z.string().min(1, "Course Name is required"),
  givenCourseId: z.string().min(1, "Course ID is required"),
  description: z.string().optional(),
  skills: z.string().min(1, "Skills are required"),
  duration: z.number().min(1, "Duration is required"),
  isActive: z.boolean(),
  banner: z.instanceof(File).nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface Section {
  id: number;
  title: string;
  type: string;
  content: {
    [key: string]: Array<{
      name?: string;
      lastModified: string;
      size?: string;
      contentId: string;
      link?: string;
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

interface StoredModule extends ModuleData {
  moduleId: string;
}

// Define a more specific type for the API response
interface CourseResponse {
  courseId: string;
  name: string;
  // Add other fields as necessary
}

function ManageCoursesAddPage() {
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [modules, setModules] = useState<StoredModule[]>([]);
  const [selectedModuleIndex, setSelectedModuleIndex] = useState<number | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddingModule, setIsAddingModule] = useState(false);
  const { permissionSet } = usePolicies();
  const canEditCourse = checkActionScopes(permissionSet, "course:write", ["admin","supervisor","organization"]);
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      givenCourseId: "",
      description: "",
      skills: "",
      duration: 1,
      isActive: true,
      banner: null,
    },
  });

  type FormattedSection = {
    title: string;
    type: string;
    contents: string[];
    templateRepository?: string;
    platformType?: string;
    autoGrading?: boolean;
    testCaseGrading?: boolean;
  };

  type FormattedModuleData = {
    title: string;
    summary: string;
    sections: FormattedSection[];
  };

  const createModuleMutation = useMutation<
    { moduleId: string },
    Error,
    FormattedModuleData
  >({
    mutationFn: async (moduleData) => {
      const response = await api.post(`/modules`, moduleData);
      return response.data;
    },
  });

  const createCourseMutation = useMutation<CourseResponse, Error, FormData>({
    mutationFn: async (formData) => {
      const response = await api.post<CourseResponse>('/courses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
  });

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

  if (editingModuleId) {
    return (
      <EditModule
        moduleId={editingModuleId}
        onEditModule={handleEditModule}
        onCancel={() => setEditingModuleId(null)}
      />
    );
  }

  const handleAddModule = async (moduleData: ModuleData) => {
    try {
      const formattedSections: FormattedSection[] = moduleData.sections.map(
        (section) => {
          const baseSection: FormattedSection = {
            title: section.title,
            type: section.type,
            contents: Object.values(section.content)
              .flat()
              .filter(
                (item): item is { contentId: string; lastModified: string } =>
                  item &&
                  typeof item === "object" &&
                  "contentId" in item &&
                  "lastModified" in item
              )
              .map((item) => item.contentId),
          };

          if (section.type === "assignment") {
            return {
              ...baseSection,
              templateRepository: section.templateRepository || "",
              platformType: section.platformType || "Text",
              autoGrading: moduleData.autoAnalysis,
              testCaseGrading: moduleData.testCases,
            };
          }

          return baseSection;
        }
      );

      const formattedModuleData: FormattedModuleData = {
        title: moduleData.title,
        summary: moduleData.summary,
        sections: formattedSections,
      };

      const result =
        await createModuleMutation.mutateAsync(formattedModuleData);

      const storedModule: StoredModule = {
        ...moduleData,
        moduleId: result.moduleId,
      };

      setModules((prevModules) => [...prevModules, storedModule]);
      setIsAddingModule(false);
    } catch (error) {
      console.error("Error creating module:", error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setBannerFile(file);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        const value = data[key as keyof FormData];
        if (key !== 'banner' && value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Append modules to formData
      modules.forEach(module => formData.append('modules[]', module.moduleId));

      // Keep the banner
      if (bannerFile) {
        formData.append('banner', bannerFile);
      }

      await createCourseMutation.mutateAsync(formData);
      
      // Reset the form and clear modules
      form.reset({
        name: "",
        givenCourseId: "",
        description: "",
        skills: "",
        duration: 1,
        isActive: true,
        banner: null,
      });
      setModules([]);
      setSelectedModuleIndex(null);
      setBannerFile(null);
      setDialogMessage("Course added successfully!");
      setShowDialog(true);
    } catch (error) {
      console.error("Error creating course:", error);
      setErrorMessage("Failed to create course. Please try again.");
      setShowErrorDialog(true);
    }
  };

  const deleteModule = (index: number) => {
    setModules(modules.filter((_, i) => i !== index));
    if (selectedModuleIndex === index) setSelectedModuleIndex(null);
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

  if (isAddingModule) {
    return (
      <AddModule
        onAddModule={handleAddModule}
        onCancel={() => {
          setIsAddingModule(false);
          setSelectedModuleIndex(null);
        }}
        initialData={
          selectedModuleIndex !== null
            ? modules[selectedModuleIndex]
            : undefined
        }
      />
    );
  }

  return (
    <div className="tw-w-full tw-max-w-3xl">
      <div className="tw-bg-white tw-shadow-md tw-rounded-lg tw-p-6">
        <Form {...form}>
          <form className="tw-space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Name</FormLabel>
                  <FormControl>
                    <Input
                      className="tw-w-full"
                      placeholder="Enter Course Name"
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
                  <FormLabel>Create Course ID</FormLabel>
                  <FormControl>
                    <Input
                      className="tw-w-full"
                      placeholder="Enter Course ID"
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
                      placeholder="Enter Description"
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
                      placeholder="Enter your Skills"
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
              name="duration"
              render={({ field }) => (
                <FormItem className="tw-flex-1">
                  <FormLabel>Course Duration</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
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
                      onCheckedChange={(checked) =>
                        field.onChange(checked as boolean)
                      }
                      disabled={!canEditCourse}
                    />
                    <Label>Active</Label>
                    <Checkbox
                      checked={!field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(!(checked as boolean))
                      }
                      disabled={!canEditCourse}
                    />
                    <Label>Inactive</Label>
                  </div>
                </FormItem>
              )}
            />

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
                    <div key={moduleIndex}>
                      <div
                        className={`tw-flex tw-items-center tw-justify-between tw-text-sm tw-py-1 tw-font-normal ${
                          selectedModuleIndex === moduleIndex
                            ? "tw-bg-blue-50"
                            : ""
                        }`}
                        onClick={() => setSelectedModuleIndex(moduleIndex)}
                        aria-disabled={!canEditCourse}
                      >
                        <span>
                          {moduleIndex + 1}. {module.title}
                        </span>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="tw-p-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingModuleId(module.moduleId);
                            }}
                            disabled={!canEditCourse}
                          >
                            <Pencil className="tw-h-3 tw-w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteModule(moduleIndex);
                            }}
                            className="tw-p-1"
                            disabled={!canEditCourse}
                          >
                            <Trash className="tw-h-3 tw-w-3" />
                          </Button>
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
                    selectedModuleIndex === null || selectedModuleIndex === 0 || !canEditCourse
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
                    selectedModuleIndex === null || selectedModuleIndex === 0 || !canEditCourse
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
                    selectedModuleIndex === modules.length - 1 || !canEditCourse
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
                    selectedModuleIndex === modules.length - 1 || !canEditCourse
                  }
                >
                  <CircleArrowDown className="tw-h-5 tw-w-5" />
                </Button>
              </div>
            </div>

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
                          disabled={!canEditCourse}
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
                          disabled={!canEditCourse}
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

            <Separator />

            <div className="tw-flex tw-justify-start">
              {canEditCourse && 
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                className="tw-px-6"
                >
                  Submit
              </Button>
              }
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

export default ManageCoursesAddPage;