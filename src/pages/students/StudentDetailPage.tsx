import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PhoneInput from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import DragandDrop from "./DragandDrop";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { CircleCheck, X, CalendarDays, CircleX, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { useParams } from "@tanstack/react-router";
import parsePhoneNumberFromString from "libphonenumber-js";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface StudentData {
  givenStudentId: string;
  name: string;
  email: string;
  personalEmail?: string;
  gender: "male" | "female";
  dateOfBirth: string;
  contactPhoneNumber: {
    countryCode: string;
    number: string;
  };
  batchId: string;
  organization: string;
  apsche: boolean;
  isActive: boolean;
  sendEmail: boolean;
}

const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit },
  });
  return data;
};
const fetchBatches = async (selectedOrganization) => {
  try {
    const response = await api.get(
      `/batches/organizations/${selectedOrganization}`
    );
    return {
      Batches: response.data,
    };
  } catch (error) {
    console.error("Error fetching batches:", error);
    throw error;
  }
};

const fetchStudentDetails = async (studentId) => {
  const { data } = await api.get(
    `/students/${studentId}?includeRole=true&includeOrg=true&includeMentor=true`
  );
  return data;
};

const updateStudent = async (
  studentId: string,
  payload: Partial<StudentData>
) => {
  const { data } = await api.patch(`/students/${studentId}`, payload);
  return data;
};

const formSchema = z.object({
  StudentId: z
    .string()
    .min(3, { message: "Student ID must be at least 3 characters." }),
  name: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." })
    .max(100, { message: "Full name cannot exceed 100 characters." })
    .regex(/^[a-zA-Z\s'-]+$/, {
      message:
        "Name can only contain letters, spaces, hyphens, and apostrophes.",
    })
    .refine((value) => value.trim().includes(" "), {
      message: "Please enter both first and last name.",
    })
    .refine((value) => !value.startsWith(" "), {
      message: "Name cannot start with a space.",
    }),
  InstitutionEmail: z.string().email({ message: "Invalid email address." }),
  PersonalEmail: z.string().email().or(z.literal("")).optional(),
  DOB: z.date({
    required_error: "Date of Birth is required.",
  }),
  Gender: z.enum(["male", "female"]),
  contactPhoneNumber: z.object({
    countryCode: z.string({
      required_error: "Country code is required.",
    }),
    number: z
      .string({
        required_error: "Phone number is required.",
      })
      .min(1, { message: "Phone number is required." }),
  }),
  Batch: z.string().min(1, { message: "Select the Batch." }),
  Organization: z.string().min(1, { message: "Organization is required." }),
  APSCHE: z.string().min(1, { message: "Confiramtion is required." }),

  status: z.enum(["active", "inactive"], {
    required_error: "Status is required.",
  }),
  sendEmail: z.boolean(),
});

const Gender: Record<string, string> = {
  male: "Male",
  female: "Female",
};

const normalizeGender = (gender: string): "male" | "female" => {
  return gender.toLowerCase() as "male" | "female";
};

const APSCHE: Record<string, string> = {
  Yes: "Yes",
  No: "No",
};

