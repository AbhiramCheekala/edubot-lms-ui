import React, { useRef, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pen, X, FileText, CircleCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PhoneInput from "@/components/ui/phone-input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import parsePhoneNumberFromString from "libphonenumber-js";

const schema = z.object({
  name: z
    .string()
    .min(1, "Full Name is required")
    .refine(
      (value) => value.trim() === value,
      "Full Name must not have leading or trailing spaces"
    ),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .refine(
      (value) => value === value.toLowerCase(),
      "Email must not contain uppercase letters"
    ),
  phone: z.object({
    countryCode: z.string().default("IN"),
    number: z.string().min(1, "Phone number is required"),
  }),
  languages: z.string().min(1, "Languages Known is required"),
  address: z.string().min(1, "Full Address is required"),
  linkedin: z.string().url("Invalid LinkedIn URL").optional(),
  github: z.string().url("Invalid GitHub URL").optional(),
  hscCollege: z.string().min(1, "HSC College is required"),
  hscSubject: z.string().min(1, "HSC Subject is required"),
  hscYear: z
    .string()
    .regex(/^\d{4}$/, "HSC Year must be a year")
    .refine(
      (value) =>
        Number(value) > 1900 && Number(value) < new Date().getFullYear() + 1,
      "HSC Year must be a valid year"
    ),
  uniCollege: z.string().min(1, "University College is required"),
  uniSubject: z.string().min(1, "University Subject is required"),
  uniYear: z
    .string()
    .regex(/^\d{4}$/, "University Year must be a year")
    .refine(
      (value) =>
        Number(value) > 1900 && Number(value) < new Date().getFullYear() + 1,
      "University Year must be a valid year"
    ),
});

const fetchStudentDetails = async (studentId) => {
  const { data } = await api.get(
    `/students/${studentId}?includeRole=true&includeOrg=true&includeBatch=true`
  );
  return data;
};

const updateStudentProfile = async (studentId, payload) => {
  const { data } = await api.patch(`/students/${studentId}/profile`, payload);
  return data;
};

const MyProfile = () => {
  const { account } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [profileImage, setProfileImage] = useState("/images/image 90.png");
  const [tempImage, setTempImage] = useState(null);
  const fileInputRef = useRef(null);

  let studentId;
  if (account && account.student) {
    studentId = account.student.id;
  } else {
    console.error(
      "Student details not available in account, unable to fetch student data."
    );
    return <div>Error: Student details are missing!</div>;
  }

  const { data: studentDetails, isLoading } = useQuery({
    queryKey: ["studentDetails", studentId],
    queryFn: () => fetchStudentDetails(studentId),
    enabled: !!studentId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (studentDetails) {
      const rawNumber = String(studentDetails.contactPhoneNumber?.number || "");
      const countryCode = studentDetails.contactPhoneNumber?.countryCode || "";
      let formattedNumber = rawNumber;

      try {
        const phoneNumber = parsePhoneNumberFromString(rawNumber, countryCode);
        if (phoneNumber) {
          formattedNumber = phoneNumber.format("E.164");
        }
      } catch (error) {
        console.error("Error formatting phone number:", error);
      }

      reset({
        name: studentDetails.name,
        email: studentDetails.personalEmail || studentDetails.email,
        phone: {
          countryCode: studentDetails.contactPhoneNumber?.countryCode || "IN",
          number: formattedNumber,
        },
        languages: studentDetails.languagesKnown
          ? studentDetails.languagesKnown.join(", ")
          : "",
        address: studentDetails.fullAddress,
        linkedin: studentDetails.linkedinUrl,
        github: studentDetails.githubUrl,
        hscCollege: studentDetails.educationHSCName,
        hscSubject: studentDetails.educationHSCSubjectSpecialization,
        hscYear: studentDetails.educationHSCMentionYear,
        uniCollege: studentDetails.educationUniversityOrCollege,
        uniSubject:
          studentDetails.educationUniversityOrCollegeSubjectSpecialization,
        uniYear: studentDetails.educationUniversityOrCollegeSubject,
      });
    }
  }, [studentDetails, reset]);

  const mutation = useMutation({
    mutationFn: (data) => updateStudentProfile(studentId, data),
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({
        queryKey: ["studentDetails", studentId],
      });
    },
  });

  const onSubmit = (data) => {
    const phoneNumber = parsePhoneNumber(data.phone.number);
    const payload = {
      name: data.name,
      personalEmail: data.email,
      contactPhoneNumber: {
        countryCode: phoneNumber ? phoneNumber.country : data.phone.countryCode,
        number: phoneNumber
          ? phoneNumber.nationalNumber
          : data.phone.number.replace(/\D/g, ""),
      },
      languagesKnown: data.languages.split(",").map((lang) => lang.trim()),
      fullAddress: data.address,
      linkedinUrl: data.linkedin,
      githubUrl: data.github,
      educationHSCName: data.hscCollege,
      educationHSCSubjectSpecialization: data.hscSubject,
      educationHSCMentionYear: data.hscYear,
      educationUniversityOrCollege: data.uniCollege,
      educationUniversityOrCollegeSubjectSpecialization: data.uniSubject,
      educationUniversityOrCollegeSubject: data.uniYear,
    };
    mutation.mutate(payload as any);
  };

  const handlePencilClick = () => setOpen(true);

  const handleCloseDialog = () => {
    setSelectedFile(null);
    setTempImage(null);
    setOpen(false);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === "image/jpeg") {
      const imageUrl = URL.createObjectURL(file);
      setSelectedFile(file);
      setTempImage(imageUrl);
    } else {
      alert("Only JPG files are allowed!");
    }
  };

  const handleFileSubmit = () => {
    if (!selectedFile) return;
    console.log("File submitted:", selectedFile);
    setProfileImage(tempImage);
    handleCloseDialog();
  };

  const getFieldError = (error) => {
    if (error) {
      if (typeof error === "string") {
        return error;
      }
      if (error.message) {
        return error.message;
      }
    }
    return null;
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div>
      <Card className="xl:tw-w-11/12 tw-w-full">
        <CardContent>
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="xl:tw-flex tw-mt-6">
              <div>
                <div className="tw-text-black tw-font-semibold">
                  <p>My Profile</p>
                </div>
                <div className="xl:tw-flex-col tw-flex tw-pb-6">
                  <div className="tw-relative tw-inline-block tw-pt-4">
                    <Avatar className="xl:tw-w-24 xl:tw-h-24 tw-w-24 tw-h-24 md:tw-w-24 md:tw-h-24">
                      <AvatarImage src={profileImage} alt="Profile Image" />
                      <AvatarFallback>
                        {getInitials(studentDetails?.name || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="tw-cursor-pointer xl:-tw-translate-x-10 tw-translate-x-8 tw-absolute tw-ml-8 tw-top-7 tw-right-7 xl:tw-top-7 xl:tw-right-2 tw-p-1 tw-bg-primary tw-text-white tw-rounded-full tw-text-sm"
                      onClick={handlePencilClick}
                    >
                      <Pen className="tw-w-4 tw-h-4" />
                    </div>
                  </div>
                  <div className="tw-pt-2 xl:tw-ml-0 tw-ml-4 xl:tw-mt-0 tw-mt-4">
                    <p className="tw-text-black tw-font-semibold">
                      {studentDetails?.name}
                    </p>
                    <p className="tw-text-sm tw-pb-2">Student</p>
                    <p className="tw-text-sm">
                      Student Id: {studentDetails?.givenStudentId}
                    </p>
                    <p className="tw-text-sm tw-text-primary tw-font-semibold">
                      change password
                    </p>
                  </div>
                </div>
              </div>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="tw-w-auto xl:tw-flex"
              >
                <div className="tw-ml-2 xl:tw-px-6 tw-px-3 xl:tw-py-4 tw-py-2 tw-border tw-border-gray-300 tw-rounded-md">
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Full Name</Label>
                    <Input
                      className="tw-bg-white tw-h-8"
                      placeholder="Full Name"
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.name)}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Email address</Label>
                    <Input
                      className="tw-bg-white tw-h-8"
                      type="email"
                      placeholder="abc@gmail.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.email)}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Phone no.</Label>
                    <Controller
                      name="phone.number"
                      control={control}
                      render={({ field }) => (
                        <PhoneInput
                          international
                          id="number"
                          placeholder="Enter a phone number"
                          className="tw-w-full"
                          value={field.value}
                          onChange={(value) => field.onChange(value)}
                          defaultCountry="IN"
                        />
                      )}
                    />
                    {errors.phone && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {(errors.phone as any)?.number?.message ||
                          "Invalid phone number"}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Languages Known</Label>
                    <Input
                      className="tw-bg-white tw-h-8"
                      {...register("languages")}
                    />
                    {errors.languages && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.languages)}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Full Address</Label>
                    <Textarea
                      className="tw-bg-white"
                      {...register("address")}
                    />
                    {errors.address && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.address)}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">LinkedIn Profile Link</Label>
                    <Input
                      className="tw-bg-white tw-h-8"
                      {...register("linkedin")}
                    />
                    {errors.linkedin && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.linkedin)}
                      </p>
                    )}
                  </div>
                  <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                    <Label className="tw-text-sm">Github Link</Label>
                    <Input
                      className="tw-bg-white tw-h-8"
                      {...register("github")}
                    />
                    {errors.github && (
                      <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                        {getFieldError(errors.github)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="xl:tw-pt-0 tw-pt-4">
                  <div className="tw-ml-2 xl:tw-px-6 tw-px-5 xl:tw-py-4 tw-py-2 tw-h-fit tw-border tw-border-gray-300 tw-rounded-md">
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">Education - HSC</Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        placeholder="College"
                        {...register("hscCollege")}
                      />
                      {errors.hscCollege && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.hscCollege)}
                        </p>
                      )}
                    </div>
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">
                        Subject Specialization
                      </Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        {...register("hscSubject")}
                      />
                      {errors.hscSubject && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.hscSubject)}
                        </p>
                      )}
                    </div>
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">Mention Year</Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        {...register("hscYear")}
                      />
                      {errors.hscYear && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.hscYear)}
                        </p>
                      )}
                    </div>
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">
                        Education - University or college
                      </Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        {...register("uniCollege")}
                      />
                      {errors.uniCollege && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.uniCollege)}
                        </p>
                      )}
                    </div>
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">
                        Subject Specialization
                      </Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        {...register("uniSubject")}
                      />
                      {errors.uniSubject && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.uniSubject)}
                        </p>
                      )}
                    </div>
                    <div className="xl:tw-w-80 tw-w-full xl:tw-pb-4 tw-pb-2">
                      <Label className="tw-text-sm">Mention Year</Label>
                      <Input
                        className="tw-bg-white tw-h-8"
                        {...register("uniYear")}
                      />
                      {errors.uniYear && (
                        <p className="tw-text-red-500 tw-text-xs tw-mt-1">
                          {getFieldError(errors.uniYear)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="tw-mt-4 xl:tw-ml-72">
                    <Button
                      type="submit"
                      className="hover:!tw-bg-primary tw-h-8"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
          <div>
            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogContent className="!tw-w-80">
                <AlertDialogHeader>
                  <div className="tw-flex">
                    <span className="tw-font-semibold">
                      Upload Profile Image
                    </span>
                    <X
                      onClick={handleCloseDialog}
                      className="tw-text-gray-400 tw-mt-1 tw-ml-auto tw-w-5 tw-h-5"
                    />
                  </div>
                </AlertDialogHeader>
                <div className="tw-bg-gray-300">
                  <div className="tw-border tw-border-dashed tw-border-primary tw-rounded-md">
                    <div className="tw-pt-6 tw-ml-28">
                      <FileText className="tw-text-primary tw-w-10 tw-h-10" />
                    </div>
                    <div className="tw-pb-4">
                      <Label className="tw-ml-24 tw-text-sm tw-text-primary tw-underline">
                        Browse file
                        <Input
                          type="file"
                          accept="image/jpeg"
                          onChange={handleFileChange}
                          style={{ display: "none" }}
                        />
                      </Label>
                      <div className="tw-justify-center tw-items-center">
                        {selectedFile && (
                          <p className="tw-mt-2 tw-text-sm tw-text-primary tw-flex tw-justify-center">
                            {selectedFile.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="tw-pl-14 tw-text-sm tw-text-gray-600">
                          Only jpg format is allowed
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <AlertDialogFooter>
                  <div className="xl:tw-pt-4 tw-pt-0 tw-mx-auto">
                    <Button
                      onClick={handleCloseDialog}
                      className="tw-text-primary tw-border tw-border-primary hover:tw-bg-white tw-bg-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleFileSubmit}
                      disabled={!selectedFile}
                      className="hover:tw-bg-primary"
                    >
                      Upload
                    </Button>
                  </div>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div>
            <AlertDialog open={success} onOpenChange={setSuccess}>
              <AlertDialogContent className="!tw-w-80 tw-px-2">
                <AlertDialogHeader>
                  <div className="tw-flex">
                    <X
                      onClick={() => setSuccess(false)}
                      className="tw-text-gray-400 tw-mt-1 tw-ml-auto tw-w-5 tw-h-5"
                    />
                  </div>
                </AlertDialogHeader>
                <div className="">
                  <CircleCheck className="tw-text-green-500 tw-w-16 tw-h-16 tw-flex tw-mx-auto" />
                  <span className="tw-font-semibold tw-flex tw-justify-center">
                    Completed
                  </span>
                </div>
                <div className="">
                  <p className="xl:tw-text-nowrap tw-text-sm tw-flex tw-justify-center">
                    Your details have been updated successfully.
                  </p>
                </div>
                <AlertDialogFooter>
                  <Button
                    onClick={() => setSuccess(false)}
                    className="hover:!tw-bg-primary tw-flex tw-mx-auto"
                  >
                    Continue
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyProfile;
