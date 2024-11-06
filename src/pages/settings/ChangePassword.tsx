import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

const ChangePassword = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] =
    useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const toggleVisibility = (setter) => {
    setter((prev) => !prev);
  };

  return (
    <Card className="tw-w-auto md:tw-w-[608px] tw-h-[431px] md:tw-h-[400px] tw-rounded-[4px] tw-mx-auto -tw-ml-2 tw-gap-0">
      <CardContent className="tw-px-6 md:tw-px-6">
        <p className="tw-text-left tw-text-xs tw-font-bold tw-leading-[14.63px] md:tw-mb-4 tw-mt-5 md:tw-mt-6">
          Change Password
        </p>
        <div className="tw-w-full tw-mb-4 tw-mt-2 md:-tw-mt-1">
          <p className="tw-text-left tw-text-xs tw-font-normal tw-leading-[14.63px]">
            To change your password, please fill in the fields below.
          </p>
          <p className="tw-text-left tw-text-xs tw-font-normal tw-leading-[14.63px]">
            Your password must contain at least 8 characters, including one
            uppercase letter, one lowercase letter, one number, and one special
            character.
          </p>
        </div>

        {/* Current Password */}
        <div className="tw-w-full tw-mt-3 tw-mb-5">
          <Label
            className="tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left"
            htmlFor="currentPassword"
          >
            Current Password
          </Label>
          <div className="tw-relative tw-flex tw-items-center">
            <Input
              className="tw-w-full tw-h-[31px] tw-py-[9px] tw-pl-[13px] tw-pr-[40px] tw-rounded-[4px] tw-border tw-border-[#BDBDBD] tw-bg-white"
              type={isCurrentPasswordVisible ? "text" : "password"}
              id="currentPassword"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            {isCurrentPasswordVisible ? (
              <Eye
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsCurrentPasswordVisible)}
              />
            ) : (
              <EyeOff
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsCurrentPasswordVisible)}
              />
            )}
          </div>
        </div>

        {/* New Password */}
        <div className="tw-w-full tw-mt-5 tw-mb-5">
          <Label
            className="tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left"
            htmlFor="newPassword"
          >
            New Password
          </Label>
          <div className="tw-relative tw-flex tw-items-center">
            <Input
              className="tw-w-full tw-h-[31px] tw-py-[9px] tw-pl-[13px] tw-pr-[40px] tw-rounded-[4px] tw-border tw-border-[#BDBDBD] tw-bg-white"
              type={isNewPasswordVisible ? "text" : "password"}
              id="newPassword"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {isNewPasswordVisible ? (
              <Eye
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsNewPasswordVisible)}
              />
            ) : (
              <EyeOff
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsNewPasswordVisible)}
              />
            )}
          </div>
        </div>

        {/* Confirm Password */}
        <div className="tw-w-full tw-mt-5 sm:tw-mb-6 tw-mb-4">
          <Label
            className="tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </Label>
          <div className="tw-relative tw-flex tw-items-center">
            <Input
              className="tw-w-full tw-h-[31px] tw-py-[9px] tw-pl-[13px] tw-pr-[40px] tw-rounded-[4px] tw-border tw-border-[#BDBDBD] tw-bg-white"
              type={isConfirmPasswordVisible ? "text" : "password"}
              id="confirmPassword"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {isConfirmPasswordVisible ? (
              <Eye
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsConfirmPasswordVisible)}
              />
            ) : (
              <EyeOff
                className="tw-absolute tw-right-[13px] tw-cursor-pointer tw-w-[15px] tw-h-[13px] tw-text-[#727070]"
                onClick={() => toggleVisibility(setIsConfirmPasswordVisible)}
              />
            )}
          </div>
        </div>

        <Button className="tw-mt-3 tw-w-[94px] tw-h-[38px] tw-p-[10px_20px_10px_20px] tw-rounded-[4px] md:-tw-mt-2">
          Update
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChangePassword;
