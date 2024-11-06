import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PhoneInput from "@/components/ui/phone-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, CircleCheck, CircleX, X } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";


const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit }
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
      hasMore: response.data.hasMore,
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const createStudent = async (studentData) => {
  const response = await api.post(`/students`, studentData);
  return response.data;
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
    .refine((value) => !value.startsWith(' '), {
      message: "Name cannot start with a space."
    }),
  InstitutionEmail: z.string().email({ message: "Invalid email address." }),
  PersonalEmail: z.string().email().optional(),
  Gender: z.string().min(3, { message: "Gender is Required." }),
  DOB: z.date({
    required_error: "Date of Birth is required.",
  }),
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
  APSCHE: z.string().min(1, { message: "Confirmation is required." }),

  status: z.enum(["active", "inactive"], {
    required_error: "Status is required.",
  }),
  sendEmail: z.boolean(),
});

const Gender: Record<string, string> = {
  Male: "Male",
  Female: "Female",
};
const APSCHE: Record<string, string> = {
  Yes: "Yes",
  No: "No",
};


export default function StudentAddPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({ title: "", description: "" });
  const [email, setEmail] = useState("");
  const [selectedOrganization, setSelectedOrganization] = useState("");
  
  const { permissionSet } = usePolicies();
  // const canCreateStudents = checkActionScopes(permissionSet, "student:write", ["admin","supervisor","program","organization"]);
  const canCreateStudents = checkActionScopes(permissionSet, "student:write", ["admin"]);

  const { data: organizations = [], isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ['organizations', 1, 200],
    queryFn: () => fetchOrganizations(),
  });

  const{data:batches=[],isLoading:isLoadingBatches}=useQuery(
    {
      queryKey:['batches',selectedOrganization],
      queryFn:()=>fetchBatches(selectedOrganization),
      enabled: !!selectedOrganization,
    }
  )

  const mutation = useMutation({
    mutationFn: createStudent,
    onSuccess: () => {
      setDialogContent({
        title: "Student Added Successfully",
        description: methods.getValues("sendEmail")
          ? `We have shared a link at the email address: ${methods.getValues("InstitutionEmail")}. The Student can click the link to reset the password.`
          : "The student has been added successfully.",
      });
      setShowDialog(true);
      methods.reset({
        StudentId: "",
        name: "",
        InstitutionEmail: "",
        PersonalEmail: "",
        Gender: "",
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
      });
    },
    onError: () => {
      setDialogContent({
        title: "Error While Adding Student",
        description: "There was an issue while adding the student. Please try again.",
      });
      setShowDialog(true);
    },
  });


  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      StudentId: "",
      name: "",
      InstitutionEmail: "",
      PersonalEmail: "",
      Gender: "",
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    const number = values.contactPhoneNumber.number;
    let phoneNumber;
    if (isValidPhoneNumber(number)) {
      phoneNumber = parsePhoneNumber(number);
    }
    setEmail(values.PersonalEmail);
    
    const payload = {
      email: values.InstitutionEmail,
      name: values.name,
      organization: values.Organization,
      isActive: values.status === "active",
      sendEmail: values.sendEmail,
      joiningDate: format(values.DOB, "yyyy-MM-dd"),
      givenStudentId: values.StudentId,
      apsche: values.APSCHE === "Yes",
      batchId: values.Batch,
      ...(values.PersonalEmail && {personalEmail: values.PersonalEmail}),
      dateOfBirth: format(values.DOB, "yyyy-MM-dd"),
      contactPhoneNumber: {
        countryCode: phoneNumber ? phoneNumber.country : '',
        number: phoneNumber ? phoneNumber.nationalNumber : '',
      },
      gender: values.Gender.toLowerCase(), 
    };
    mutation.mutate(payload);
  }

  return (
    <>
      {/* <div>
      <p className="tw-text-[12px] tw-leading-[18px] tw-mb-3">User profiles store information about users. You can update user information later by clicking on the user profile.which will bring up this same screen</p>
        <Link to="/" disabled={!canCreateStudents}>
          <h6 className="tw-underline tw-my-2 tw-text-primary">
            Data Import/Export
          </h6>
        </Link>
        <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-4 tw-rounded-lg tw-mb-3">
          Tag Course Or Program
          <div className="tw-relative">
            <Search className="tw-absolute tw-w-4 tw-h-4 tw-left-2 tw-top-1" />
            <Input
              className="tw-opacity-1 tw-w-80 tw-h-7 tw-pl-7 tw-pr-2 tw-gap-4"
              type="text"
              placeholder="Search Course or Program"
              disabled={!canCreateStudents}
            />
          </div>
        </div>
      </div> */}
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-lg">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <div className="tw-flex tw-gap-6">
              {/* Left Column */}
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="StudentId" // Corrected to match schema
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="StudentId">Student ID</FormLabel>
                      <FormControl>
                        <Input
                          id="StudentId"
                          placeholder="AB12456"
                          {...field}
                          disabled={!canCreateStudents}
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
                  name="name" // should match schema
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="name">Full Name</FormLabel>
                      <FormControl>
                        <Input id="name" placeholder="Full name" {...field} disabled={!canCreateStudents}/>
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
                          disabled={!canCreateStudents}
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
                        disabled={!canCreateStudents}
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
                        disabled={isLoadingOrganizations || !canCreateStudents}
                      >
                        <SelectTrigger className="tw-w-full">
                          <SelectValue placeholder="Select Organization" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingOrganizations ? (
                            <SelectItem value='loading' disabled>Loading...</SelectItem>
                          ) : (
                            organizations?.results?.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage>{methods.formState.errors.Organization?.message}</FormMessage>
                  </FormItem>
                )}
              />
              </div>

              {/* Right Column */}
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="Gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="Gender">Gender</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} disabled={!canCreateStudents}  value={field.value || ""}>
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
                          disabled={!canCreateStudents}
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
                              disabled={!canCreateStudents}
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="Batch">Batch</FormLabel>
                      <FormControl>
                        <Select
                       onValueChange={(value) => field.onChange(value)}
                       value={field.value}
                         disabled={!selectedOrganization || !canCreateStudents}
