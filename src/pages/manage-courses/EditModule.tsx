import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Upload, Trash, ArrowUp, ArrowDown, CircleCheck, CircleX, X } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContentMutationVariables {
  type: string;
  url?: string;
  file?: File;
  objectType?: string;
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
    githubAssignmentName?: string;
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

interface EditModuleProps {
  moduleId: string;
  onEditModule: (moduleData: ModuleData) => void;
  onCancel: () => void;
}

const PlatformTypeMap = {
  "26d149f5-76e0-40c8-bf48-2c41cf5b47cc": "Text",
  "c7e8fa0f-4496-4902-bdeb-d706678aadf0": "CodeAssist",
  "9e9c418b-265a-4be7-a992-bd72bbea528e": "TextToSql",
  "c5000ff5-e2cc-4fc1-8b3f-51786293259f": "TextToExcel",
} as const;

type PlatformTypeId = keyof typeof PlatformTypeMap;
type PlatformTypeText = (typeof PlatformTypeMap)[PlatformTypeId];

const PlatformTypes: PlatformTypeText[] = [
  "Text",
  "CodeAssist",
  "TextToSql",
  "TextToExcel",
];

const EditModule: React.FC<EditModuleProps> = ({
  moduleId,
  onEditModule,
  onCancel,
}) => {
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState("");
  const [newLink, setNewLink] = useState("");
  const [currentSectionId, setCurrentSectionId] = useState<number | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
const [showErrorDialog, setShowErrorDialog] = useState(false);
const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      const response = await api.get(
        `/modules/${moduleId}?includeModuleSections=true&includeSectionContents=true`
      );
      return response.data;
    },
  });

  useEffect(() => {
    if (data) {
      setModuleData({
        title: data.title || "",
        summary: data.summary || "",
        autoAnalysis: data.autoAnalysis || false,
        testCases: data.testCases || false,
        sections: data.moduleSections
          ? data.moduleSections.map((section: any) => ({
              id: section.moduleSectionId,
              moduleSectionId: section.moduleSectionId,
              title: section.title,
              type: section.sectionType,
              content: {
                readingMaterials: section.contents
                  .filter(
                    (content: any) =>
                      content.type === "file" &&
                      content.binaryObject.metadata.objectType ===
                        "readingMaterialContent"
                  )
                  .map((content: any) => ({
                    name: content.binaryObject.originalFileName,
                    lastModified: new Date(
                      content.binaryObject.metadata.uploadedAt
                    ).toLocaleDateString(),
                    size: `${(parseInt(content.binaryObject.fileSize) / (1024 * 1024)).toFixed(2)} MB`,
                    contentId: content.contentId,
                  })),
                links: section.contents
                  .filter((content: any) => content.type === "link")
                  .map((content: any) => ({
                    link: content.url,
                    lastModified: new Date(section.updatedAt).toLocaleDateString(),
                    contentId: content.contentId,
                  })),
                assignments: section.contents
                  .filter(
                    (content: any) =>
                      content.type === "file" &&
                      content.binaryObject.metadata.objectType ===
                        "assignmentContent"
                  )
                  .map((content: any) => ({
                    name: content.binaryObject.originalFileName,
                    lastModified: new Date(
                      content.binaryObject.metadata.uploadedAt
                    ).toLocaleDateString(),
                    size: `${(parseInt(content.binaryObject.fileSize) / (1024 * 1024)).toFixed(2)} MB`,
                    contentId: content.contentId,
                  })),
              },
              templateRepository:
                section.assignmentInfo?.templateRepository || "",
              platformType:
                PlatformTypeMap[
                  section.assignmentInfo?.platformType as PlatformTypeId
                ] || "Text",
              autoGrading: section.assignmentInfo?.autoGrading || false,
              testCaseGrading: section.assignmentInfo?.testCaseGrading || false,
            }))
          : [],
      });
    }
  }, [data]);

  const updateModuleMutation = useMutation({
    mutationFn: async (updatedModuleData: ModuleData) => {
      const payload = {
        title: updatedModuleData.title,
        summary: updatedModuleData.summary,
        sections: updatedModuleData.sections.map((section) => {
          const sectionPayload: any = {
            title: section.title,
            contents: [
              ...(section.content.readingMaterials || []),
              ...(section.content.links || []),
              ...(section.content.assignments || []),
            ].map((item) => item.contentId),
          };

          if (section.moduleSectionId) {
            sectionPayload.moduleSectionId = section.moduleSectionId;
          } else {
            sectionPayload.type = section.type;
          }

          if (section.type === "assignment") {
            sectionPayload.templateRepository =
              section.templateRepository || "";
            sectionPayload.platformType = section.platformType || "Text";
            sectionPayload.autoGrading = section.autoGrading || false;
            sectionPayload.testCaseGrading = section.testCaseGrading || false;
          }

          return sectionPayload;
        }),
      };
      const response = await api.put(
        `/modules/${moduleId}`,
        payload
      );
      return response.data;
    },
    onSuccess: () => {
      // Refetch the module data
      // You might want to use a queryClient to invalidate the query
      // queryClient.invalidateQueries({ queryKey: ["module", moduleId] });
    },
  });

  const createContentMutation = useMutation({
    mutationFn: async ({
      type,
      url,
      file,
      objectType,
    }: ContentMutationVariables) => {
      let endpoint = `/contents/?type=${type}`;
      if (type === "link" && url) {
        endpoint += `&url=${encodeURIComponent(url)}`;
      } else if (type === "file" && objectType) {
        endpoint += `&objectType=${objectType}`;
      }

      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      }

      const response = await api.post(endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
  });

  const handleEditModule = async () => {
    if (moduleData) {
      try {
        await updateModuleMutation.mutateAsync(moduleData);
        setShowSuccessDialog(true);
      } catch (error) {
        console.error("Error updating module:", error);
        setErrorMessage("Failed to update the module. Please try again.");
        setShowErrorDialog(true);
      }
    }
  };

  const handleAddSection = (index: number | null) => {
    setIsAlertOpen(true);
    setCurrentSectionId(index);
  };

  const handleSectionConfirm = () => {
    if (newSectionTitle && newSectionType && moduleData) {
      const newSection: Section = {
        id: uuidv4(), // Use UUID for unique IDs
        title: newSectionTitle,
        type: newSectionType,
        content: {},
      };

      setModuleData((prevData) => {
        if (!prevData) return null;
        const newSections = [...prevData.sections];
        if (currentSectionId !== null) {
          newSections.splice(currentSectionId + 1, 0, newSection);
        } else {
          newSections.push(newSection);
        }
        return { ...prevData, sections: newSections };
      });

      setNewSectionTitle("");
      setNewSectionType("");
      setIsAlertOpen(false);
      setCurrentSectionId(null);
    }
  };
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    sectionId: number,
    fileType: string
  ) => {
    const files = event.target.files;
    if (files && moduleData) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const result = await createContentMutation.mutateAsync({
            type: "file",
            file,
            objectType:
              fileType === "readingMaterials"
                ? "readingMaterialContent"
                : "assignmentContent",
          });

          const newFile = {
            name: file.name,
            lastModified: new Date().toLocaleDateString(),
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            contentId: result.contentId,
          };

          setModuleData((prevData) => {
            if (!prevData) return null;
            return {
              ...prevData,
              sections: prevData.sections.map((section) => {
                if (section.id === sectionId) {
                  return {
                    ...section,
                    content: {
                      ...section.content,
                      [fileType]: [
                        ...(section.content[
                          fileType as keyof Section["content"]
                        ] || []),
                        newFile,
                      ],
                    },
                  };
                }
                return section;
              }),
            };
          });
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }
    }
  };

  const handleLinkAdd = async () => {
    if (newLink && currentSectionId !== null && moduleData) {
      try {
        const result = await createContentMutation.mutateAsync({
          type: "link",
          url: newLink,
        });

        setModuleData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            sections: prevData.sections.map((section) => {
              if (section.id === currentSectionId) {
                return {
                  ...section,
                  content: {
                    ...section.content,
                    links: [
                      ...(section.content.links || []),
                      {
                        link: newLink,
                        lastModified: new Date().toLocaleDateString(),
                        contentId: result.contentId,
                      },
                    ],
                  },
                };
              }
              return section;
            }),
          };
        });
        setNewLink("");
        setIsAddLinkOpen(false);
        setCurrentSectionId(null);
      } catch (error) {
        console.error("Error adding link:", error);
      }
    }
  };

  const handleDelete = (sectionId: number, itemIndex: number, type: string) => {
    setModuleData((prevData) => {
      if (!prevData) return null;
      return {
        ...prevData,
        sections: prevData.sections.map((section) => {
          if (section.id === sectionId) {
            const content = section.content[type as keyof Section["content"]];
            if (Array.isArray(content)) {
              return {
                ...section,
                content: {
                  ...section.content,
                  [type]: content.filter((_, i) => i !== itemIndex),
                },
              };
            }
          }
          return section;
        }),
      };
    });
  };
  const renderTable = (items: any[], sectionId: number, type: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="tw-w-16">S No.</TableHead>
          <TableHead>{type === "links" ? "Links" : "Name"}</TableHead>
          <TableHead>Last modified</TableHead>
          {type !== "links" && <TableHead>Size & Format</TableHead>}
          <TableHead className="tw-w-24">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, index) => (
          <TableRow key={index}>
            <TableCell>{(index + 1).toString().padStart(2, "0")}</TableCell>
            <TableCell>{type === "links" ? item.link : item.name}</TableCell>
            <TableCell>{item.lastModified}</TableCell>
            {type !== "links" && <TableCell>{item.size}</TableCell>}
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(sectionId, index, type)}
              >
                <Trash className="tw-w-4 tw-h-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const ReadingMaterialsSection: React.FC<{ section: Section }> = ({
    section,
  }) => (
    <div>
      <Label>Reading Materials</Label>
      <div className="tw-flex tw-items-center tw-space-x-2 tw-mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            document
              .getElementById(`file-upload-${section.id}-reading`)
              ?.click()
          }
          className="tw-flex tw-items-center"
        >
          <Upload className="tw-w-4 tw-h-4 tw-mr-2" />
          Choose file
        </Button>
        <span className="tw-text-sm tw-text-gray-500">
          Accepted file types: Imgs and Docs
        </span>
      </div>
      <input
        type="file"
        id={`file-upload-${section.id}-reading`}
        className="tw-hidden"
        onChange={(e) => handleFileUpload(e, section.id, "readingMaterials")}
        multiple
      />
      {section.content.readingMaterials &&
        section.content.readingMaterials.length > 0 &&
        renderTable(
          section.content.readingMaterials,
          section.id,
          "readingMaterials"
        )}
    </div>
  );

  const LinksSection: React.FC<{ section: Section }> = ({ section }) => (
    <div>
      <Label>Links</Label>
      <div className="tw-flex tw-items-center tw-space-x-2 tw-mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCurrentSectionId(section.id);
            setIsAddLinkOpen(true);
          }}
          className="tw-flex tw-items-center"
        >
          <Plus className="tw-w-4 tw-h-4 tw-mr-2" />
          Add Link
        </Button>
        <span className="tw-text-sm tw-text-gray-500">
          Accepted link from: Web source and YouTube
        </span>
      </div>
      {section.content.links &&
        section.content.links.length > 0 &&
        renderTable(section.content.links, section.id, "links")}
    </div>
  );

  const AssignmentsSection: React.FC<{ section: Section }> = ({ section }) => {
    const [platformType, setPlatformType] = useState<PlatformTypeText>(
      (section.platformType as PlatformTypeText) || "Text"
    );
    const [templateRepository, setTemplateRepository] = useState(
      section.templateRepository || ""
    );

    useEffect(() => {
      setPlatformType((section.platformType as PlatformTypeText) || "Text");
      setTemplateRepository(section.templateRepository || "");
    }, [section]);

    const updateSectionContent = () => {
      setModuleData((prevData) => {
        if (!prevData) return null;
        return {
          ...prevData,
          sections: prevData.sections.map((s) => {
            if (s.id === section.id) {
              return {
                ...s,
                platformType,
                templateRepository,
                content: {
                  ...s.content,
                },
              };
            }
            return s;
          }),
        };
      });
    };

    return (
      <>
        <div className="tw-mb-2">
          <Label>Create Platform Link</Label>
          <div className="tw-bg-gray-100 tw-p-4 tw-rounded-md tw-space-y-4">
            <div className="tw-flex tw-space-x-4">
            <div className="tw-flex-1">
              <Label htmlFor={`platformType-${section.id}`}>
                Platform Type
              </Label>
              <Select
                value={platformType}
                onValueChange={(value: PlatformTypeText) => {
                  setPlatformType(value);
                }}
              >
                <SelectTrigger className="tw-bg-white" id={`platformType-${section.id}`}>
                  <SelectValue placeholder="Select platform type" />
                </SelectTrigger>
                <SelectContent>
                  {PlatformTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
              <div className="tw-flex-1">
                <Label htmlFor={`templateRepository-${section.id}`}>
                  Template Repository
                </Label>
                <Input
                  id={`templateRepository-${section.id}`}
                  value={templateRepository}
                  onChange={(e) => {
                    setTemplateRepository(e.target.value);
                  }}
                  onBlur={updateSectionContent}
                  className="tw-w-full tw-bg-white"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="tw-flex tw-space-x-4">
          <div className="tw-flex tw-items-center">
            <Checkbox
              id={`auto-analysis-${section.id}`}
              checked={section.autoGrading}
              onCheckedChange={(checked) =>
                setModuleData((prevData) =>
                  prevData
                    ? {
                        ...prevData,
                        sections: prevData.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, autoGrading: checked as boolean }
                            : s
                        ),
                      }
                    : null
                )
              }
            />
            <Label htmlFor={`auto-analysis-${section.id}`} className="tw-ml-2">
              Auto Analysis
            </Label>
          </div>
          <div className="tw-flex tw-items-center">
            <Checkbox
              id={`test-cases-${section.id}`}
              checked={section.testCaseGrading}
              onCheckedChange={(checked) =>
                setModuleData((prevData) =>
                  prevData
                    ? {
                        ...prevData,
                        sections: prevData.sections.map((s) =>
                          s.id === section.id
                            ? { ...s, testCaseGrading: checked as boolean }
                            : s
                        ),
                      }
                    : null
                )
              }
            />
            <Label htmlFor={`test-cases-${section.id}`} className="tw-ml-2">
              Test Cases
            </Label>
          </div>
        </div>
        <div>
          <Label>Assignments</Label>
          <div className="tw-flex tw-items-center tw-space-x-2 tw-mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                document
                  .getElementById(`file-upload-${section.id}-assignments`)
                  ?.click()
              }
              className="tw-flex tw-items-center"
            >
              <Upload className="tw-w-4 tw-h-4 tw-mr-2" />
              Choose file
            </Button>
            <span className="tw-text-sm tw-text-gray-500">
              Accepted file types: Imgs and Docs
            </span>
          </div>
          <input
            type="file"
            id={`file-upload-${section.id}-assignments`}
            className="tw-hidden"
            onChange={(e) => handleFileUpload(e, section.id, "assignments")}
            multiple
          />
          {section.content.assignments &&
            section.content.assignments.length > 0 &&
            renderTable(section.content.assignments, section.id, "assignments")}
        </div>
      </>
    );
  };

  const renderSectionContent = (section: Section) => {
    switch (section.type) {
      case "readingMaterial":
        return <ReadingMaterialsSection section={section} />;
      case "links":
        return <LinksSection section={section} />;
      case "assignment":
        return <AssignmentsSection section={section} />;
      default:
        return null;
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  if (!moduleData) return <div>No module data available</div>;

  return (
    <div className="tw-max-w-3xl tw-mt-8 tw-p-6 tw-bg-white tw-rounded-lg tw-shadow">
      <div className="tw-space-y-6">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={moduleData.title}
            onChange={(e) =>
              setModuleData({ ...moduleData, title: e.target.value })
            }
            className="tw-w-full"
            placeholder="Enter Title"
          />
        </div>

        <div>
          <Label htmlFor="summary">Summary (Optional)</Label>
          <Textarea
            id="summary"
            value={moduleData.summary}
            onChange={(e) =>
              setModuleData({ ...moduleData, summary: e.target.value })
            }
            className="tw-w-full tw-h-20"
            placeholder="Enter Summary"
          />
        </div>

        {moduleData.sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div className="tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-lg tw-font-semibold">{section.title}</h3>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newSections = [...moduleData.sections];
                    if (index > 0) {
                      [newSections[index - 1], newSections[index]] = [
                        newSections[index],
                        newSections[index - 1],
                      ];
                      setModuleData({ ...moduleData, sections: newSections });
                    }
                  }}
                  disabled={index === 0}
                >
                  <ArrowUp className="tw-w-4 tw-h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newSections = [...moduleData.sections];
                    if (index < newSections.length - 1) {
                      [newSections[index], newSections[index + 1]] = [
                        newSections[index + 1],
                        newSections[index],
                      ];
                      setModuleData({ ...moduleData, sections: newSections });
                    }
                  }}
                  disabled={index === moduleData.sections.length - 1}
                >
                  <ArrowDown className="tw-w-4 tw-h-4" />
                </Button>
              </div>
            </div>
            {renderSectionContent(section)}

            <div className="tw-flex tw-items-center tw-justify-center">
              <Separator className="tw-flex-grow" />
              <Button
                variant="outline"
                size="sm"
                className="tw-rounded-full tw-p-2 tw-mx-4"
                onClick={() => handleAddSection(index)}
              >
                <Plus className="tw-w-4 tw-h-4" />
              </Button>
              <Separator className="tw-flex-grow" />
            </div>
          </React.Fragment>
        ))}

        {moduleData.sections.length === 0 && (
          <div className="tw-flex tw-items-center tw-justify-center">
            <Separator className="tw-flex-grow" />
            <Button
              variant="outline"
              size="sm"
              className="tw-rounded-full tw-p-2 tw-mx-4"
              onClick={() => handleAddSection(null)}
            >
              <Plus className="tw-w-4 tw-h-4" />
            </Button>
            <Separator className="tw-flex-grow" />
          </div>
        )}

        <div className="tw-flex tw-justify-end">
          <Button onClick={onCancel} variant="outline" className="tw-mr-2">
            Cancel
          </Button>
          <Button
            onClick={handleEditModule}
            className="tw-bg-blue-600 tw-text-white"
          >
            Update Module
          </Button>
        </div>
      </div>

      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
  <AlertDialogContent className="tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
    <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
      <button
        className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
        onClick={() => setShowSuccessDialog(false)}
        aria-label="Close"
      >
        <X className="tw-text-xl" />
      </button>
      <CircleCheck className="tw-text-green-500" size={64} />
      <AlertDialogTitle>
        <span>Completed</span>
      </AlertDialogTitle>
      <AlertDialogDescription className="tw-mt-4 tw-text-center">
        Successfully updated the module.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter className="tw-flex !tw-justify-center">
      <AlertDialogAction onClick={() => {
        setShowSuccessDialog(false);
        onCancel(); // This will redirect back
      }}>
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

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Section</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a title and choose the type of section you want to add:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section Title"
            className="tw-mb-4"
          />
          <Select onValueChange={setNewSectionType} value={newSectionType}>
            <SelectTrigger className="tw-bg-white">
              <SelectValue placeholder="Select section type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="readingMaterial">Reading Materials</SelectItem>
              <SelectItem value="links">Links</SelectItem>
              <SelectItem value="assignment">Assignments</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAlertOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleSectionConfirm}>Add Section</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isAddLinkOpen} onOpenChange={setIsAddLinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add Links</AlertDialogTitle>
          </AlertDialogHeader>
          <Input
            value={newLink}
            onChange={(e) => setNewLink(e.target.value)}
            placeholder="Paste your link here"
            className="tw-mb-4"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAddLinkOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleLinkAdd}>Upload</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditModule;
