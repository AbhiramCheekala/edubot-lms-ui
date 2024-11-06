import { Separator } from '@/components/ui/separator';
import { Menu } from 'lucide-react';
import React from 'react';
import { BaseEdubotUserNav } from './BaseUserNav';
import { useAuth } from '../../../hooks/useAuth';

const BaseEdubotHeader: React.FC<{ onMenuToggle: () => void }> = ({ onMenuToggle }) => {
  const { account } = useAuth();
  return (
    <header className="tw-flex tw-justify-start tw-items-center tw-p-3 tw-bg-secondary tw-border-b tw-text-primary tw-h-16">
      <div className="tw-flex tw-items-center tw-w-full md:tw-w-auto">
        <button onClick={onMenuToggle} className="tw-mr-2 md:tw-hidden">
          <Menu className="tw-w-6 tw-h-6" />
        </button>
        <img src="/edubot_logo.svg" alt="Logo" className="tw-h-8 md:tw-pl-6 tw-mx-auto md:tw-mx-0" />
      </div>
      
      <Separator orientation="vertical" className='tw-bg-primary tw-mx-6 tw-h-4/5 tw-hidden md:tw-block' />
      
      <div className="tw-text-lg tw-font-medium tw-flex-grow tw-hidden md:tw-block">
        Hello {(account?.user?.name ?? account?.student?.name ?? "Edubot User").split(' ')[0]}, Welcome to Edubot LMS Platform
      </div>
      
      <div className="tw-flex tw-items-center tw-space-x-4 tw-ml-auto">
        {/* <Bell className="tw-w-6 tw-h-6" /> */}
        {/* <Avatar className='tw-w-8 tw-h-8'>
          <AvatarImage src="https://github.com/shadcn.png" alt="User" />
          <AvatarFallback>KR</AvatarFallback>
        </Avatar> */}
        <BaseEdubotUserNav />
      </div>
    </header>
  );
};

export default BaseEdubotHeader;