>
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
            {isLoadingBatches ? (
              <SelectItem value="loading" disabled>Loading...</SelectItem>
            ) : 
            (
              Array.isArray(batches) ? (
                batches.map((batch) => (
                  <SelectItem key={batch.batchId} value={batch.batchId}>
                    {batch.name}
                  </SelectItem>
                ))
              ) :
               (
                (batches.Batches || []).map((batch) => (
                  <SelectItem key={batch.batchId} value={batch.batchId}>
                    {batch.name}
                  </SelectItem>
                ))
              )
            )}
          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.Batch?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="APSCHE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="APSCHE">APSCHE</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} disabled={!canCreateStudents}  value={field.value || ""}>
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder="Confirmation" />
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
                  <FormItem className="tw-flex tw-items-center tw-gap-2 tw-space-y-0  tw-mt-2  tw-text-[#424242]">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canCreateStudents}
                      />
                    </FormControl>
                    <label className="tw-text-[14px]">Generate new password and notify user immediately</label>
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
                          disabled={!canCreateStudents}
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
            {canCreateStudents &&
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            }
          </form>
        </FormProvider>


<AlertDialog open={showDialog} onOpenChange={setShowDialog}>
  <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
    <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
      {dialogContent.title === "Student Added Successfully" ? (
        <CircleCheck className="tw-text-green-500" size={60} /> 
      ) : (
        <CircleX className="tw-text-red-500 "size={60} />
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
        {dialogContent.title === "Student Added Successfully" && methods.getValues("sendEmail") ? (
          <>
            {dialogContent.description}
            <br />
            We will share a link at the email address: <strong>{email}</strong>. The student can click the link to reset the password.
          </>
        ) : (
          dialogContent.description
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter className="tw-w-full  !tw-justify-center ">
      <AlertDialogAction onClick={() => setShowDialog(false)}>Continue</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      </div>
    </>
  );
}
