// AddModule.tsx

import React, { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Upload, Trash, ArrowUp, ArrowDown, CircleCheck, CircleX, X } from "lucide-react";
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

interface AddModuleProps {
  onAddModule: (moduleData: ModuleData) => void;
  onCancel: () => void;
  initialData?: ModuleData;
}

const AddModule: React.FC<AddModuleProps> = ({
  onAddModule,
  onCancel,
  initialData,
}) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [autoAnalysis, setAutoAnalysis] = useState(
    initialData?.autoAnalysis || false
  );
  const [testCases, setTestCases] = useState(initialData?.testCases || false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>(
    initialData?.sections || []
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionType, setNewSectionType] = useState("");
  const [sectionCounter, setSectionCounter] = useState(
    initialData?.sections?.length || 0
  );
  const [newLink, setNewLink] = useState("");
  const [currentSectionId, setCurrentSectionId] = useState<number | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const createContentMutation = useMutation<
    any,
    Error,
    ContentMutationVariables
  >({
    mutationFn: async ({ type, url, file, objectType }) => {
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

  const handleAddSection = (index: number | null) => {
    setIsAlertOpen(true);
    setCurrentSectionId(index);
  };

  const handleSectionConfirm = () => {
    if (newSectionTitle && newSectionType) {
      const newSection: Section = {
        id: sectionCounter,
        title: newSectionTitle,
        type: newSectionType,
        content: {},
      };

      setSections((prevSections) => {
        const newSections = [...prevSections];
        if (currentSectionId !== null) {
          newSections.splice(currentSectionId + 1, 0, newSection);
        } else {
          newSections.push(newSection);
        }
        return newSections;
      });

      setNewSectionTitle("");
      setNewSectionType("");
      setIsAlertOpen(false);
      setCurrentSectionId(null);
      setSectionCounter((prevCounter) => prevCounter + 1);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    sectionId: number,
    fileType: string
  ) => {
    const files = event.target.files;
    if (files) {
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

          setSections((prevSections) => {
            return prevSections.map((section) => {
              if (section.id === sectionId) {
                return {
                  ...section,
                  content: {
                    ...section.content,
                    [fileType]: [...(section.content[fileType] || []), newFile],
                  },
                };
              }
              return section;
            });
          });
        } catch (error) {
          console.error("Error uploading file:", error);
        }
      }
    }
  };

  const handleLinkAdd = async () => {
    if (newLink && currentSectionId !== null) {
      try {
        const result = await createContentMutation.mutateAsync({
          type: "link",
          url: newLink,
        });

        setSections((prevSections) => {
          return prevSections.map((section) => {
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
          });
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
    setSections((prevSections) => {
      return prevSections.map((section) => {
        if (section.id === sectionId) {
          return {
            ...section,
            content: {
              ...section.content,
              [type]: section.content[type]?.filter((_, i) => i !== itemIndex),
            },
          };
        }
        return section;
      });
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
      <Label>Upload Reading Materials</Label>
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
          Accepted file types: Doc, PPTs, and PDFs
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
      <Label>Add Links</Label>
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
        renderTable(section.content.links, section.id, "links")}
    </div>
  );

  const AssignmentsSection: React.FC<{ section: Section }> = ({ section }) => {
    const [platformType, setPlatformType] = useState(
      (section as any).platformType || ""
    );
    const [templateRepository, setTemplateRepository] = useState(
      (section as any).templateRepository || ""
    );

    const updateSectionContent = useCallback(() => {
      setSections((prevSections) => {
        return prevSections.map((s) => {
          if (s.id === section.id) {
            return {
              ...s,
              platformType,
              templateRepository,
            };
          }
          return s;
        });
      });
    }, [section.id, platformType, templateRepository]);


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
                  value={templateRepository as string}
                  onChange={(e) => {
                    setTemplateRepository(e.target.value);
                  }}
                  onBlur={updateSectionContent}
                  className="tw-w-full"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="tw-flex tw-space-x-4">
          <div className="tw-flex tw-items-center">
            <Checkbox
              id="auto-analysis"
              checked={autoAnalysis}
              onCheckedChange={(checked) => setAutoAnalysis(checked as boolean)}
            />
            <Label htmlFor="auto-analysis" className="tw-ml-2">
              Auto Analysis
            </Label>
          </div>
          <div className="tw-flex tw-items-center">
            <Checkbox
              id="test-cases"
              checked={testCases}
              onCheckedChange={(checked) => setTestCases(checked as boolean)}
            />
            <Label htmlFor="test-cases" className="tw-ml-2">
              Test Cases
            </Label>
          </div>
        </div>
        <div>
          <Label>Add Assignments</Label>
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

  const handleDone = () => {
    const moduleData: ModuleData = {
      title,
      summary,
      autoAnalysis,
      testCases,
      sections: sections.sort((a, b) => a.id - b.id),
    };
    try {
      onAddModule(moduleData);
      setShowSuccessDialog(true);
    } catch (error) {
      setErrorMessage("Failed to add the module. Please try again.");
      setShowErrorDialog(true);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const [movedSection] = newSections.splice(index, 1);

    if (direction === "up" && index > 0) {
      newSections.splice(index - 1, 0, movedSection);
    } else if (direction === "down" && index < newSections.length) {
      newSections.splice(index + 1, 0, movedSection);
    }

    setSections(newSections);
  };

  const sectionTypes = {
    readingMaterial: "readingMaterial",
    links: "links",
    assignment: "assignment",
  };

  return (
    <div className="tw-max-w-3xl tw-mt-8 tw-p-6 tw-bg-white tw-rounded-lg tw-shadow">
      <div className="tw-space-y-6">
        <div>
          <Label htmlFor="title" >Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="tw-w-full "
            placeholder="Enter Title"
          />
        </div>

        <div>
          <Label htmlFor="summary">Summary</Label>
          <Textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="tw-w-full tw-h-20"
            placeholder="Enter Summary"
          />
        </div>

        {sections.map((section, index) => (
          <React.Fragment key={section.id}>
            <div className="tw-flex tw-items-center tw-justify-between">
              <h3 className="tw-text-lg tw-font-semibold">{section.title}</h3>
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(index, "up")}
                  disabled={index === 0}
                >
                  <ArrowUp className="tw-w-4 tw-h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveSection(index, "down")}
                  disabled={index === sections.length - 1}
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

        {sections.length === 0 && (
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
          <Button onClick={handleDone} className="tw-bg-blue-600 tw-text-white">
            Done
          </Button>
        </div>
      </div>

      


      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="tw-text-gray-900">Create Section</AlertDialogTitle>
            <AlertDialogDescription className="tw-text-primary">
            You can create section to upload a different set of documents :
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section Title"
            className="tw-mb-3"
          />
          <Select onValueChange={setNewSectionType} value={newSectionType}>
            <SelectTrigger className="tw-bg-white">
              <SelectValue placeholder="Select section type" />
            </SelectTrigger>
            <SelectContent className="tw-text-primary">
              <SelectItem value={sectionTypes.readingMaterial}>
                Reading Materials
              </SelectItem>
              <SelectItem value={sectionTypes.links}>Links</SelectItem>
              <SelectItem value={sectionTypes.assignment}>
                Assignments
              </SelectItem>
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
              Successfully added a new module.
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
    </div>
    

  );
};

export default AddModule;