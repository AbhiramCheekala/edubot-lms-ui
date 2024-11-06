import React, { useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { Textarea } from "@/components/ui/textarea";
import PhoneInput from "@/components/ui/phone-input";

import { Button } from "@/components/ui/button";

const AdminPage = () => {
  const navigate = useNavigate();
  // Create a reference for the file input
  const fileInputRef = useRef(null);

  // Function to handle Pencil icon click
  const handlePencilClick = () => {
    fileInputRef.current.click();
  };

  const handleClick = () => {
    navigate({ to: "/settings/changePassword" });
  };

  return (
    <div className="tw--translate-x-3">
      <Card className=" tw-w-[727px] tw-h-[515px] tw-rounded-[4px] tw-bg-white tw-shadow-[0px_0px_8px_0px_rgba(0,0,0,0.15)] ">
        <CardContent>
          <div className="tw-flex tw-flex-row tw-py-7">
            <div className="tw-flex tw-flex-col">
              <p className="  tw-text-[12px] tw-font-semibold tw-leading-[14.63px] tw-text-left tw-text-black">
                My Profile
              </p>
              <div className="tw-flex tw-items-center tw-gap-2 tw--translate-y-1 ">
                <img
                  src="/images/profile.png"
                  alt="Profile"
                  className="tw-w-[91.06px] tw-h-[88.92px] tw-mt-5 tw-rounded-full tw-object-cover"
                />
                <div
                  className="tw-flex tw-items-center tw-justify-center tw-w-[19px] tw-h-[19px] tw-bg-[#1D1F71]  tw-rounded-full tw--translate-x-7 tw--translate-y-4 tw-cursor-pointer"
                  onClick={handlePencilClick}
                >
                  <Pencil className="tw-text-white tw-w-[9.5px] tw-h-[9.5px]" />
                </div>
                <div className=" tw-w-[150px] tw-h-[37px] tw-py-6 tw--translate-x-3 ">
                  <p className="  tw-text-[14px] tw-font-semibold tw-leading-[17.07px] tw-text-left">
                    Vemesh Bypureddi
                  </p>
                  <p className="  tw-text-[12px] tw-font-500 tw-leading-[14.63px] tw-text-left tw-py-1">
                    Admin
                  </p>
                </div>
              </div>
              <p className="  tw-text-[12px] tw-font-500 tw-leading-[14.63px] tw-text-left tw-py-4 tw-text-[#4B4B4B]">
                User ID : user1@123456
              </p>
              <p
                onClick={handleClick}
                className="  tw-text-[10px] tw-font-bold tw-leading-[12.19px] tw-text-[#1D1F71] tw--translate-y-2 tw-cursor-pointer"
              >
                Change Password
              </p>
            </div>

            <div className="tw-w-[400px] tw-h-[410px] tw-top-[141px] tw-rounded-[4px]   tw-border tw-border-[#BDBDBD] tw-flex tw-flex-col tw-items-center tw-justify-start tw-py-4">
              <div className="tw-flex tw-flex-row tw-gap-[8px]">
                <div className="tw-w-[160px] tw-h-[49px] tw-flex tw-flex-col">
                  <Label
                    className="  tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828]"
                    htmlFor="first-name"
                  >
                    First Name
                  </Label>
                  <Input
                    className="tw-w-[160px] tw-h-[31px] tw-px-[13px] tw-py-[9px] tw-gap-[10px] tw-rounded-[4px] tw-border   tw-border-[#BDBDBD] tw-bg-white !tw-ring-[-2]"
                    type="text"
                    id="first-name"
                    placeholder="Vemesh"
                  />
                </div>
                <div className="tw-w-[172px] tw-h-[49px] tw-flex tw-flex-col tw-ml-5">
                  <Label
                    className="   tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828]"
                    htmlFor="last-name"
                  >
                    Last Name
                  </Label>
                  <Input
                    className="tw-w-[172px] !tw-ring-[-2] tw-h-[31px] tw-px-[13px] tw-py-[9px] tw-gap-[10px] tw-rounded-[4px] tw-border   tw-border-[#BDBDBD] tw-bg-white"
                    type="text"
                    id="last-name"
                    placeholder="Bypureddi"
                  />
                </div>
              </div>
              <div className="tw-w-full tw-flex tw-flex-col tw-items-center tw-mt-4">
                <Label
                  className="   tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828] tw-w-[360px]"
                  htmlFor="email"
                >
                  Email Address
                </Label>
                <Input
                  className="!tw-w-[357px] !tw-ring-[-2] tw-h-[31px] tw-px-[13px] tw-py-[9px] tw-gap-[10px] tw-rounded-[4px] tw-border   tw-border-[#BDBDBD] tw-bg-white"
                  type="email"
                  id="email"
                  placeholder="vemeshbypureddi1204@gmail.com"
                />
              </div>
              <div className="tw-w-full tw-flex tw-flex-col tw-items-center tw-mt-3">
                <Label
                  className="  tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828] tw-w-[360px]"
                  htmlFor="number"
                >
                  Phone No.
                </Label>
                <PhoneInput
                  international
                  id="number"
                  placeholder="Enter a number"
                  className="!tw-w-[357px]  !tw-h-[30px] tw-text-black "
                  inputClass="!tw-bg-white !tw-text-black"
                />
              </div>

              <div className="tw-w-full tw-flex tw-flex-col tw-items-center tw-mt-5">
                <Label
                  className="  tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828] tw-w-[360px]"
                  htmlFor="languages"
                >
                  Languages Known
                </Label>
                <Input
                  className="!tw-w-[357px] !tw-ring-[-2] tw-h-[31px] tw-px-[13px] tw-py-[9px] tw-gap-[10px] tw-rounded-[4px] tw-border   tw-border-[#BDBDBD] tw-bg-white"
                  type="text"
                  id="languages"
                  placeholder="English, Hindi"
                />
              </div>
              <div className="tw-w-full tw-flex tw-flex-col tw-items-center tw-mt-3">
                <Label
                  className="  tw-text-[14px] tw-font-medium tw-leading-[24px] tw-tracking-[-0.025em] tw-text-left tw-text-[#282828] tw-w-[360px]"
                  htmlFor="address"
                >
                  Full Address
                </Label>
                <Textarea
                  className="!tw-w-[357px] !tw-ring-[-2] tw-h-[69px] tw-border   tw-border-[#BDBDBD] tw-bg-white   tw-text-[10px] tw-font-medium tw-leading-[14.63px] tw-tracking-[-0.025em] tw-text-left tw-text-[#4B4B4B] tw-p-2"
                  placeholder="Sirian Overseas Educare Pvt Ltd, 54-13/5-6, 3rd Floor, MK Aura, Road No. 2, Mahanadu Rd, Srinivasa Nagar Bank Colony, Vijayawada, Andhra Pradesh 520008"
                />
              </div>
            </div>
          </div>
          <div className="tw-flex tw-justify-end tw--translate-y-1">
            <Button className="tw-w-[94px] tw-h-[38px] tw-rounded-[4px] tw-gap-[8px] !tw-bg-[#1D1F71]">
              Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={(e) => console.log(e.target.files[0])} // Add your own logic here
      />
    </div>
  );
};

export default AdminPage;
