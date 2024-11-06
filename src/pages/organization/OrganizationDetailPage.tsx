import * as React from "react";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { z } from "zod";
import PhoneInput from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { CircleCheck, CircleX, X } from "lucide-react";
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "@tanstack/react-router";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";

interface organizationData{
  name: string;
  email: string;
  state: string;
  pincode: string;
  contactPhoneNumber: {
    countryCode: string;
    number: string;
  },
  givenOrgId: string;
  address: string;
  isActive : boolean;

  
}

// Define the form schema using Zod for Form Validation
const formSchema = z.object({
  organizationName: z.string()
  .min(2, { message: "organizationName must be at least 2 characters." })
  .max(100, { message: "organizationName cannot exceed 100 characters." })
  .regex(/^[a-zA-Z\s'-]+$/, {
    message: "Name can only contain letters, spaces, hyphens, and apostrophes."
  })
  .refine((value) => !value.startsWith(' '), {
    message: "Name cannot start with a space."
  }),   
  email: z.string().email({ message: "Invalid email address." }),
  state: z
    .string()
    .min(2, { message: "State must be at least 2 characters." })
    .regex(/^[A-Za-z\s]+$/, { message: "State can only contain letters and spaces." }),
  pincode: z
    .string()
    .length(6, { message: "Pincode must be exactly 6 digits." })
    .regex(/^[1-9][0-9]{5}$/, { message: "Pincode cannot start with zero." }),
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
  organizationId: z
    .string()
    .min(3, { message: "Organization ID must be at least 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, { message: "Organization ID can only contain letters and numbers." }),
  address: z.string().optional(),
  githubCreated: z.boolean(),
});



// Fetch organization details
const fetchOrganizationDetails = async (organizationId: string) => {
  const response = await api.get(`/organizations/${organizationId}`);
  if (response.status !== 200) {
    throw new Error('Failed to fetch organization details');
  }
  const data = response.data;
  return data;
};

const updateOrganization = async (
  organizationId: string,
  payload: Partial<organizationData>
) => {
  const { data } = await api.patch(
    `/organizations/${organizationId}`,
    payload
  );
  return data;
};


export function OrganizationDetailPage() {
  const { organizationId } = useParams({
    from: "/_authenticated/organization/$organizationId",
  });
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({
    title: "",
    description: "",
  });
  const queryClient = useQueryClient();
  const { permissionSet } = usePolicies();
  const canEditOrganization = checkActionScopes(
    permissionSet, "organization:write", ["admin","organization","supervisor","program"]
  );

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationName: "",
      email: "",
      contactPhoneNumber: {
        countryCode: "",
        number: "",
      },
      organizationId: "",
      state: "",
      address: "",
      pincode: "",
      githubCreated: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: Partial<organizationData>) =>
      updateOrganization(organizationId, payload),
    onSuccess: () => {
      setDialogContent({
        title: "Organization Updated Successfully",
        description: "The organization has been Updated successfully.",
      });
      setShowDialog(true);
      // Invalidate the query to trigger a refetch
      queryClient.invalidateQueries({
        queryKey: ["organizationDetails", organizationId],
      });

      queryClient
        .fetchQuery({
          queryKey: ["organizationDetails", organizationId],
        })
        .then((data: organizationData) => {
          if (data) {
            methods.reset(data);
          }
        });
    },
    onError: () => {
      setDialogContent({
        title: "Error While Updating Organization",
        description:
          "There was an issue while Updating the Organization. Please try again.",
      });
      setShowDialog(true);
      methods.reset();
    },
  });

  //fetching and refetching data after updating the data
  const { data: organizationDetails } = useQuery({
    queryKey: ["organizationDetails", organizationId],
    queryFn: () => fetchOrganizationDetails(organizationId),
    enabled: !!organizationId,
  });
  

  function onSubmit(values: z.infer<typeof formSchema>) {
    const dirtyFields = methods.formState.dirtyFields;
    const number = values.contactPhoneNumber.number;
    let phoneNumber;
    if (isValidPhoneNumber(number)) {
      phoneNumber = parsePhoneNumber(number);
    }

    const patchPayload: Partial<organizationData> = {};

    if (dirtyFields.organizationId) patchPayload.givenOrgId= values.organizationId;
    if (dirtyFields.organizationName) patchPayload.name = values.organizationName;
    if (dirtyFields.email)
      patchPayload.email = values.email;
    if (
      dirtyFields.contactPhoneNumber?.countryCode ||
      dirtyFields.contactPhoneNumber?.number) {
      patchPayload.contactPhoneNumber = {
        countryCode: phoneNumber ? phoneNumber.country : "",
        number: phoneNumber ? phoneNumber.nationalNumber : "",
      };
    }
    if(dirtyFields.address) patchPayload.address = values.address;
    if(dirtyFields.pincode) patchPayload.pincode = values.pincode;
    if(dirtyFields.state) patchPayload.state = values.state;
    if(dirtyFields.githubCreated) patchPayload.isActive = values.githubCreated;


    if (Object.keys(patchPayload).length > 0 ) {
      mutation.mutate(patchPayload);
    }
  }

  useEffect(() => {
    if (organizationDetails) {
      const rawNumber = String(organizationDetails.contactPhoneNumber?.number || "");
      const countryCode = organizationDetails.contactPhoneNumber?.countryCode || "";
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
        organizationId: organizationDetails.givenOrgId,
        organizationName: organizationDetails.name,
        email: organizationDetails.email,
        contactPhoneNumber: {
          countryCode:
            organizationDetails.contactPhoneNumber?.countryCode || countryCode,
          number: formattedNumber,
        },
        state: organizationDetails.state,
        address: organizationDetails.address,
        pincode: organizationDetails.pincode,
        githubCreated: organizationDetails.isActive 
      });
    }
  }, [organizationDetails, methods]);

  
  return (
    <>
      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-lg">
        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
            <div className="tw-flex tw-gap-6">
              {/* Left Column */}
              <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
                <FormField
                  control={methods.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="organizationName">
                        Organization Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="organizationName"
                          placeholder="Organization Name"
                          {...field}
                          disabled={!canEditOrganization}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.organizationName?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="email">
                        Organization Email ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="email"
                          placeholder="Organization Email ID"
                          {...field}
                          disabled={!canEditOrganization}
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
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="state">State</FormLabel>
                      <FormControl>
                        <Input id="state" placeholder="State" {...field} disabled={!canEditOrganization} />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.state?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="pincode">Pincode</FormLabel>
                      <FormControl>
                        <Input id="pincode" placeholder="Pincode" {...field} disabled={!canEditOrganization} />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.pincode?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column */}
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
                         disabled={!canEditOrganization}
                       />
                     </FormControl>
                     <FormMessage>{methods.formState.errors.contactPhoneNumber?.number?.message}</FormMessage>
                   </FormItem>
                 )}
               />
                <FormField
                  control={methods.control}
                  name="organizationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="organizationId">
                        Organization ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          id="organizationId"
                          placeholder="Organization ID"
                          {...field}
                          disabled={!canEditOrganization}
                        />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.organizationId?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={methods.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="address">Address</FormLabel>
                      <FormControl>
                        <Input id="address" placeholder="Address" {...field} disabled={!canEditOrganization} />
                      </FormControl>
                      <FormMessage>
                        {methods.formState.errors.address?.message}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={methods.control}
              name="githubCreated"
              render={({ field }) => (
                <FormItem className="tw-flex tw-items-center tw-gap-2">
                  <div className="tw-flex tw-items-center tw-mt-4 tw-gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked || false)
                      }
                      disabled={!canEditOrganization}
                    />
                  </FormControl>
                  <p>Organization created in GitHub</p>
                  </div>
                </FormItem>
              )}
            />

            <div className="tw-text-primary tw-mt-[20px]">
              <h5 className="tw-italic">All fields are mandatory*</h5>
            </div>
            <hr className="tw-border-t tw-border-gray-300 tw-mt-2 tw-mb-3" />
            {canEditOrganization && 
            <Button
              type="submit"
              disabled={mutation.isPending || !methods.formState.isDirty}
              >
              {mutation.isPending ? "Submitting..." : "Submit"}
            </Button>
            }
          </form>
        </FormProvider>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
            <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
              {dialogContent.title === "Organization Updated Successfully" ? (
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

export default OrganizationDetailPage;
