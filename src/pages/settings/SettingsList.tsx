import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  RectangleEllipsis,
  UserMinus,
  UserRound,
  SquareArrowOutUpRight,
  X,
  User,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// Deactivate Account AlertDialog
const DeactivateAccountDialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  const closeDialog = () => setIsOpen(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <div className="tw-flex tw-items-center !tw-w-full tw-h-6 tw-gap-1 tw-py-2 tw-cursor-pointer">
          <UserMinus className="tw-w-4 tw-h-4 -tw-mt-1" />
          <p className="tw-text-xs tw-font-medium tw-leading-4 tw-text-left">
            Deactivate Account
          </p>
        </div>
      </AlertDialogTrigger>
      <AlertDialogContent className="!tw-w-96 sm:tw-w-auto tw-h-56 tw-px-4 tw-pt-4 tw-gap-5 tw-rounded-sm tw-bg-white">
        <div className="tw-w-81 tw-h-36 tw-flex tw-flex-col tw-items-center">
          <div className="tw-flex tw-justify-end tw-w-full">
            <X
              className="tw-w-4 tw-h-4 tw-text-slate-500"
              onClick={closeDialog}
            />
          </div>
          <div className="tw-mt-4 tw-w-14 tw-h-14 tw-mx-auto">
            <User className="tw-w-full tw-h-full tw-text-[#83C62F]" />
          </div>

          <p className=" tw-text-4 tw-font-semibold tw-leading-5 tw-text-center tw-py-1">
            Reminder
          </p>
          <p className="tw-w-80 tw-h-2 tw-text-sm tw-font-normal tw-leading-4 tw-text-center">
            Are you sure you want to deactivate your account?
          </p>
        </div>
        <div className="tw-h-9 tw-gap-2 tw-w-full tw-flex tw-justify-center tw--translate-y-2">
          <Button className="tw-w-36 tw-h-9 tw-border-2 tw-border-blue-950 !tw-bg-white tw-rounded-sm tw-gap-2">
            <span className="tw-text-blue-950">Yes</span>
          </Button>
          <Button className="tw-w-36 tw-h-9 !tw-bg-blue-950 tw-rounded-sm tw-gap-2">
            <span>No</span>
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const SettingsList = () => {
  return (
    <div>
      <Card className="tw-w-auto  sm:tw-w-[500px] tw-h-[151px] sm:tw-h-[110px] tw-p-[20px_16px_20px_16px] tw-gap-4 tw-rounded-1 tw-bg-white tw-shadow-[0px_0px_6px_0px_rgba(0,0,0,0.15)]">
        <CardContent className=" tw--translate-y-4 tw--translate-x-2 ">
          <p className="tw-w-full sm:tw-w-24 tw-h-4 tw-font-bold tw-text-xs tw-py-4 tw--translate-x-4">
            Quick Actions
          </p>
          <div className="tw-w-full sm:tw-w-full tw-mt-2  tw-flex tw-flex-col sm:tw-flex-row tw--translate-x-4 tw-py-2 tw-gap-2">
            <div className="tw-flex tw-items-center tw-w-full sm:tw-w-full tw-h-6 tw-gap-2 tw-py-2">
              <RectangleEllipsis className="tw-w-5 tw-h-6" />
              <Link to={`/settings/changePassword`}>
                <p className="tw-text-xs tw-font-medium tw-leading-4 tw-text-left">
                  Change Password
                </p>
              </Link>
            </div>
            <DeactivateAccountDialog />
            <div className="tw-flex tw-items-center tw-w-full sm:tw-w-80 tw-h-6 tw-gap-2 tw-py-2">
              <UserRound className="tw-w-4 tw-h-4 -tw-mt-1" />
              <Link to={`/settings/adminProfile`}>
                <p className="tw-text-xs tw-font-medium tw-leading-4 tw-text-left">
                  Admin Profile
                </p>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="tw-mt-3 tw-w-full sm:tw-w-[430px] tw-h-32 tw-rounded-sm tw-bg-white tw-shadow-[0px_0px_6px_0px_rgba(0,0,0,0.15)]">
        <CardContent>
          <div className="tw-flex tw-flex-col tw--translate-x-2 tw-py-3">
            <div className="tw-flex tw-justify-between tw-items-center tw-mt-3">
              <Link
                to={`/settings/privacyPolicy`}
                className="tw-flex tw-justify-between tw-items-center tw-w-full"
              >
                <p className="tw-text-left tw-text-xs tw-font-600 tw-leading-4">
                  Privacy Policy
                </p>
                <SquareArrowOutUpRight className="tw-w-4 tw-h-4 tw-text-[#4E4E4E]" />
              </Link>
            </div>
            <div className="tw-flex tw-justify-between tw-items-center tw-mt-4">
              <Link
                to={`/settings/faq`}
                className="tw-flex tw-justify-between tw-items-center tw-w-full"
              >
                <p className="tw-text-left tw-text-xs tw-font-600 tw-leading-4">
                  FAQ
                </p>
                <SquareArrowOutUpRight className="tw-w-4 tw-h-4 tw-text-[#4E4E4E]" />
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsList;
