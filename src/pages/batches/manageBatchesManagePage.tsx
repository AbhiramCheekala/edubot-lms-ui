import React, { useState, useEffect, useRef } from "react";
import { useForm, FormProvider, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@radix-ui/react-separator";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, CircleCheck, Loader2 } from "lucide-react";
import { useSearch } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useInView } from "react-intersection-observer";
import { useDebouncedCallback } from "use-debounce";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface Batch {
  name?: string;
  mentorId: string;
  mentorName?: string;
  batchId?: string;
  batchNumber?: number;
}

interface FormValues {
  year: string;
  month: string;
  organization: string;
}

interface Organization {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

interface UpdateBatch {
  batchId?: string;
  mentorId: string;
}

interface Semester {
  semesterId: string;
  year: number;
  month: number;
  orgId: string;
  batches: Array<{
    name: string;
    batchId: string;
    mentorId: string;
    batchNumber: number;
  }>;
}

interface SearchParams {
  semesterId?: string;
}

interface CreateSemesterPayload {
  year: number;
  month: number;
  orgId: string;
  batches: Array<{
    mentorId: string;
  }>;
}

const formSchema = z.object({
  year: z.string().nonempty({ message: "Year is required" }),
  month: z.string().nonempty({ message: "Month is required" }),
  organization: z.string().nonempty({ message: "Organization is required" }),
});

const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit },
  });
  return data;
};

