import * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import PhoneInput from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { CircleCheck, X, CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "react-multi-select-component";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Link } from "@tanstack/react-router";
import { CircleX } from "lucide-react";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface Program {
  name: string;
  programId: string;
}

type UserPayload = {
  givenUserId: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  isActive: boolean;
  sendEmail: boolean;
  joiningDate: string;
  contactPhoneNumber: {
    countryCode: string;
    number: string;
  };
  programMappings: string[];
};

const fetchOrganizations = async (page = 1, limit = 200) => {
  const { data } = await api.get(`/organizations`, {
    params: { page, limit },
  });
  return data;
};
const fetchRoles = async () => {
  const { data } = await api.get(`/roles`);
  return data;
};

const fetchPrograms = async () => {
  const limit = 200;
  const page = 1;
  const { data } = await api.get(`/programs`, {
    params: { limit, page },
  });
  return data?.results ?? [];
};

const formSchema = z.object({
  givenUserId: z
    .string()
    .min(1, { message: "User ID is required." })
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "User ID can only contain letters, numbers, hyphens, and underscores.",
    }),
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
  email: z.string().email({ message: "Invalid email address." }),
  organization: z.string().min(1, { message: "Organization is required." }),
  contactPhoneNumber: z.object({
    countryCode: z.string().min(1, { message: "Country code is required." }),
    number: z
      .string()
      .min(1, { message: "Phone number is required." })
      .refine((value) => isValidPhoneNumber(value), {
        message: "Invalid phone number format.",
      }),
  }),

  role: z.string().min(1, { message: "Role is required." }),

  sendEmail: z.boolean(),

  status: z.enum(["active", "inactive"], {
    required_error: "You need to select a status.",
  }),

  joiningDate: z.date(),
  programMappings: z.array(z.string()).optional(),
});

