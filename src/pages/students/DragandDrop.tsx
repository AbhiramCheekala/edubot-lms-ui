import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { X, MoveRight, Check, Plus, CircleCheck } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { api } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useInView } from "react-intersection-observer";
import { useDebouncedCallback } from "use-debounce";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import ErrorMessage from "../../components/custom/shared/ErrorComponent";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export interface Program {
  programId: string;
  name: string;
  givenProgramId: string;
  description: string;
  skills: string;
  duration: number;
  isActive: boolean;
}

export interface Course {
  courseId: string;
  name: string;
  givenCourseId: string;
  description: string;
  isActive: boolean;
}

export interface Student {
  studentId: string;
  givenStudentId: string;
  name: string;
  personalEmail: string;
  dateOfBirth: string;
  apsche: boolean;
  gender: string;
  orgId: string;
  batchId: string;
  loginId: string;
  joiningDate: string;
  contactPhoneNumber: {
    number: string;
    countryCode: string;
  };
}

interface DraggableItemProps {
  item: string;
  addItem: (itemId: string) => void;
  isSelected: boolean;
  children: React.ReactNode;
}

interface ItemResponse<T> {
  results: T[];
}

interface UpdateMutationVariables<T> {
  dynamicId: string;
  itemsToAdd: T[];
  itemsToRemove: T[];
}