function StudentDetailPage() {
  const queryClient = useQueryClient();
  const { studentId } = useParams({
    from: "/_authenticated/students/$studentId",
  });
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({
    title: "",
    description: "",
  });
  const { permissionSet } = usePolicies();
  const canEditStudents = checkActionScopes(permissionSet, "student:write", [
    "admin",
    "supervisor",
    "program",
    "organization",
  ]);

  const [openComponent, setOpenComponent] = useState<
    "programs" | "courses" | "students" | null
  >(null);

  const { data: studentDetails } = useQuery({
    queryKey: ["studentDetails", studentId],
    queryFn: () => fetchStudentDetails(studentId),
    enabled: !!studentId,
  });
  const page = 1;
  const limit = 200;

  const { data, isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations", page, limit],
    queryFn: () => fetchOrganizations(page, limit),
  });

  const organizations = data?.results ?? [];

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["batches", selectedOrganization],
    queryFn: () => fetchBatches(selectedOrganization),
    enabled: !!selectedOrganization,
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<StudentData>) =>
      updateStudent(studentId, payload),
    onSuccess: () => {
      const personalEmail = methods.getValues("PersonalEmail");
      setDialogContent({
        title: "Student Updated Successfully",
        description: methods.getValues("sendEmail")
          ? `We have shared a link at the email address: ${personalEmail}. The Student can click the link to reset the password.`
          : "The student has been Updated successfully.",
      });
      setShowDialog(true);
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ["studentDetails", studentId],
      });

      queryClient
        .fetchQuery({
          queryKey: ["studentDetails", studentId],
        })
        .then((data: StudentData) => {
          if (data) {
            methods.reset(data);
          }
        });
    },
    onError: () => {
      setDialogContent({
        title: "Error While Updating Student",
        description:
          "There was an issue while Updating the student. Please try again.",
      });
      setShowDialog(true);
      methods.reset();
    },
  });

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      StudentId: "",
      name: "",
      InstitutionEmail: "",
      PersonalEmail: "",
      Gender: undefined,
      DOB: new Date(),
      contactPhoneNumber: {
        countryCode: "+91",
        number: "",
      },
      Batch: "",
      Organization: "",
      APSCHE: "",
      status: "active",
      sendEmail: false,
    },
  });

  useEffect(() => {
    if (studentDetails) {
      methods.setValue("Batch", studentDetails.batchId || "");
    }
  }, [studentDetails, batches]);

  useEffect(() => {
    if (studentDetails) {
      const rawNumber = String(studentDetails.contactPhoneNumber?.number || "");
      const countryCode = studentDetails.contactPhoneNumber?.countryCode || "";
      let formattedNumber = rawNumber;

      try {
        const phoneNumber = parsePhoneNumberFromString(rawNumber, countryCode);
        if (phoneNumber) {
          formattedNumber = phoneNumber.format("E.164");
        }
      } catch (error) {
        console.error("Error formatting phone number:", error);
      }
      methods.reset({
        StudentId: studentDetails.givenStudentId,
        name: studentDetails.name,
        InstitutionEmail: studentDetails.email,
        PersonalEmail: studentDetails.personalEmail,
        contactPhoneNumber: {
          countryCode:
            studentDetails.contactPhoneNumber?.countryCode || countryCode,
          number: formattedNumber,
        },
        Gender: normalizeGender(studentDetails.gender),
        Organization: studentDetails.orgId,
        APSCHE: studentDetails.apsche ? "Yes" : "No",
        status: studentDetails.isActive ? "active" : "inactive",
        DOB: new Date(studentDetails.dateOfBirth),
        sendEmail: false,
        Batch: studentDetails.batchId,
      });
      setSelectedOrganization(studentDetails.orgId);
    }
  }, [studentDetails, methods]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const dirtyFields = methods.formState.dirtyFields;
    const number = values.contactPhoneNumber.number;
    let phoneNumber;
    if (isValidPhoneNumber(number)) {
      phoneNumber = parsePhoneNumber(number);
    }

    const patchPayload: Partial<StudentData> = {};

    if (dirtyFields.StudentId) patchPayload.givenStudentId = values.StudentId;
    if (dirtyFields.name) patchPayload.name = values.name;
    if (dirtyFields.InstitutionEmail)
      patchPayload.email = values.InstitutionEmail;
    if (dirtyFields.PersonalEmail)
      patchPayload.personalEmail = values.PersonalEmail;
    if (dirtyFields.Organization) {
      patchPayload.organization = values.Organization;
    }
    if (dirtyFields.Gender && values.Gender) {
      patchPayload.gender = normalizeGender(values.Gender);
    }
    if (dirtyFields.status) patchPayload.isActive = values.status === "active";
    if (dirtyFields.DOB)
      patchPayload.dateOfBirth = format(values.DOB, "yyyy-MM-dd HH:mm:ss");
    if (dirtyFields.Batch) {
      patchPayload.batchId = values.Batch;
    }

    if (dirtyFields.APSCHE) patchPayload.apsche = values.APSCHE === "Yes";

    if (
      dirtyFields.contactPhoneNumber?.countryCode ||
      dirtyFields.contactPhoneNumber?.number
    ) {
      patchPayload.contactPhoneNumber = {
        countryCode: phoneNumber ? phoneNumber.country : "",
        number: phoneNumber ? phoneNumber.nationalNumber : "",
      };
    }

    if (values.sendEmail) {
      patchPayload.sendEmail = values.sendEmail;
    }

    if (Object.keys(patchPayload).length > 0 || values.sendEmail) {
      mutation.mutate(patchPayload);
    }
  }

  const handleOpenComponent = (type: "programs" | "courses") => {
    setOpenComponent(type);
  };

  return (
    <>
      {canEditStudents &&
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-4 tw-rounded-lg tw-mb-3">
        <div className="tw-flex tw-justify-start tw-items-center tw-gap-10">
          <Button
            variant="outline"
            onClick={() => handleOpenComponent("programs")}
          >
            <AlertDialog>
              <AlertDialogTrigger className="tw-flex tw-flex-row tw-items-center tw-gap-1">
                <Plus className="tw-w-4 tw-h-4" />
                Add to programs
              </AlertDialogTrigger>
              <AlertDialogContent className="!tw-bg-white  tw-rounded-sm !tw-w-[910px] !tw-max-w-none tw-h-50% ">
                <AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="tw-h-15 tw-w-15">
                      <X className="tw-w-4 tw-h-4" />
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                  <AlertDialogTitle></AlertDialogTitle>
                  <AlertDialogDescription>
                    {openComponent && (
                      <DragandDrop studentId={studentId} type={openComponent} />
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenComponent("courses")}
            className="tw-px-5"
          >
            <AlertDialog>
              <AlertDialogTrigger className="tw-flex tw-flex-row tw-items-center tw-gap-1">
                <Plus className="tw-w-4 tw-h-4" />
                Add to courses
              </AlertDialogTrigger>
              <AlertDialogContent className="!tw-bg-white  tw-rounded-sm !tw-w-[910px] !tw-max-w-none tw-h-50% ">
                <AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="tw-h-15 tw-w-15">
                      <X className="tw-w-4 tw-h-4" />
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                  <AlertDialogTitle></AlertDialogTitle>
                  <AlertDialogDescription>
                    {openComponent && (
                      <DragandDrop studentId={studentId} type={openComponent} />
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
              </AlertDialogContent>
            </AlertDialog>
          </Button>
        </div>
      </div>
      }
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-lg">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <div className="tw-flex tw-gap-6">
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="StudentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="StudentId">Student ID</FormLabel>
                      <FormControl>
                        <Input
                          id="StudentId"
                          placeholder="AB12456"
                          {...field}
                          disabled={!canEditStudents}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.StudentId?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          id="name"
                          placeholder="Full name"
                          {...field}
                          disabled={!canEditStudents}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.name?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  name="InstitutionEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="InstitutionEmail">
                        Institution Email ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="InstitutionEmail"
                          placeholder="yourname@institution.com"
                          {...field}
                          disabled={!canEditStudents}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.InstitutionEmail?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="contactPhoneNumber.number"
                  render={({ field }) => (
                    <FormItem className="tw-w-full">
                      <FormLabel htmlFor="contact">Contact</FormLabel>
                      <FormControl className="tw-w-full">
                        <PhoneInput
                          international
                          id="number"
                          placeholder="Enter a phone number"
                          className="tw-w-full"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          disabled={!canEditStudents}
                        />
                      </FormControl>
                      <FormMessage>
                        {
                          methods.formState.errors.contactPhoneNumber?.number
                            ?.message
                        }
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="Organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="organization">Organization</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedOrganization(value);
                          }}
                          disabled={isLoadingOrganizations || !canEditStudents}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder={field.value} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingOrganizations ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              organizations?.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.Organization?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="Gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="Gender">Gender</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || ""} // Add a fallback empty string
                          disabled={!canEditStudents}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {Object.entries(Gender).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.Gender?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="PersonalEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="PersonalEmail">
                        Primary Email ID (Personal ID)
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="PersonalEmail"
                          placeholder="yourname@gmail.com"
                          {...field}
                          disabled={!canEditStudents}
                        />
                      </FormControl>
                      <FormMessage></FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="DOB"
                  render={({ field }) => (
                    <FormItem className="tw-flex tw-flex-col tw-mt-1">
                      <FormLabel htmlFor="DOB">Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "tw-w-full tw-px-4 tw-text-left tw-mt-1 tw-border-border",
                                !field.value && "tw-text-muted"
                              )}
                              disabled={!canEditStudents}
                            >
                              {field.value
                                ? format(field.value, "PPP")
                                : "Pick a date"}
                              <CalendarDays className="tw-ml-auto tw-h-4 tw-w-4 tw-opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="tw-w-auto tw-p-0">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage>
                        {methods.formState.errors.DOB?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                <FormField
                  control={methods.control}
                  name="Batch"
                  render={({ field }) => {
                    const batchArray = Array.isArray(batches)
                      ? batches
                      : batches.Batches || [];
                    return (
                      <FormItem>
                        <FormLabel htmlFor="Batch">Batch</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            value={field.value}
                            disabled={!canEditStudents}
                          >
                            <SelectTrigger className="tw-w-full">
                              <SelectValue>
                                {field.value
                                  ? batchArray.find(
                                      (batch) => batch.batchId === field.value
                                    )?.name || "Select a batch"
                                  : "Select a batch"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingBatches ? (
                                <SelectItem value="loading" disabled>
                                  Loading...
                                </SelectItem>
                              ) : (
                                batchArray.map((batch) => (
                                  <SelectItem
                                    key={batch.batchId}
                                    value={batch.batchId}
                                  >
                                    {batch.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage>
                          {methods.formState.errors.Batch?.message}
                        </FormMessage>
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={methods.control}
                  name="APSCHE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="APSCHE">APSCHE</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          disabled={!canEditStudents}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder={field.value} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {Object.entries(APSCHE).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  {value}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.APSCHE?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="tw-flex tw-flex-row tw-gap-4 tw-pt-4">
              <FormField
                control={methods.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="tw-flex tw-items-center tw-gap-2  tw-space-y-0  tw-mt-3  tw-text-[#424242]">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canEditStudents}
                      />
                    </FormControl>
                    <label className="tw-text-[14px]">
                      Generate new password and notify user immediately
                    </label>
                  </FormItem>
                )}
              />
              <div className="tw-flex tw-gap-4 tw-mt-3 tw-justify-center">
                <FormField
                  control={methods.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="tw-flex tw-gap-6"
                          disabled={!canEditStudents}
                        >
                          <div className="tw-flex tw-items-center tw-space-x-2">
                            <RadioGroupItem value="active" id="active" />
                            <Label htmlFor="active">Active</Label>
                          </div>
                          <div className="tw-flex tw-items-center tw-space-x-2">
                            <RadioGroupItem value="inactive" id="inactive" />
                            <Label htmlFor="inactive">Inactive</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.status?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="tw-text-primary tw-mt-[20px]">
              <h5 className="tw-italic">All fields are mandatory*</h5>
            </div>
            <hr className="tw-border-t tw-border-gray-300 tw-mt-2 tw-mb-3" />
            {canEditStudents && (
              <Button
                type="submit"
                disabled={mutation.isPending || !methods.formState.isDirty}
              >
                {mutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            )}
          </form>
        </FormProvider>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
            <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
              {dialogContent.title === "Student Updated Successfully" ? (
                <CircleCheck className="tw-text-green-500" size={60} />
              ) : (
                <CircleX className="tw-text-red-500 " size={60} />
              )}

              <AlertDialogTitle>
                <span className="tw-text-primary">{dialogContent.title}</span>
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

            <AlertDialogFooter className="tw-w-full !tw-justify-center ">
              <AlertDialogAction onClick={() => setShowDialog(false)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

export default StudentDetailPage;