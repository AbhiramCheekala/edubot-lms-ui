import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider, useController } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { CircleCheck, X, CalendarDays } from "lucide-react";
import PhoneInput from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { MultiSelect } from "react-multi-select-component";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "@tanstack/react-router";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface UserData {
  givenUserId: string;
  name: string;
  email: string;
  orgName: string;
  organization: string;
  contactPhoneNumber: {
    countryCode: string;
    number: string;
  };
  joiningDate: any;
  roleName: string;
  role: string;
  sendEmail: boolean;
  isActive: any;
  programMappings?: string[];
}

const fetchPrograms = async () => {
  const { data } = await api.get(`/programs?limit=200`);
  return data?.results ?? [];
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
const fetchUserDetails = async (userId) => {
  const { data } = await api.get(
    `/users/${userId}?includeRole=true&includeOrg=true`
  );
  return data;
};

const updateUser = async (userId: string, payload: Partial<UserData>) => {
  const { data } = await api.patch(`/users/${userId}`, payload);
  return data;
};

const formSchema = z.object({
  givenUserId: z.string(),
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
  orgName: z.string(),
  contactPhoneNumber: z.object({
    countryCode: z.string().min(1, { message: "Country code is required" }),
    number: z.string(),
  }),
  roleName: z.string(),
  sendEmail: z.boolean(),
  isActive: z.enum(["active", "inactive"]),
  joiningDate: z.date(),
  programMappings: z.array(z.string()).optional(),
});

export function UserDetail() {
  const { userId } = useParams({ from: "/_authenticated/users/$userId" });
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");

  const [showAlert, setShowAlert] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertDescription, setAlertDescription] = useState("");
  const [generatePasswordOnly, setGeneratePasswordOnly] = useState(false);
  const [isFaculty, setIsFaculty] = useState(false);
  const [selected, setSelected] = useState([]);

  const { permissionSet } = usePolicies();
  const canEditUsers = checkActionScopes(permissionSet, "user:write", [
    "admin",
  ]);

  const methods = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      givenUserId: "",
      name: "",
      email: "",
      orgName: "",
      organization: " ",
      contactPhoneNumber: {
        countryCode: "",
        number: "",
      },
      joiningDate: new Date(),
      roleName: "",
      role: " ",
      sendEmail: false,
      isActive: "active",
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

  const { data: programs = [], isLoading: isLoadingPrograms } = useQuery({
    queryKey: ["programs"],
    queryFn: fetchPrograms,
    enabled: isFaculty,
  });

  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const { data: userDetails } = useQuery({
    queryKey: ["userDetails", userId],
    queryFn: () => fetchUserDetails(userId),
    enabled: !!userId,
  });

  const [showCombinedAlert, setShowCombinedAlert] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: Partial<UserData>) => updateUser(userId, payload),
    onSuccess: () => {
      if (methods.getValues("sendEmail")) {
        setEmail(methods.getValues("email"));
        setShowCombinedAlert(true);
      } else {
        setAlertTitle("Success");
        setAlertDescription("User updated successfully.");
        setShowAlert(true);
      }
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ["userDetails", userId],
      });

      queryClient
        .fetchQuery({
          queryKey: ["userDetails", userId],
        })
        .then((data: UserData) => {
          if (data) {
            methods.reset(data);
          }
        });
    },
    onError: () => {
      setAlertTitle("Error");
      setAlertDescription("There was a problem with your request.");
      setShowAlert(true);
      methods.reset();
    },
  });

  useEffect(() => {
    if (userDetails) {
      const rawNumber = String(userDetails.contactPhoneNumber?.number || "");
      const countryCode = userDetails.contactPhoneNumber?.countryCode || "";
      setIsFaculty(userDetails.roleName.toLowerCase() === "faculty");
      const programIds = userDetails.programMappings.map(
        (mapping) => mapping.programId
      );
      console.log(programIds);
      setSelected(programIds);
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
        givenUserId: userDetails.givenUserId,
        name: userDetails.name,
        email: userDetails.email,
        orgName: userDetails.orgName,
        contactPhoneNumber: {
          countryCode: userDetails.contactPhoneNumber?.countryCode,
          number: formattedNumber,
        },
        joiningDate: new Date(userDetails.joiningDate),
        roleName: userDetails.roleName,
        sendEmail: false,
        isActive: userDetails.isActive ? "active" : "inactive",
        programMappings: programIds,
      });
    }
  }, [userDetails, methods, organizations, roles]);

  const { field: isActiveField } = useController({
    name: "isActive",
    control: methods.control,
  });
  function onSubmit(values) {
    const dirtyFields = methods.formState.dirtyFields;
    const number = values.contactPhoneNumber.number;
    let phoneNumber;

    if (isValidPhoneNumber(number)) {
      phoneNumber = parsePhoneNumber(number);
    }

    const patchPayload: Partial<UserData> = {};
    if (dirtyFields.givenUserId) patchPayload.givenUserId = values.givenUserId;
    if (dirtyFields.name) patchPayload.name = values.name;
    if (dirtyFields.email) patchPayload.email = values.email;
    if (dirtyFields.roleName) {
      const roleId = roles.find(
        (role) => role.roleName === values.roleName
      )?.id;
      if (roleId) patchPayload.role = roleId;
    }
    if (dirtyFields.orgName) {
      const orgId = organizations.find(
        (org) => org.name === values.orgName
      )?.id;
      if (orgId) patchPayload.organization = orgId;
    }
    if (dirtyFields.isActive)
      patchPayload.isActive = values.isActive === "active";
    if (dirtyFields.joiningDate)
      patchPayload.joiningDate = format(
        values.joiningDate,
        "yyyy-MM-dd HH:mm:ss"
      );

    if (
      dirtyFields.contactPhoneNumber?.countryCode ||
      dirtyFields.contactPhoneNumber?.number
    ) {
      patchPayload.contactPhoneNumber = {
        countryCode: phoneNumber ? phoneNumber.country : "",
        number: phoneNumber ? phoneNumber.nationalNumber : "",
      };
    }

    if (values.sendEmail) patchPayload.sendEmail = values.sendEmail;

    if (dirtyFields.programMappings && isFaculty) {
      patchPayload.programMappings = selected.map((item) => item.value);
    }

    if (Object.keys(patchPayload).length === 0 || values.sendEmail) {
      setGeneratePasswordOnly(true);
      setEmail(values.email);
      setShowCombinedAlert(true);
    }

    if (Object.keys(patchPayload).length > 0) {
      mutation.mutate(patchPayload);
    }
  }

  return (
    <>
      {/* <div>
         <p className="tw-text-sm  tw-mb-3">User profiles store information about users. You can update user information later by clicking on the user profile.</p>
         <Link to="/" className="tw-text-primary tw-underline hover:tw-underline  ">
                  Data Import/Export
          </Link>
        </div>              */}
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-lg tw-mt-4">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
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
                      <FormLabel htmlFor="username">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          id="username"
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
                  name="orgName"
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
                            <SelectValue placeholder={field.value} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingOrganizations ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              organizations.map((org) => (
                                <SelectItem key={org.id} value={org.name}>
                                  {org.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.orgName?.message}
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
                    <FormItem>
                      <FormLabel htmlFor="contact">Contact</FormLabel>
                      <FormControl>
                        <PhoneInput
                          international
                          id="contactPhoneNumber"
                          placeholder="Enter phone number"
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
                    <FormItem className="tw-flex tw-flex-col tw-mt-2">
                      <FormLabel htmlFor="joiningDate">Joining Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "tw-w-full tw-px-4 tw-text-left tw-font-normal tw-mt-1 tw-border-border",
                                !field.value && "tw-text-muted"
                              )}
                              disabled={!canEditUsers}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarDays className="tw-w-4 tw-h-4 tw-ml-auto tw-opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent
                          className="tw-w-auto tw-p-0"
                          align="start"
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage>
                        {methods.formState.errors.joiningDate?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="roleName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="roleName">Assign Role</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            setIsFaculty(value.toLowerCase() === "faculty");
                          }}
                          disabled={isLoadingRoles || !canEditUsers}
                        >
                          <SelectTrigger className="tw-w-full">
                            <SelectValue placeholder={field.value} />
                          </SelectTrigger>
                          <SelectContent>
                            {isLoadingRoles ? (
                              <SelectItem value="loading" disabled>
                                Loading...
                              </SelectItem>
                            ) : (
                              roles.map((role) => (
                                <SelectItem key={role.id} value={role.roleName}>
                                  {role.roleName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.roleName?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                {isFaculty && (
                  <FormField
                    control={methods.control}
                    name="programMappings"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="programMappings">
                          Programs
                        </FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={programs.map((program) => ({
                              label: program.name,
                              value: program.programId,
                            }))}
                            value={field.value.map((value) => ({
                              label:
                                programs.find((p) => p.programId === value)
                                  ?.name || value,
                              value,
                            }))}
                            onChange={(selectedOptions) => {
                              setSelected(selectedOptions);
                              field.onChange(
                                selectedOptions.map((option) => option.value)
                              );
                            }}
                            labelledBy="Select Programs"
                            isLoading={isLoadingPrograms}
                            disabled={!canEditUsers}
                          />
                        </FormControl>
                        <FormMessage>
                          {methods.formState.errors.programMappings?.message}
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            <div className="tw-flex tw-gap-4 tw-pt-5 ">
              <FormField
                control={methods.control}
                name="sendEmail"
                render={({ field }) => (
                  <FormItem className="tw-flex tw-items-center tw-gap-2 tw-space-y-0 tw-mt-1  tw-text-[#424242]">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked || false)
                        }
                        disabled={!canEditUsers}
                      />
                    </FormControl>
                    <label className="tw-text-[14px]">
                      Generate new password and notify user immediately
                    </label>
                  </FormItem>
                )}
              />
              <RadioGroup
                onValueChange={isActiveField.onChange}
                value={isActiveField.value}
                className="tw-flex tw-mt-3"
                disabled={!canEditUsers}
              >
                <div className="tw-flex tw-items-center tw-space-x-2 ">
                  <RadioGroupItem value="active" id="active" />
                  <Label htmlFor="active" className="tw-text-sm">
                    Active
                  </Label>
                </div>
                <div className="tw-flex tw-items-center tw-space-x-2 ">
                  <RadioGroupItem value="inactive" id="inactive" />
                  <Label htmlFor="inactive" className="tw-text-sm ">
                    Inactive
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {canEditUsers && (
              <>
                <div className="tw-text-primary tw-mt-[20px]">
                  <h5 className="tw-italic">All fields are mandatory*</h5>
                </div>
                <Separator className="tw-mt-2 tw-mb-3" />
                <Button
                  type="submit"
                  disabled={mutation.isPending || !methods.formState.isDirty}
                >
                  {mutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </>
            )}
          </form>
        </FormProvider>

        {showAlert && (
          <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
            <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto tw-bg-white tw-py-4 tw-px-6 tw-rounded-lg">
              <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
                <div
                  className={`tw-text-xl ${alertTitle === "Success" ? "tw-text-green-500" : "tw-text-red-500"}`}
                >
                  {alertTitle === "Success" ? (
                    <CircleCheck size={64} />
                  ) : (
                    <X size={64} />
                  )}
                </div>
                <div className="tw-flex tw-justify-center tw-m-auto">
                  <AlertDialogTitle>{alertTitle}</AlertDialogTitle>
                  <button
                    className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
                    onClick={() => setShowAlert(false)}
                    aria-label="Close"
                  >
                    <X className="tw-text-xl" />
                  </button>
                </div>
                <AlertDialogDescription className="tw-mt-4 tw-text-center">
                  {alertDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="tw-flex !tw-justify-center">
                <AlertDialogAction onClick={() => setShowAlert(false)}>
                  OK
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {showCombinedAlert && (
          <AlertDialog
            open={showCombinedAlert}
            onOpenChange={setShowCombinedAlert}
          >
            <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto tw-bg-white tw-py-4 tw-px-6 tw-rounded-lg">
              <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
                <CircleCheck className="tw-text-green-500" size={64} />
                <div className="tw-flex tw-justify-center tw-m-auto">
                  <AlertDialogTitle>
                    <span>
                      {generatePasswordOnly
                        ? "Password Generated"
                        : "Update and Password Generated"}
                    </span>
                  </AlertDialogTitle>
                  <button
                    className="tw-absolute tw-top-2 tw-right-2 tw-text-gray-500 hover:tw-text-gray-900"
                    onClick={() => setShowCombinedAlert(false)}
                    aria-label="Close"
                  >
                    <X className="tw-text-xl" />
                  </button>
                </div>
                <AlertDialogDescription className="tw-mt-4 tw-text-center">
                  {generatePasswordOnly
                    ? `Your password has been generated successfully.We will share a link at the email address: ${email}. The user can click the link to reset the password.`
                    : `We will share a link at the email address: ${email}. The user can click the link to reset the password.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="tw-flex !tw-justify-center">
                <AlertDialogAction onClick={() => setShowCombinedAlert(false)}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  );
}
export default UserDetail;