const DraggableItem: React.FC<DraggableItemProps> = ({ item, addItem, isSelected, children }) => {
  const [{ isDragging }, drag] = useDrag({
    type: "ITEM",
    item: { item },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult();
      if (item && dropResult) {
        addItem(item.item);
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
      style={{ opacity: isDragging ? 0.5 : 1, cursor: isSelected ? "not-allowed" : "pointer" }}
      className="tw-py-1 hover:tw-bg-gray-100"
    >
      {children}
    </div>
  );
};

interface DroppableAreaProps {
  children: React.ReactNode;
}

const DroppableArea: React.FC<DroppableAreaProps> = ({ children }) => {
  const [, drop] = useDrop({
    accept: "ITEM",
    drop: () => ({}),
  });

  return (
    <div ref={drop} className="tw-bg-white tw-shadow-sm tw-rounded-md tw-p-4">
      {children}
    </div>
  );
};

interface DraggableSelectedItemProps {
  item: string;
  index: number;
  moveItem: (dragIndex: number, hoverIndex: number) => void;
  removeItem: (item: string) => void;
  children: React.ReactNode;
}

const DraggableSelectedItem: React.FC<DraggableSelectedItemProps> = ({ item, index, moveItem, removeItem, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: "SELECTED_ITEM",
    item: { index, item },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: "SELECTED_ITEM",
    hover: (item: { index: number; item: string }) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      if (dragIndex === hoverIndex) {
        return;
      }

      moveItem(dragIndex, hoverIndex);
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
      <Button variant="ghost" size="sm" onClick={() => removeItem(item)}>
        <X className="tw-w-4 tw-h-4" />
      </Button>
    </div>
  );
};

const getPayload = (type: string | null, programsToAdd: Program[], programsToRemove: Program[], coursesToAdd: Course[], coursesToRemove: Course[], studentsToAdd: Student[], studentsToRemove: Student[]) => {
  if (type === 'programs') {
    return {
      programsToAdd: programsToAdd.map(item => item.programId),
      programsToRemove: programsToRemove.map(item => item.programId)
    };
  } else if (type === 'courses') {
    return {
      coursesToAdd: coursesToAdd.map(item => item.courseId),
      coursesToRemove: coursesToRemove.map(item => item.courseId)
    };
  } else if (type === 'students') {
    return {
      studentsToAdd: studentsToAdd.map(item => item.studentId), // Reusing the same arrays for simplicity.
      studentsToRemove: studentsToRemove.map(item => item.studentId)
    };
  }
  return{};
};

const AddItemsComponent = ({ studentId, programId, courseId, type }: { studentId?: string; programId?: string; courseId?: string; type: "programs" | "courses" | "students" }) => {
  const dynamicId = studentId || programId || courseId;
  const endpointType = programId ? "programs" : courseId ? "courses" : "students"; 
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<(Program | Course | Student)[]>([]);
  const [programsToAdd, setProgramsToAdd] = useState<Program[]>([]);
  const [programsToRemove, setProgramsToRemove] = useState<Program[]>([]);
  const [coursesToAdd, setCoursesToAdd] = useState<Course[]>([]);
  const [coursesToRemove, setCoursesToRemove] = useState<Course[]>([]);
  const [studentsToAdd, setStudentsToAdd] = useState<Student[]>([]);
  const [studentsToRemove, setStudentsToRemove] = useState<Student[]>([]);
  const inputRef = useRef(null);
  const { ref: infiniteScrollRef, inView } = useInView();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const [isDialogOpen, setDialogOpen] = useState(false);

  const fetchItems = async ({ pageParam = 1 }) => {
    if (!type) return { results: [] };

    const urlSegment = type === 'programs' ? 'programs' : type === 'courses' ? 'courses' : 'students';
    const urlParams = new URLSearchParams();
  
    // Add common query parameters
    urlParams.append('page', pageParam.toString());
    urlParams.append('limit', '20');
  
    // Add search query if exists
    if (debouncedSearchQuery) {
      urlParams.append('filters[0][field]', 'name');
      urlParams.append('filters[0][searchType]', 'CONTAINS');
      urlParams.append('filters[0][searchKey]', encodeURIComponent(debouncedSearchQuery));
    }
  
    // Add onlyDangling parameter for courses
    if (type === 'courses') {
      urlParams.append('onlyDangling', 'true');
    }
  
    const url = `/${urlSegment}?${urlParams.toString()}`;
  
    const response = await api.get<ItemResponse<Program | Course | Student>>(url);
    return response.data;
  };

  const fetchPreviouslySelectedItems = async (): Promise<ItemResponse<Program | Course | Student>> => {
    if (!type) return { results: [] };

    const response = await api.get<ItemResponse<Program | Course | Student>>(`/${endpointType}/${dynamicId}/${type}`);
    return response.data;
  };

  useEffect(() => {
    const initializeSelectedItems = async () => {
       if (!dynamicId || !type) return;
      try {
        const previouslySelectedItems = await fetchPreviouslySelectedItems( );

        if (Array.isArray(previouslySelectedItems) && previouslySelectedItems.length > 0) {
          setSelectedItemIds(previouslySelectedItems); // Set the selected item IDs
          setSelected(previouslySelectedItems.map(item => (item as any).programId || (item as any).courseId || (item as any).studentId)); // Map to programId, courseId or studentId
        } else {
          setSelectedItemIds([]); // Set to empty if no items found
          setSelected([]); // Set to empty if no items found
        }
      } catch (error) {
        console.error("Failed to fetch previously selected items", error);
      }
    };

    initializeSelectedItems();
  }, [dynamicId, type]);

  const {
    data: itemsData,
    fetchNextPage: fetchNextItemsPage,
    hasNextPage: hasNextItemsPage,
    isFetchingNextPage: isFetchingNextItemsPage,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useInfiniteQuery({
    queryKey: [endpointType, debouncedSearchQuery],
    queryFn: fetchItems,
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (lastPage?.results?.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    }
  });

  const debouncedSearchQueryUpdate = useDebouncedCallback((value) => {
    setDebouncedSearchQuery(value);
  }, 1000);

  useEffect(() => {
    if (inView && hasNextItemsPage) {
      fetchNextItemsPage();
    }
  }, [inView, fetchNextItemsPage, hasNextItemsPage]);

  const filteredItems = useMemo(() => {
    return (
      itemsData?.pages.flatMap((page) =>
        page.results.map((item: Program | Course | Student) => ({
          ...item,
          isSelected: selected.includes((item as any).programId || (item as any).courseId || (item as any).studentId),
        }))
      ) || []
    );
  }, [itemsData, selected]);

  const addItem = useCallback((itemId: string) => {
    setSelected(prev => {
      if (!prev.includes(itemId)) {
        const itemToAdd = filteredItems.find(c => (c as any).programId === itemId || (c as any).courseId === itemId || (c as Student).studentId === itemId);
        if (itemToAdd) {
          setSelectedItemIds(prevSelected => [...prevSelected, itemToAdd]);
          
          if (type === 'programs') {
            setProgramsToAdd(prevToAdd => {
              const updated = [...prevToAdd, itemToAdd as Program];
              return updated;
            });
            setProgramsToRemove(prevToRemove => prevToRemove.filter(s => s.programId !== itemId));
          } else if (type === 'courses') {
            setCoursesToAdd(prevToAdd => {
              const updated = [...prevToAdd, itemToAdd as Course];
              return updated;
            });
            setCoursesToRemove(prevToRemove => prevToRemove.filter(s => s.courseId !== itemId));
          } else {
            setStudentsToAdd(prevToAdd => {
              const updated = [...prevToAdd, itemToAdd as Student];
              return updated;
            });
            setStudentsToRemove(prevToRemove => prevToRemove.filter(s => s.studentId !== itemId));
          }
        }
        return [...prev, itemId];
      }
      return prev;
    });
  }, [filteredItems, type]);

  const removeItem = useCallback((itemId: string) => {
    setSelected(prev => prev.filter(id => id !== itemId));
    setSelectedItemIds(prev => prev.filter(item => (item as any).programId !== itemId && (item as any).courseId !== itemId && (item as Student).studentId !== itemId));
    if(type === 'programs') {
      setProgramsToAdd(prevToAdd => prevToAdd.filter(s => s.programId !== itemId));
      const itemToRemove = filteredItems.find(c => (c as any).programId === itemId);
      if (itemToRemove) {
        setProgramsToRemove(prevToRemove => [...prevToRemove, itemToRemove as Program]);
      }
    } else if (type === 'courses') {
      setCoursesToAdd(prevToAdd => prevToAdd.filter(s => s.courseId !== itemId));
      const itemToRemove = filteredItems.find(c => (c as any).courseId === itemId);
      if (itemToRemove) {
        setCoursesToRemove(prevToRemove => [...prevToRemove, itemToRemove as Course]);
      }
    } else {
      setStudentsToAdd(prevToAdd => prevToAdd.filter(s => s.studentId !== itemId));
      const itemToRemove = filteredItems.find(c => (c as Student).studentId === itemId);
      if (itemToRemove) {
        setStudentsToRemove(prevToRemove => [...prevToRemove, itemToRemove as Student]);
      }
    }
  }, [filteredItems, type]);

  const moveItem = useCallback((dragIndex, hoverIndex) => {
    setSelected((prevSelected) => {
      const updatedSelected = [...prevSelected];
      const [reorderedItem] = updatedSelected.splice(dragIndex, 1);
      updatedSelected.splice(hoverIndex, 0, reorderedItem);
      return updatedSelected;
    });
    setSelectedItemIds((prevSelectedItemIds) => {
      const updatedSelectedItemIds = [...prevSelectedItemIds];
      const [reorderedItem] = updatedSelectedItemIds.splice(dragIndex, 1);
      updatedSelectedItemIds.splice(hoverIndex, 0, reorderedItem);
      return updatedSelectedItemIds;
    });
  }, []);

  // Mutation hook for updating items
  const updateMutation = useMutation({
    mutationFn: async ({ dynamicId }: UpdateMutationVariables<Program | Course | Student>) => {
      const data = getPayload(type, programsToAdd, programsToRemove, coursesToAdd, coursesToRemove, studentsToAdd, studentsToRemove);

      const response = await api.patch(`/${endpointType}/${dynamicId}/${type}`, data);
      return response.data;
    },
    onSuccess: async () => {
      if(type === 'programs') {
        setProgramsToAdd([]);
        setProgramsToRemove([]);
      } else if (type === 'courses') {
        setCoursesToAdd([]);
        setCoursesToRemove([]);
      } else {
        setStudentsToAdd([]);
        setStudentsToRemove([]);
      }
      // Open the dialog when mutation succeeds
      setDialogOpen(true);
    },
    onError: (error) => {
      console.error("Error adding items", error);
    },
  });

  // Function to handle form submission
  const handleSubmit = async () => {
    if (!dynamicId) return;
    updateMutation.mutate({
      dynamicId,
      itemsToAdd: type === 'programs' ? programsToAdd : type === 'courses' ? coursesToAdd : studentsToAdd,
      itemsToRemove: type === 'programs' ? programsToRemove : type === 'courses' ? coursesToRemove : studentsToRemove,
    });
  };

  if (itemsError) {
    return <ErrorMessage />;
  }

  const handleCancel = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div>
          <Label>Tag {type === "programs" ? "Programs" : type === "courses" ? "Courses" : "Students"}</Label>
          <div className="tw-flex tw-space-x-4 tw-bg-gray-100 tw-p-4 tw-rounded tw-text-sm">
            <div className="tw-w-1/2">
              <Label>{type === "programs" ? "Programs" : type === "courses" ? "Courses" : "Students"} to Select</Label>
              <div className="tw-bg-white tw-shadow-sm tw-rounded-md tw-p-4">
                <Input ref={inputRef} type="text" value={searchQuery} onChange={(e) => {
                  setSearchQuery(e.target.value);
                  debouncedSearchQueryUpdate(e.target.value);
                }} placeholder={type === "programs" ? "Program Name" : type === "courses" ? "Course Name" : "Student Name"} className="tw-mb-2" />
                <Separator className="tw-my-2" />
                <div className="tw-overflow-y-auto tw-max-h-40 tw-text-sm">
                  {isLoadingItems ? (<p>Loading {type === "programs" ? "programs" : type === "courses" ? "courses" : "students"}...</p>) : itemsError ? (<p>Error loading items</p>) : (
                    <>
                      {filteredItems.map((item) => (
                        <DraggableItem key={(item as any).programId || (item as any).courseId || (item as any).studentId} item={(item as any).programId || (item as any).courseId || (item as Student).studentId} addItem={addItem} isSelected={item.isSelected}>
                          <div className="tw-flex tw-justify-between tw-items-center">
                            <span>{item.name} {(item as any).givenProgramId || (item as any).givenCourseId || (item as Student).givenStudentId}</span>
                            {item.isSelected ? <span><Check className="tw-mr-4 tw-line-clamp-1 tw-h-10" /></span> : <Button onClick={() => addItem((item as any).programId || (item as any).courseId || (item as Student).studentId)} className="tw-bg-transparent hover:tw-bg-transparent tw-text-primary"><Plus /></Button>}
                          </div>
                        </DraggableItem>
                      ))}
                      {isFetchingNextItemsPage && <p>Loading more...</p>}
                      <div ref={infiniteScrollRef} />
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="tw-flex tw-items-center">
              <MoveRight className="tw-text-gray-400" />
            </div>
            <div className="tw-w-1/2">
              <Label>Selected {type === "programs" ? "Programs" : type === "courses" ? "Courses" : "Students"}</Label>
              <DroppableArea>
                <div className="tw-mt-2">
                  <p className="tw-text-[12px] tw-mb-2">
                    You can drag and drop to arrange the sequence of the {type === "programs" ? "programs" : type === "courses" ? "courses" : "students"}.
                  </p>
                  <Separator className="tw-my-2" />
                  <div className="tw-overflow-y-auto tw-max-h-40 tw-text-sm">
                    {selectedItemIds.map((item, index) => (
                      <DraggableSelectedItem 
                        key={(item as any).programId || (item as any).courseId || (item as Student).studentId} 
                        item={(item as any).programId || (item as any).courseId || (item as Student).studentId} 
                        index={index} 
                        moveItem={moveItem} 
                        removeItem={removeItem}>
                        <span>{item.name} {(item as any).givenProgramId || (item as any).givenCourseId || (item as Student).givenStudentId}</span>
                      </DraggableSelectedItem>
                    ))}
                  </div>
                </div>
              </DroppableArea>
            </div>
          </div>
          <div className="tw-flex tw-justify-end tw-space-x-2 tw-mt-4"></div>
        </div>
      </DndProvider>

      <div className="tw-flex tw-items-end tw-justify-end tw-gap-4">
        <Button 
          onClick={handleSubmit} 
          disabled={
            (type === 'programs' ? programsToAdd.length : type === 'courses' ? coursesToAdd.length : studentsToAdd.length) === 0 && 
            (type === 'programs' ? programsToRemove.length : type === 'courses' ? coursesToRemove.length : studentsToRemove.length) === 0
          }>
          Add
        </Button>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle></AlertDialogTitle>
            <AlertDialogDescription>
              <div className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-gap-4">
                <CircleCheck className="tw-text-green-500 tw-w-8 tw-h-8" />
                <span>The {type === "programs" ? "programs" : type === "courses" ? "courses" : "students"} have been successfully added.</span>
              </div>
            </AlertDialogDescription>
            <AlertDialogFooter>
              <div>
                <Button onClick={handleCancel}>OK</Button>
              </div>
            </AlertDialogFooter>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AddItemsComponent;