import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { z } from "zod";
import PhoneInput from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CircleCheck, CircleX, X } from 'lucide-react';
import {
  AlertDialog, 
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { usePolicies } from "../../hooks/usePolicies";
import { checkActionScopes } from "../../lib/permissionUtils";


const formSchema = z.object({
  name: z.string()
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
    countryCode: z.string(),
    number: z
      .string()
      .min(10, { message: "Contact number must be at least 10 digits." })
  }),
  organizationId: z
    .string()
    .min(3, { message: "Organization ID must be at least 3 characters." })
    .regex(/^[A-Za-z0-9]+$/, { message: "Organization ID can only contain letters and numbers." }),
  address: z.string().optional(),
  createdInGitHub: z.boolean(),
});


//base page to display
export default function OrganizationAddPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({
    title: "",
    description: "",
  });
  const { permissionSet } = usePolicies();
  const canEditOrganization = checkActionScopes(
    permissionSet, "organization:write", ["admin","organization","supervisor","program"]
  );

  // Initialize the form methods using react-hook-form and Zod resolver
  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      state: "",
      pincode: "",
      contactPhoneNumber: {
        countryCode:"+91",
        number: "",
      },
      organizationId: "",
      address: "",
      createdInGitHub: false,
    },
    mode: "all", // Validate on all events

  });

  // Function to handle form submission
  const mutation = useMutation({
    mutationFn: async (dataObject: any) => {
      const response = await api.post('/organizations', dataObject, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // if (response.status !== 200) {
      //   throw new Error('Failed to create organization');
      // }
      
      return response.data;
    },
    onSuccess: () => {
      setDialogContent({
        title: "Organization Added Successfully",
        description: "The organization has been Added successfully.",
      });
      setShowDialog(true);
      methods.reset();
    },
    onError: () => {
      setDialogContent({
        title: "Error While Adding Organization",
        description:
          "There was an issue while Adding the Organization. Please try again.",
      });
      setShowDialog(true);
    
      
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const number = values.contactPhoneNumber.number;
      let phoneNumber;
      if (isValidPhoneNumber(number)) {
        phoneNumber =parsePhoneNumber (number);
      }

    // Create the data object to be sent in the POST request it;s like Payload Method
    const dataObject = {
      name: values.name,
      email: values.email,
      state: values.state,
      pincode: values.pincode,
      contactPhoneNumber: {
        countryCode: phoneNumber ? phoneNumber.country : '',
        number: phoneNumber ? phoneNumber.nationalNumber : '',
      },
      givenOrgId: values.organizationId,
      address: values.address,
      isActive: values.createdInGitHub,
    };

    // Trigger the mutation to send a POST Request
    mutation.mutate(dataObject);
  };

  // Function to handle form validation errors
  const onError = () => {
  };

  return (
    <>
      <p className="tw-text-xs tw-space-y-0 tw-pb-4">
        Organization detail store information about Organization. You can update organization detail later by clicking on the Name of organization.
      </p>
      {canEditOrganization && 
        <Link
          to=""
          className="tw-text-primary tw-underline  hover:tw-underline "
          >
          Data Import/Export
        </Link>
      }

      <div className="tw-bg-white tw-w-3/4 tw-shadow-lg tw-p-6 tw-rounded-lg tw-mt-4">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit, onError)} className="space-y-8">
          <div className="tw-flex tw-gap-6">
            {/* Left Column */}
            <div className="tw-flex tw-flex-col tw-gap-4 tw-w-1/2">
              <FormField
                control={methods.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="organizationName">Organization Name</FormLabel>
                    <FormControl>
                      <Input id="organizationName" placeholder="Organization Name" {...field} disabled={!canEditOrganization}/>
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
                    <FormLabel htmlFor="email">Organization Email ID</FormLabel>
                    <FormControl>
                      <Input id="email" placeholder="Organization Email ID" {...field} disabled={!canEditOrganization}/>
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
                      <Input id="pincode" placeholder="Pincode" {...field} disabled={!canEditOrganization}/>
                    </FormControl>
                    <FormMessage>
                      {methods.formState.errors.pincode?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={methods.control}
                name="createdInGitHub"
                render={({ field }) => (
                  <FormItem className="tw-flex tw-items-center tw-gap-2">
                    <div className="tw-flex tw-items-center tw-gap-2 tw-mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked || false)}
                        disabled={!canEditOrganization}
                      />
                    </FormControl>
                    <p className="tw-text-sm">Organization created in GitHub</p>
                    </div>
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
                  <FormItem className="tw-w-full">
                    <FormLabel htmlFor="contact">Contact</FormLabel>
                    <FormControl className="tw-w-full">
                    <PhoneInput
                      international
                        id="contactPhoneNumber"
                        placeholder="Enter a phone number"
                        className="tw-w-full"
                        value={field.value}
                        onChange={(value) => field.onChange(value)}
                        disabled={!canEditOrganization}
                      />
                    </FormControl>
                    <FormMessage>
                      {methods.formState.errors.contactPhoneNumber?.message}
                    </FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={methods.control}
                name="organizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="organizationId">Organization ID</FormLabel>
                    <FormControl>
                      <Input id="organizationId" placeholder="Organization ID" {...field} disabled={!canEditOrganization}/>
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
                      <Input id="address" placeholder="Location of the Organization" {...field} disabled={!canEditOrganization} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="tw-text-primary tw-mt-5">
            <h5 className="tw-italic">All fields are mandatory*</h5>
          </div>
          <Separator className="tw-border-t tw-border-gray-300 tw-mt-2 tw-mb-3" />
          {/* Submit Button with Custom Layout */}
          {canEditOrganization && 
            <Button 
              type="submit"
              className="tw-w-36 tw-h-10 tw-gap-2"
              >
              Submit
            </Button>
          }
        </form>
      </FormProvider>
      </div>

     
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="relative tw-min-w-[300px] tw-max-w-md tw-mx-auto tw-my-auto">
            <AlertDialogHeader className="tw-flex tw-flex-col tw-items-center tw-justify-center tw-text-center">
              {dialogContent.title === "Organization Added Successfully" ? (
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
    </>
  );
}
