import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { api } from "../../lib/api";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from '@tanstack/react-router';
import { Award, Building, CircleHelp, Earth, Flame, Globe, Linkedin, MapPin, Pen, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Define interfaces
interface ContactPhoneNumber {
  number: string;
  countryCode: string;
}

interface Student {
  id: string;
  givenStudentId: string;
  name: string;
  personalEmail: string;
  dateOfBirth: string;
  apsche: boolean;
  gender: string;
  orgId: string;
  batchId: string;
  joiningDate: string;
  contactPhoneNumber: ContactPhoneNumber;
  isActive: boolean;
}

interface OrgDetails {
  name: string;
}

interface UserProfile {
  loginId: string;
  email: string;
  accountType: string;
  isVerified: boolean;
  role: string;
  student: Student;
  user: any;
}

// Define API Functions
const fetchStudentData = async (studentId: string): Promise<Student> => {
  const response = await api.get(`/students/${studentId}`);
  console.log(response.data);
  return response.data;
};

const fetchOrgName = async (orgId: string): Promise<OrgDetails> => {
  const response = await api.get(`/organizations/${orgId}`);
  console.log(response.data);
  return response.data;
};

// Profile Component
const Profile: React.FC = () => {
  const { account } = useAuth();
  const accountDetails = account;

  let studentId: string | undefined;
  let orgId: string | undefined;

  if (accountDetails && accountDetails.student) {
    studentId = accountDetails.student.id;
    orgId = accountDetails.student.orgId;
  } else {
    console.error("Student details not available in account, unable to fetch student data.");
    return <div>Error: Student details are missing!</div>;
  }

  const { data: studentProfile, isLoading: isLoadingStudent, error: studentError } = useQuery<Student>({
    queryKey: ['studentData', studentId],
    queryFn: () => fetchStudentData(studentId!),
    enabled: !!studentId,
  });

  const { data: orgDetails, isLoading: isLoadingOrg, error: orgError } = useQuery<OrgDetails>({
    queryKey: ['orgName', orgId],
    queryFn: () => fetchOrgName(orgId!),
    enabled: !!orgId,
  });

  if (isLoadingStudent || isLoadingOrg) return <div>Loading...</div>;
  if (studentError) return <div>Error loading student profile data</div>;
  if (orgError) return <div>Error loading organization name</div>;

  return (
    <div>
      {studentProfile && orgDetails && (
        <div className='xl:tw-flex xl:tw-flex-row xl:tw-gap-x-1 xl:tw-mr-72'>
          <div className='xl:tw-flex xl:tw-flex-col xl:tw-gap-y-1 '>
            <Card className='xl:tw-max-h-100px'>
              <CardContent>
                <div className='tw-font-bold tw-text-black tw-py-2'>Profile Details</div>
                <div className='tw-flex tw-gap-4 tw-flex-col'>
                  <div className='tw-flex tw-flex-row'>
                  <div className='tw-relative tw-mb-4'>
                    <Avatar className='tw-w-24 tw-h-24 '>
                      <AvatarImage src="https://github.com/shadcn.png" alt={studentProfile.name} />
                      <AvatarFallback>{studentProfile.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className='tw-absolute tw-bottom-0 tw-right-0 tw-translate-x-1/3'>
                  <Avatar className="tw-bg-blue-100 tw-w-auto tw-h-auto md:tw-w-10 md:tw-h-10">
                    <AvatarImage src="/Clapping_Hands_Emoji.svg" alt="Clap" className='tw-w-auto tw-h-auto'/>
                    <AvatarFallback>RK</AvatarFallback>
                  </Avatar>
                  </div>
                  </div>
                    <div className='tw-flex tw-flex-col tw-pl-8 tw-mt-1 tw-gap-1.5 lg:tw-gap-4 md:tw-gap-4'>
                      <div className='tw-flex tw-flex-row tw-items-center tw-gap-2'>
                        <span className='tw-font-bold tw-text-primary tw-text-sm'>{studentProfile.name}</span>
                        <Link to='/my/profile/edit'>
                          <span className='tw-cursor-pointer'><Pen className='tw-text-primary tw-w-3.5 tw-h-3.5'/></span>
                        </Link>
                      </div>
                      <div className='xl:tw-flex xl:tw-flex-row xl:tw-gap-6 md:tw-flex md:tw-flex-row md:tw-gap-4 tw-flex tw-flex-col tw-gap-1.5'>
                        <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-0.5'>
                          <MapPin className='tw-text-primary tw-w-4 tw-h-4'/>
                          <span className='tw-text-xs'>Address</span>
                        </div>
                        <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-0.5'>
                          <Award className='tw-text-primary tw-w-4 tw-h-4 lg:tw-w-fixed'/>
                          <span className='tw-text-xs'>Member since 2012-2017</span>
                        </div>
                      </div>
                      <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-0.5'>
                        <Globe className='tw-text-primary tw-w-4 tw-h-4'/>
                        <span className='tw-text-xs'>
                          Github Link
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className='tw-flex tw-flex-col tw-gap-y-2.5 lg:tw-flex lg:tw-flex-row lg:tw-gap-4 md:tw-flex md:tw-flex-row md:tw-gap-2'>
                    <div className='tw-flex tw-items-center '>
                      <div className='tw-flex tw-items-center tw-px-2 tw-py-1 tw-border tw-rounded-lg tw-bg-orange-200'>
                        <Flame className='tw-text-orange-500 tw-w-4 tw-h-4' />
                        <span className='tw-text-xs'>Daily Login: 3</span>
                      </div>
                    </div>
                    <div className='tw-flex tw-items-center'>
                      <div className='tw-flex tw-flex-row tw-items-center tw-px-2 tw-py-1 tw-border tw-rounded-lg tw-bg-green-200'>
                        <div className='tw-text-xs'>We have unlocked <img src="/Clapping_Hands_Emoji.svg" alt="Clapping" className='tw-inline-flex tw-h-4 tw-w-4'/> for your welcome!</div>
                      </div>
                    </div>
                    <div className='tw-flex tw-items-center'>
                      <div className='tw-flex tw-items-center tw-px-2 tw-py-1 tw-border tw-rounded-lg tw-bg-blue-200 tw-gap-2'>
                        <Earth className='tw-text-primary tw-w-4 tw-h-4'/>
                        <Linkedin className='tw-text-primary tw-w-4 tw-h-4'/>
                      </div>
                    </div>
                  </div>
                  <div className='tw-py-2 lg:tw-py-0 xl:tw-py-0'>
                    <Separator/>
                  </div>
                  <div>
                    <span className='tw-font-bold tw-text-sm'>About</span>
                    <p className='tw-text-xs xl:tw-w-5/6'>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className='xl:tw-h-100px'>
              <CardContent>
              <div className='sm:tw-flex sm:tw-flex-row sm:tw-justify-between sm:tw-items-center'>
                <div className='tw-flex tw-gap-2 tw-flex-col tw-py-2'>
                <div className='tw-font-bold tw-text-black'>Education</div>
                  <div className='tw-flex tw-gap-2 tw-flex-col'>
                    <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-0.5'>
                      <Building className='tw-text-primary tw-w-10 tw-h-10'/>
                      <div className='tw-flex tw-flex-col tw-pl-2 tw-w-36'>
                        <span className='tw-text-sm tw-text-primary tw-font-bold tw-w-44'>{orgDetails.name}</span>
                        <span className='tw-text-xs'>Bachelor of Technology 2017-2021</span>
                      </div>
                    </div>
                    <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-0.5'>
                      <Building className='tw-text-primary tw-w-10 tw-h-10'/>
                      <div className='tw-flex tw-flex-col tw-pl-2 tw-w-36'>
                        <span className='tw-text-sm tw-text-primary tw-font-bold tw-w-44'>Kendriya Vidyalaya</span>
                        <span className='tw-text-xs'>Physics, Chemistry , Maths 2017-2021</span>
                      </div>
                    </div>
                    </div>
                  </div>
                  <div className='sm:tw-flex sm:tw-justify-end'>
                  <img src="/Building.svg" alt="Logo" className="tw-hidden sm:tw-inline sm:tw-px-1 sm:tw-pt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className='xl:tw-w-56 xl:tw-h-28 '>
            <CardContent>
              <div className='tw-font-bold tw-text-black tw-py-2'>Manage</div>
              <div className='tw-flex tw-flex-col tw-gap-4'>
                <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-2'>
                  <Settings className='tw-text-primary tw-w-4 tw-h-4'/>
                  <span className='tw-text-xs'>Settings</span>
                </div>
                <div className='tw-flex tw-flex-row tw-items-center tw-gap-x-2'>
                  <CircleHelp className='tw-text-primary tw-w-4 tw-h-4'/>
                  <span className='tw-text-xs'>Privacy</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Profile;