export default function UserAddPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [selected, setSelected] = useState([]);
  const [isFaculty, setIsFaculty] = useState(false);

  const { permissionSet } = usePolicies();
  const canEditUsers = checkActionScopes(permissionSet, "user:write", [
    "admin",
  ]);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      givenUserId: "",
      name: "",
      email: "",
      organization: "",
      contactPhoneNumber: {
        countryCode: "+91",
        number: "",
      },
      joiningDate: new Date(),
      role: "",
      sendEmail: false,
      status: "active",
      programMappings: [],
    },
  });
  const page = 1;
  const limit = 200;

  const { data, isLoading: isLoadingOrganizations } = useQuery({
    queryKey: ["organizations", page, limit],
    queryFn: () => fetchOrganizations(page, limit),
    staleTime: 5000,
  });
  const organizations = data?.results ?? [];

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ["programs", { limit: 200, page: 1, isFaculty }],
    queryFn: fetchPrograms,
    enabled: isFaculty,
  });

  const mutation = useMutation({
    mutationFn: async (payload: UserPayload) => {
      try {
        const response = await api.post(`/users`, payload);
        return response.data;
      } catch (error) {
        console.error("Error adding user:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log("User added successfully:", data);
      if (variables.sendEmail) {
        setDialogMessage(
          `We will share a link at the email address: ${variables.email}. The user can click the link to reset the password.`
        );
      } else {
        setDialogMessage("User Added to list");
      }
      setShowDialog(true);

      methods.reset({
        givenUserId: "",
        name: "",
        email: "",
        organization: "",
        contactPhoneNumber: {
          countryCode: "+91",
          number: "",
        },
        joiningDate: new Date(),
        role: "",
        sendEmail: false,
        status: "active",
      });
    },
    onError: (error) => {
      console.error("Error adding user:", error);
      setErrorMessage("There was a problem with your request.");
      setShowErrorDialog(true);
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const number = values.contactPhoneNumber.number;
    let phoneNumber;
    if (isValidPhoneNumber(number)) {
      phoneNumber = parsePhoneNumber(number);
    }
    const payload: UserPayload = {
      givenUserId: values.givenUserId,
      name: values.name,
      email: values.email,
      role: values.role,
      organization: values.organization,
      isActive: values.status === "active",
      sendEmail: values.sendEmail,
      joiningDate: format(values.joiningDate, "yyyy-MM-dd"),
      contactPhoneNumber: {
        countryCode: phoneNumber ? phoneNumber.country : "",
        number: phoneNumber ? phoneNumber.nationalNumber : "",
      },
      programMappings: isFaculty ? selected.map((item) => item.value) : [],
    };
    mutation.mutate(payload);
  }

  return (
    <>
      {/* <div>
        <p className="tw-text-[12px] tw-leading-[18px] tw-mb-3">
          User profiles store information about users. You can update user
          information later by clicking on the user profile.
        </p>
        <Link
          to="/"
          className="tw-text-primary tw-underline hover:tw-underline  "
          disabled={!canEditUsers}
        >
          Data Import/Export
        </Link>
      </div> */}
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-sm tw-mt-2">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <div className="tw-flex tw-gap-6">
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="givenUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="givenUserId">User ID</FormLabel>
                      <FormControl>
                        <Input
                          id="givenUserId"
                          placeholder="User ID"
                          {...field}
                          disabled={!canEditUsers}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.givenUserId?.message}
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
                          placeholder="Full Name"
                          {...field}
                          disabled={!canEditUsers}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.name?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">Email ID</FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="Email ID"
                          {...field}
                          disabled={!canEditUsers}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.email?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="organization">Organization</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoadingOrganizations || !canEditUsers}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder="Select Organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingOrganizations ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              organizations.map((org) => (
                                <SelectItem key={org.id} value={org.id}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.organization?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="contactPhoneNumber.number"
                  render={({ field }) => (
                    <FormItem className="tw-w-full">
                      <FormLabel htmlFor="number">Contact</FormLabel>
                      <FormControl className="tw-w-full">
                        <PhoneInput
                          international
                          id="number"
                          placeholder="Enter a phone number"
                          className="tw-w-full"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          disabled={!canEditUsers}
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
                  name="joiningDate"
                  render={({ field }) => (
                    <FormItem className="tw-flex tw-flex-col tw-mt-1.5">
                      <FormLabel htmlFor="joiningDate">Joining Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={!canEditUsers}
                              className={cn(
                                "tw-w-full tw-px-4 tw-text-left tw-border-border",
                                !field.value && "tw-text-muted"
                              )}
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
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="role">Assign Role</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedRole = roles.find(
                              (role) => role.id === value
                            );
                            const newIsFaculty =
                              selectedRole?.roleName.toLowerCase() ===
                              "faculty";
                            setIsFaculty(newIsFaculty);
                            if (!newIsFaculty) {
                              setSelected([]);
                            }
                          }}
                          disabled={isLoadingRoles || !canEditUsers}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder="Select Role" />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingRoles ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.id}>
                                  {role.roleName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.role?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {isFaculty && (
                  <FormField
                    control={methods.control}
                    name="programMappings"
                    render={() => (
                      <FormItem>
                        <FormLabel htmlFor="programMappings">
                          Programs
                        </FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={programs.map((program: Program) => ({
                              label: program.name,
                              value: program.programId,
                            }))}
                            value={selected}
                            onChange={setSelected}
                            labelledBy="Select"
                            isLoading={isLoadingPrograms}
                            disabled={!isFaculty || !canEditUsers} // Disable when not faculty
                          />
                        </FormControl>
                        <FormMessage>
                          {/* {methods.formState.errors.programMappings?.message} */}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
            <div className="tw-flex tw-flex-row tw-gap-4 tw-pt-4">
              <FormField
                control={methods.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="tw-flex tw-items-center tw-gap-2 !tw-space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        disabled={!canEditUsers}
                        onCheckedChange={(checked) =>
                          field.onChange(checked || false)
                        }
                      />
                    </FormControl>
                    <label className="tw-text-[12px]">
                      Generate new password and notify user immediately
                    </label>
                  </FormItem>
                )}
              />
              <div className="tw-flex tw-gap-4 tw-mt-3">
                <FormField
                  control={methods.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="tw-flex tw-gap-6 tw-mb-2 "
                          disabled={!canEditUsers}
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
            <div className="tw-text-primary tw-mt-5">
              <h5 className="tw-italic">All fields are mandatory*</h5>
            </div>
            <Separator className="tw-border-t tw-border-gray-300 tw-mt-2 tw-mb-3" />
            {canEditUsers && (
              <Button disabled={mutation.isPending} type="submit">
                {mutation.isPending ? "Submitting..." : "Submit"}
              </Button>
            )}
          </form>
        </FormProvider>
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
      </div>
    </>
  );
}
