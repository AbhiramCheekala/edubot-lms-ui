import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import axios from "axios";
import { CircleX, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { CardDescription, CardTitle } from "../../components/ui/card";
import config from "../../lib/config";

interface ResetPasswordRequest {
  body: {
    password: string;
  };
  query: {
    token: string;
  };
}

// Define the password schema
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Define the form schema
const formSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export function ResetPassword() {
  const navigate = useNavigate();
  // disable typescript for this line
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const search = useSearch({from: '/reset-password'});
  const token = (search as { token: string}).token;
  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const password = useRef({});
  password.current = watch("password", "");

  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordRequest) => axios.post(`${config.API_BASE_URL}/auth/reset-password?token=${data.query.token}`, data.body),
    onSuccess: (response) => {
      console.log("Password reset successful", response.data);
      navigate({ to: '/login' });
    },
    onError: (error: { response: { status: number }}) => {
      console.error("Password reset failed", error);
      setErrorMessage("The password reset link is invalid or has expired. Please request a new link.");
      setShowErrorDialog(true);
    },
  });

  const onSubmit = (data: FormData) => {
    resetPasswordMutation.mutate({ body: {password: data.password }, query:{ token } });
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
      <div className="tw-flex tw-items-center tw-justify-center tw-py-12 tw-px-4 tw-h-full">
        <div className="tw-mx-auto tw-grid tw-w-[350px] tw-gap-6">
          <div className="tw-grid tw-gap-2 tw-text-center">
            <img
              src="/edubot_logo.svg"
              alt="logo"
              className="tw-block tw-mx-auto tw-w-1/2"
            />
          </div>
          <div>
            <CardTitle className="tw-text-md tw-font-semibold tw-text-left tw-pb-2">
              Reset Password
            </CardTitle>
            <CardDescription className="tw-text-[#454545] tw-text-sm tw-text-left tw-w-full">
              Please enter the new password for your account
            </CardDescription>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="tw-grid tw-gap-4">
            <div className="tw-grid tw-gap-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="New password"
                className="tw-text-primary tw-font-bold"
                {...register("password")}
              />
              {errors.password && <p className="tw-text-red-500 tw-text-sm">{errors.password.message}</p>}
            </div>
            <div className="tw-grid tw-gap-2">
              <Label htmlFor="confirmPassword">Re-enter new Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="tw-text-primary tw-font-bold"
                placeholder="Confirm new password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && <p className="tw-text-red-500 tw-text-sm">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="tw-w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </div>
      </div>
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