const ManageBatchesManagePage: React.FC = () => {
  const { permissionSet } = usePolicies();
  const canEditBatches = checkActionScopes(permissionSet, "batch:write", [
    "admin",
  ]);

  const queryClient = useQueryClient();

  const searchParams = useSearch({
    from: "/_authenticated/batches/manage",
  }) as SearchParams;
  const semesterId = searchParams.semesterId;

  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: "",
      month: "",
      organization: "",
    },
  });

  const [numberOfBatches, setNumberOfBatches] = useState<number>(0);
  const [batchArray, setBatchArray] = useState<Batch[]>([]);
  const [existingBatches, setExistingBatches] = useState<Batch[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [showDialog, setShowDialog] = useState<boolean>(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number | null>(
    null
  );
  const { ref: infiniteScrollRef, inView } = useInView();
  const [mentorsMap, setMentorsMap] = useState<Record<string, User>>({});
  const [selectedMentors, setSelectedMentors] = useState<Record<string, User>>(
    {}
  );
  const [initialMentorsLoaded, setInitialMentorsLoaded] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [mentorSearchQueries, setMentorSearchQueries] = useState<
    Record<number, string>
  >({});
  const [debouncedSearchQueries, setDebouncedSearchQueries] = useState<
    Record<number, string>
  >({});
  const searchInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [focusedBatchIndex, setFocusedBatchIndex] = useState<number | null>(
    null
  );

  const {
    data: organizationsData,
    isLoading: isOrgLoading,
    refetch: refetchOrganizations,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => fetchOrganizations(),
    staleTime: 5000,
  });

  const organizations = organizationsData?.results ?? [];

  const debouncedMentorSearch = useDebouncedCallback(
    (value: string, index: number) => {
      setDebouncedSearchQueries((prev) => ({ ...prev, [index]: value }));
    },
    1000
  );

  const fetchMentors = async ({ pageParam = 1, searchQuery = "" }) => {
    const params: Record<string, string> = {
      page: pageParam.toString(),
      limit: "20",
      "sorts[0][field]": "name",
      "sorts[0][order]": "ASC",
    };

    if (searchQuery) {
      params["filters[0][field]"] = "name";
      params["filters[0][searchType]"] = "CONTAINS";
      params["filters[0][searchKey]"] = searchQuery;
    }

    params["filters[1][field]"] = "role";
    params["filters[1][searchType]"] = "EXACT_MATCH";
    params["filters[1][searchKey]"] = "Mentor";

    const response = await api.get("/users", { params });
    return response.data;
  };

  const {
    data: mentorsData,
    fetchNextPage: fetchNextMentorsPage,
    hasNextPage: hasNextMentorsPage,
    isFetchingNextPage: isFetchingNextMentorsPage,
    isLoading: isLoadingMentors,
    error: mentorsError,
    refetch: refetchMentors,
  } = useInfiniteQuery({
    queryKey: [
      "mentors",
      currentBatchIndex,
      debouncedSearchQueries[currentBatchIndex ?? -1] ?? "",
    ],
    queryFn: ({ pageParam }) =>
      fetchMentors({
        pageParam,
        searchQuery: debouncedSearchQueries[currentBatchIndex ?? -1] ?? "",
      }),
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.results.length === 20) {
        return pages.length + 1;
      }
      return undefined;
    },
    enabled: canEditBatches && currentBatchIndex !== null,
    initialPageParam: 1,
  });

  const createSemester = async (payload: CreateSemesterPayload) => {
    try {
      const { data } = await api.post("/semesters/", payload);
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["mentors"] });
      setShowDialog(true);
      refetchAllData();
      return data;
    } catch (error) {
      console.error("Error creating semester:", error);
      throw error;
    }
  };

  const checkExistingSemester = async (
    orgId: string,
    year: string,
    month: string
  ): Promise<Semester | null> => {
    const { data } = await api.get(`/semesters/find`, {
      params: { orgId, year, month, includeBatches: true },
    });
    return data || null;
  };

  const currentYear = new Date().getFullYear();
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getAvailableMonths = (year: string) => {
    if (isEditMode) {
      return months.map((month, index) => ({
        name: month,
        value: index + 1,
      }));
    }

    if (parseInt(year) === currentYear) {
      return months.slice(new Date().getMonth()).map((month, index) => ({
        name: month,
        value: new Date().getMonth() + index + 1,
      }));
    }

    return months.map((month, index) => ({
      name: month,
      value: index + 1,
    }));
  };

  const updateSemesterMutation = useMutation({
    mutationFn: (data: { semesterId: string; batches: UpdateBatch[] }) =>
      api.patch(`/semesters/${data.semesterId}`, { batches: data.batches }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["semester", semesterId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["mentors"] });
      setShowDialog(true);
      refetchAllData();
    },
    onError: (error) => console.error("Error updating semester:", error),
  });

  const refetchAllData = async () => {
    await refetchOrganizations();
    const { organization, year, month } = methods.getValues();
    if (organization && year && month) {
      try {
        const existingSemester = await checkExistingSemester(
          organization,
          year,
          month
        );
        if (existingSemester) {
          setNumberOfBatches(existingSemester.batches.length);
          setBatchArray(
            existingSemester.batches.map((batch) => ({
              name: batch.name,
              mentorId: batch.mentorId,
              batchId: batch.batchId,
            }))
          );
          setExistingBatches(existingSemester.batches);
        } else {
          setNumberOfBatches(0);
          setBatchArray([]);
          setExistingBatches([]);
        }
      } catch (error) {
        console.error("Error fetching semester data:", error);
      }
    }
  };

  useEffect(() => {
    if (semesterId && !isEditMode) {
      setIsEditMode(true);
      const fetchSemesterData = async () => {
        try {
          const { data } = await api.get(`/semesters/find`, {
            params: { semesterId, includeBatches: true },
          });
          if (data) {
            methods.reset({
              year: String(data.year),
              month: String(data.month),
              organization: data.orgId,
            });
            setBatchArray(
              data.batches.map((batch, index) => ({
                name: `Batch ${index + 1}`,
                mentorId: batch.mentorId,
                batchId: batch.batchId,
              }))
            );
            setExistingBatches(data.batches);
            setIsUpdate(true);
            setNumberOfBatches(data.batches.length);

            const org = organizations.find((o) => o.id === data.orgId);
            setSelectedOrgName(org ? org.name : "");
          }
        } catch (error) {
          console.error("Error fetching semester data:", error);
          setIsEditMode(false);
        }
      };
      fetchSemesterData();
    }
  }, [semesterId, methods, organizations, isEditMode]);

  useEffect(() => {
    const totalBatches = Math.max(numberOfBatches, existingBatches.length);
    const updatedBatchArray = Array.from({ length: totalBatches }, (_, i) => {
      if (i < existingBatches.length) {
        return {
          ...existingBatches[i],
          name: `Batch ${i + 1}`,
        };
      }
      return {
        name: `Batch ${i + 1}`,
        mentorId: "",
        batchId: "",
      };
    });
    setBatchArray(updatedBatchArray);

    const initialSelectedMentors: Record<string, User> = {};
    updatedBatchArray.forEach((batch, index) => {
      if (batch.mentorId) {
        initialSelectedMentors[index] = {
          id: batch.mentorId,
          name: batch.mentorName || "",
        };
      }
    });
    setSelectedMentors(initialSelectedMentors);
  }, [numberOfBatches, existingBatches]);

  useEffect(() => {
    const fetchData = async () => {
      const { organization, year, month } = methods.getValues();
      if (organization && year && month) {
        try {
          const existingSemester = await checkExistingSemester(
            organization,
            year,
            month
          );
          if (existingSemester) {
            setNumberOfBatches(existingSemester.batches.length);
            setBatchArray(
              existingSemester.batches.map((batch, index) => ({
                name: `Batch ${index + 1}`,
                mentorId: batch.mentorId,
                batchId: batch.batchId,
              }))
            );
            setExistingBatches(existingSemester.batches);
          } else {
            setNumberOfBatches(0);
            setBatchArray([]);
            setExistingBatches([]);
          }
        } catch (error) {
          console.error("Error fetching semester data:", error);
        }
      }
    };

    fetchData();
  }, [
    methods.watch("organization"),
    methods.watch("year"),
    methods.watch("month"),
  ]);

  useEffect(() => {
    if (inView && hasNextMentorsPage) {
      fetchNextMentorsPage();
    }
  }, [inView, hasNextMentorsPage, fetchNextMentorsPage]);

  useEffect(() => {
    if (mentorsData) {
      const newSearchResults: User[] = [];
      mentorsData.pages.forEach((page) => {
        newSearchResults.push(...page.results);
      });
      setSearchResults(newSearchResults);

      const newMentorsMap = { ...mentorsMap };
      newSearchResults.forEach((mentor: User) => {
        newMentorsMap[mentor.id] = mentor;
      });
      setMentorsMap(newMentorsMap);

      if (!initialMentorsLoaded) {
        setInitialMentorsLoaded(true);
      }
    }
  }, [mentorsData]);

  const watchedValues = methods.watch(["organization", "year", "month"]);
  const organization = watchedValues[0] as string;
  const year = watchedValues[1] as string;
  const month = watchedValues[2] as string;

  const isAllFieldsSelected = organization && year && month;

  useEffect(() => {
    if (organizations.length > 0) {
      const orgId = methods.getValues("organization");
      if (orgId) {
        const org = organizations.find((o) => o.id === orgId);
        setSelectedOrgName(org ? org.name : "");
      }
    }
  }, [organizations, methods]);

  const onSubmit = async (data: FormValues) => {
    try {
      const existingSemester = await checkExistingSemester(
        data.organization,
        data.year,
        data.month
      );
      if (existingSemester) {
        setIsUpdate(true);
        const existingBatchIds = existingBatches.map((batch) => batch.batchId);
        const updatedBatches = batchArray.map((batch) => {
          if (existingBatchIds.includes(batch.batchId)) {
            return { batchId: batch.batchId, mentorId: batch.mentorId };
          } else {
            return { mentorId: batch.mentorId };
          }
        });
        updateSemesterMutation.mutate({
          semesterId: existingSemester.semesterId,
          batches: updatedBatches,
        });
      } else {
        setIsUpdate(false);
        const payload: CreateSemesterPayload = {
          year: parseInt(data.year),
          month: parseInt(data.month),
          orgId: data.organization,
          batches: batchArray.map((batch) => ({
            mentorId: batch.mentorId,
          })),
        };
        await createSemester(payload);
      }
    } catch (error) {
      console.error("Error while submitting form:", error);
    }
  };

  const handleMentorSelect = (index: number) => (mentorId: string) => {
    if (!canEditBatches) return;

    const updatedBatchArray = [...batchArray];
    const selectedMentor = mentorsMap[mentorId];
    updatedBatchArray[index] = {
      ...updatedBatchArray[index],
      mentorId,
      mentorName: selectedMentor ? selectedMentor.name : "",
    };
    setBatchArray(updatedBatchArray);
    setSelectedMentors({
      ...selectedMentors,
      [index]: selectedMentor,
    });

    // Refocus on the search input after selection
    setTimeout(() => {
      searchInputRefs.current[index]?.focus();
    }, 0);
  };

  return (
    <>
      <FormProvider {...methods}>
        <div className="tw-flex tw-space-x-4">
          <form
            onSubmit={methods.handleSubmit(onSubmit)}
            className="tw-flex-1 tw-space-y-4 tw-p-4 tw-bg-white tw-border tw-border-gray-200 tw-h-[370px] tw-overflow-auto"
          >
            <div className="tw-flex tw-space-x-4">
              <FormItem className="tw-flex-1">
                <FormLabel>Select Year</FormLabel>
                <FormControl>
                  <Controller
                    name="year"
                    control={methods.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          methods.setValue("month", "");
                        }}
                        disabled={isEditMode || !canEditBatches}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            { length: 4 },
                            (_, index) => currentYear + index
                          ).map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormControl>
                <FormMessage>
                  {methods.formState.errors.year?.message}
                </FormMessage>
              </FormItem>

              <FormItem className="tw-flex-1">
                <FormLabel>Select Month</FormLabel>
                <FormControl>
                  <Controller
                    name="month"
                    control={methods.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isEditMode || !canEditBatches}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableMonths(methods.getValues("year")).map(
                            (month) => (
                              <SelectItem
                                key={month.value}
                                value={String(month.value)}
                              >
                                {month.name}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormControl>
                <FormMessage>
                  {methods.formState.errors.month?.message}
                </FormMessage>
              </FormItem>
            </div>

            <div className="tw-flex tw-space-x-4">
              <FormItem className="tw-flex-1">
                <FormLabel>Organization</FormLabel>
                <FormControl>
                  <Controller
                    name="organization"
                    control={methods.control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const org = organizations.find((o) => o.id === value);
                          setSelectedOrgName(org ? org.name : "");
                        }}
                        disabled={isOrgLoading || isEditMode || !canEditBatches}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isOrgLoading
                                ? "Loading..."
                                : field.value && selectedOrgName
                                  ? selectedOrgName
                                  : "Select an organization"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {organizations.map((org: Organization) => (
                            <SelectItem key={org.id} value={org.id}>
                              {org.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormControl>
                <FormMessage>
                  {methods.formState.errors.organization?.message}
                </FormMessage>
              </FormItem>

              <FormItem className="tw-flex-1">
                <FormLabel>Add Number of Batches</FormLabel>
                <Input
                  type="number"
                  value={numberOfBatches}
                  onChange={(e) =>
                    setNumberOfBatches(Math.max(0, Number(e.target.value)))
                  }
                  min={existingBatches.length}
                  className="tw-text-center"
                  disabled={!isAllFieldsSelected || !canEditBatches}
                />
              </FormItem>
            </div>

            <FormItem>
              <div className="tw-flex tw-items-center tw-space-x-4">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={() => setIsActive(true)}
                  disabled={!canEditBatches}
                />
                <Label>Active</Label>
                <Checkbox
                  checked={!isActive}
                  onCheckedChange={() => setIsActive(false)}
                  disabled={!canEditBatches}
                />
                <Label>Inactive</Label>
              </div>
            </FormItem>

            <div className="tw-text-primary tw-mt-6">
              <h5 className="tw-italic">All fields are mandatory*</h5>
            </div>

            <Separator className="tw-border-t tw-border-gray-300 tw-mt-1 tw-mb-3" />

            <Button
              type="submit"
              className="tw-mt-4"
              disabled={!canEditBatches}
            >
              Submit
            </Button>
          </form>

          <ScrollArea className="tw-w-1/3 tw-border tw-text-gray-900 tw-bg-white tw-border-gray-200 tw-p-4 tw-max-h-[80vh] tw-overflow-auto">
            <h3 className="tw-font-semibold tw-mb-4">Batches Created</h3>
            {batchArray.map((batch, index) => (
              <div
                key={index}
                className="tw-border tw-border-gray-300 tw-bg-gray-100 tw-p-4 tw-rounded-lg tw-my-3"
              >
                <p className="tw-font-semibold">{batch.name}</p>
                <div className="tw-p-2">
                  <Select
                    value={batch.mentorId}
                    onValueChange={handleMentorSelect(index)}
                    onOpenChange={(open) => {
                      if (open) {
                        setCurrentBatchIndex(index);
                        setFocusedBatchIndex(index);
                        refetchMentors();
                        setTimeout(() => {
                          searchInputRefs.current[index]?.focus();
                        }, 0);
                      }
                    }}
                    disabled={!canEditBatches}
                  >
                    <SelectTrigger className="tw-w-full tw-bg-white">
                      <SelectValue placeholder="Select Mentor">
                        {selectedMentors[index]?.name ||
                          batch.mentorName
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <div className="tw-p-2">
                        <Input
                          type="text"
                          placeholder="Search mentors..."
                          value={mentorSearchQueries[index] ?? ""}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setMentorSearchQueries((prev) => ({
                              ...prev,
                              [index]: newValue,
                            }));
                            debouncedMentorSearch(newValue, index);
                          }}
                          onKeyDown={(e) => e.stopPropagation()}
                          onKeyPress={(e) => e.stopPropagation()}
                          onKeyUp={(e) => e.stopPropagation()}
                          ref={(el) => {
                            searchInputRefs.current[index] = el;
                            if (focusedBatchIndex === index) {
                              el?.focus();
                            }
                          }}
                        />
                      </div>
                      <ScrollArea
                        className={`tw-max-h-[200px] ${
                          searchResults.length <= 5
                            ? "tw-h-auto"
                            : "tw-h-[200px]"
                        }`}
                      >
                        <SelectGroup>
                          {isLoadingMentors && !initialMentorsLoaded ? (
                            <SelectItem value="loading" disabled>
                              <div className="tw-flex tw-items-center">
                                <Loader2 className="tw-mr-2 tw-h-4 tw-w-4 tw-animate-spin" />
                                Loading mentors...
                              </div>
                            </SelectItem>
                          ) : mentorsError ? (
                            <SelectItem value="error" disabled>
                              <div className="tw-text-center tw-py-2 tw-text-red-500">
                                Error loading mentors
                              </div>
                            </SelectItem>
                          ) : searchResults.length === 0 ? (
                            <SelectItem value="no-results" disabled>
                              <div className="tw-text-center tw-py-2">
                                No mentors found
                              </div>
                            </SelectItem>
                          ) : (
                            searchResults.map((mentor: User) => (
                              <SelectItem key={mentor.id} value={mentor.id}>
                                {mentor.name}
                              </SelectItem>
                            ))
                          )}
                          {isFetchingNextMentorsPage && (
                            <SelectItem value="loading-more" disabled>
                              <div className="tw-text-center tw-py-2">
                                Loading more...
                              </div>
                            </SelectItem>
                          )}
                          <div ref={infiniteScrollRef} />
                        </SelectGroup>
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="relative tw-max-w-md tw-mx-auto tw-my-auto">
            <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
              <CircleCheck className="tw-text-green-500" size={64} />
              <AlertDialogTitle>
                <span>Completed</span>
              </AlertDialogTitle>
              <button
                className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
                onClick={() => setShowDialog(false)}
                aria-label="Close"
              >
                <X className="tw-text-xl" />
              </button>
              <AlertDialogDescription className="tw-mt-4 tw-text-center">
                {isUpdate
                  ? "The batches were successfully updated."
                  : "The batches were successfully created."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="tw-flex !tw-justify-center">
              <AlertDialogAction onClick={() => setShowDialog(false)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </FormProvider>
    </>
  );
};

export default ManageBatchesManagePage;