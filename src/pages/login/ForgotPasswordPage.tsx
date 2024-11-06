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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CircleX, X } from "lucide-react";
import React, { useState } from "react";
import { CardDescription, CardTitle } from "../../components/ui/card";
import config from "../../lib/config";

export function ForgotPasswordPage() {
  const [showSuccess, setShowSuccess] = useState(false);
  // const [showDialog, setShowDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  // const [dialogMessage, setDialogMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await axios.post(`${config.API_BASE_URL}/auth/forgot-password`, { email });
      return response.data;
    },
    onSuccess: () => {
      // setDialogMessage("We have sent you an email. Please check your inbox and click on the link to create a new password.");
      // setShowDialog(true);
      setShowSuccess(true);
    },
    onError: (error: { response: {status: number }  }) => {
      if (error.response) {
        switch (error.response.status) {
          case 429:
            setErrorMessage("Too many reset requests have been made. Please contact the administrator.");
            break;
          case 425:
            setErrorMessage("An account verification request is active. Please check your registered email and use the link there to reset your password.");
            break;
          default:
            setErrorMessage("An error occurred. Please try again later.");
        }
      } else {
        setErrorMessage("An error occurred. Please try again later.");
      }
      setShowErrorDialog(true);
    },
  });

  const handlePasswordReset = (email: string) => {
    mutation.mutate(email);
  };

  return (
    <div className="tw-w-full md:tw-grid md:tw-grid-cols-2 tw-h-full">
      <div className="tw-hidden tw-bg-muted md:tw-flex tw-flex-col tw-justify-end tw-items-center">
        <CardTitle className="tw-font-semibold tw-text-center tw-h-[40px]">
          Welcome to Edubot
        </CardTitle>
        <CardDescription className="tw-text-[#666666] tw-text-center tw-h-[1px] tw-w-3/4">
          Revolutionary learning empowers minds through innovative, personalized
          education.
        </CardDescription>
        <img
          src="/loginisslustraion.svg"
          alt="logo"
          className="tw-justify-center tw-h-[500px]"
        />
      </div>
      {
        showSuccess ?
        <EmailSentSuccess /> :
        <PasswordAssistanceForm handlePasswordReset={handlePasswordReset} isLoading={mutation.isPending} />
      }
      {/* <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
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
              <span>Success</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="tw-mt-4 tw-text-center">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="tw-flex !tw-justify-center">
            <AlertDialogAction onClick={() => setShowDialog(false)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
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
            <AlertDialogAction onClick={() => setShowErrorDialog(false)}>Try Again</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PasswordAssistanceForm({ handlePasswordReset, isLoading }: { handlePasswordReset: (email: string) => void, isLoading: boolean }) {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handlePasswordReset(email);
  }

  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-py-12 tw-px-4 tw-h-full">
      <div className="tw-mx-auto tw-grid tw-w-[350px] tw-gap-6">
        <div className="tw-grid tw-gap-2 tw-text-center">
          <img
            src="/edubot_logo.svg"
            alt="logo"
            className="tw-block tw-mx-auto tw-w-1/2"
          />
        </div>
        <form onSubmit={handleSubmit} className="tw-flex tw-flex-col tw-gap-4 tw-pt-4">
          <div>
            <CardTitle className="tw-text-md tw-font-semibold tw-text-left tw-pb-2">
              Password Assistance
            </CardTitle>
            <CardDescription className="tw-text-[#454545] tw-text-sm tw-text-left tw-w-full">
              Enter the email or phone number associated with your Edubot
              account.
            </CardDescription>
          </div>
          <div className="tw-py-4 tw-grid tw-gap-12">
            <div className="tw-grid tw-gap-2">
              <Label htmlFor="email" className="tw-font-medium">
                Registered Email ID
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                className="tw-text-primary tw-font-bold"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button type="submit" className="tw-w-3/4 tw-text-center tw-m-auto" disabled={isLoading}>
              {isLoading ? "Sending..." : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmailSentSuccess() {
  return (
    <div className="tw-flex tw-items-center tw-justify-center tw-py-12 tw-px-4 tw-h-full">
      <div className="tw-mx-auto tw-grid tw-w-[350px] tw-gap-6">
        <div className="tw-grid tw-gap-2 tw-text-center">
          <img
            src="/edubot_logo.svg"
            alt="logo"
            className="tw-block tw-mx-auto tw-w-1/2"
          />
        </div>
        <div className="tw-flex tw-flex-col tw-justify-end tw-items-center tw-pt-8">
          <img src='/loginThumbsUp.svg' alt='logo' className='tw-justify-center tw-h-16 tw-w-32' />
          <CardTitle className='tw-font-semibold tw-text-center tw-text-md tw-pt-8 tw-pb-2'>Thank you!</CardTitle>
          <CardDescription className='tw-text-[#454545] tw-text-center tw-w-full tw-text-sm'>We have sent you an email, please check your inbox and click on the link to re create new password.</CardDescription>
        </div>
      </div>
    </div>
  )
}