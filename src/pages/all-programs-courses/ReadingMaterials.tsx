import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { api } from '@/lib/api';
import ContentViewer from '@/components/custom/shared/ContentViewer';
import { Button } from '@/components/ui/button';
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertTriangle } from 'lucide-react';
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";
import { Download } from 'lucide-react';

const ReadingMaterials = () => {
  const { courseId, moduleId, sectionId, contentId } = useParams({
    from: "/_authenticated/my/courses/$courseId/modules/$moduleId/sections/$sectionId/reading-materials/$contentId",
  });

  const [currentNote, setCurrentNote] = useState('');
  const queryClient = useQueryClient();

  // Permission check
  const { permissionSet } = usePolicies();
  const isStudent = permissionSet && checkActionScopes(permissionSet, 'submission:write', ['self']);

  const { data: courseData } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => api.get(`/courses/${courseId}`),
  });

  const { data: moduleData } = useQuery({
    queryKey: ['module', moduleId],
    queryFn: () => api.get(`/modules/${moduleId}?includeModuleSections=true&includeSectionContents=true`),
  });

  const { data: contentData, isLoading: isContentLoading } = useQuery({
    queryKey: ['content', contentId],
    queryFn: () => api.get(`/contents/${contentId}?includeBinaryObject=true`),
  });

  const { data: notesData, isLoading: isNotesLoading } = useQuery({
    queryKey: ['notes', contentId],
    queryFn: () => api.get(`/rmnotes/${contentId}`),
    enabled: isStudent, // Only fetch notes if the user is a student
  });

  const saveMutation = useMutation({
    mutationFn: (newNote: string) => api.put(`/rmnotes/${contentId}`, {
      note: newNote
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', contentId] });
      setCurrentNote('');
    },
  });

  const handleSaveNote = () => {
    if (currentNote.trim() && isStudent) {
      saveMutation.mutate(currentNote);
    }
  };

  if (isContentLoading || (isStudent && isNotesLoading)) return <div>Loading...</div>;

  const content = contentData?.data;
  const course = courseData?.data;
  const module = moduleData?.data;
  const section = module?.moduleSections?.find(s => s.moduleSectionId === sectionId);
  const notes = isStudent ? (notesData?.data?.[0]?.notes || []) : [];

  return (
    <div className="tw-max-w-7xl tw-mx-auto md:tw-p-4">
      <div className="tw-bg-white tw-shadow-lg tw-rounded-lg tw-overflow-hidden">
        <div className="tw-px-6 tw-py-4 tw-bg-gray-50 tw-border-b tw-border-gray-200">
          <div className="tw-flex tw-flex-col md:tw-flex-row tw-justify-between tw-items-start md:tw-items-center">
            <div className="tw-flex tw-flex-col">
              <h1 className="tw-text-lg tw-font-semibold tw-text-gray-800">
                Course: {course?.name} / Module: {module?.title}
              </h1>
              <h2 className="tw-text-sm tw-text-gray-600">
                Section: {section?.title} / Reading Material: {content?.binaryObjectOriginalFileName}
              </h2>
            </div>
          </div>
        </div>

        <div className="tw-p-6">
          <div className="tw-w-full tw-flex tw-gap-4 tw-items-center tw-mb-4">
            <span className="tw-font-bold tw-text-start tw-break-words tw-w-4/5 md:tw-w-auto">
              {content.binaryObjectOriginalFileName || "Untitled"}
            </span>
            <div className="tw-flex tw-items-center">
              <Download
                size={34}
                className="tw-cursor-pointer tw-px-2 tw-mr-5"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(content.securedFileUrl, "_blank");
                }}
              />
            </div>
          </div>
          <div className="tw-mb-8">
            <ContentViewer
              binaryObjectMimeType={content?.binaryObjectMimeType}
              securedFileUrl={content?.securedFileUrl}
            />
          </div>

          {isStudent && (
            <>
              <div className="tw-mt-8">
                <Accordion type="single" collapsible className="tw-w-full">
                  <AccordionItem value="notes">
                    <AccordionTrigger className="tw-bg-yellow-100 tw-px-4 tw-py-2 tw-rounded-t-lg">
                      <div className="tw-flex tw-items-center tw-space-x-2"> 
                      <AlertTriangle className="tw-text-yellow-500" size={18} />
                        <span>Notes</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="tw-bg-yellow-50 tw-p-4 tw-rounded-b-lg">
                      {notes.length > 0 ? (
                        notes.map((note, index) => (
                          <div key={index} className="tw-mb-4 tw-last:mb-0">
                            <h4 className="tw-font-semibold">Note {index + 1}:</h4>
                            <p>{note.content}</p>
                          </div>
                        ))
                      ) : (
                        <p>No notes yet.</p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>

              <div className="tw-mt-8">
                <h3 className="tw-text-lg tw-font-semibold tw-mb-4">Keep Notes</h3>
                <Textarea 
                  className="tw-w-full tw-h-32" 
                  placeholder="Add your notes here."
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                />
                <div className="tw-flex tw-flex-col sm:tw-flex-row tw-justify-between tw-items-start sm:tw-items-center tw-mt-2">
                  <span className="tw-mb-2 sm:tw-mb-0">Word count: {currentNote.split(/\s+/).filter(Boolean).length}</span>
                  <Button 
                    className="tw-bg-blue-600 tw-text-white tw-w-full sm:tw-w-auto" 
                    onClick={handleSaveNote}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReadingMaterials;