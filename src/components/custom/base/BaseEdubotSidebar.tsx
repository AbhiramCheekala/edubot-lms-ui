import { Link } from '@tanstack/react-router';
import React, { useMemo } from 'react';
import { sidebarItemPermissions, usePolicies } from '../../../hooks/usePolicies';
import { useAuthStore } from '../../../store/authStore';

const sidebarItems = [
  // { isVisibleToStudent: true, isVisibleToUser: false, studentLabel: 'Home', label: 'Home', path: '/home' },
  // { isVisibleToStudent: true, isVisibleToUser: true, studentLabel: 'Performance', label: 'Performance', path: '/performance' },
  // { isVisibleToStudent: true, isVisibleToUser: true, studentLabel: 'Certificate', label: 'Certificate', path: '/certificate' },
  { isVisibleToStudent: true, isVisibleToUser: true, label: 'All Program & Courses', path: '/all' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Manage Users', path: '/users' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Students', path: '/students' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Organizations', path: '/organization' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Manage Programs', path: '/programs' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Manage Courses', path: '/manage-courses' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Submissions', path: '/submissions' },
  { isVisibleToStudent: true, isVisibleToUser: false, label: 'My Submissions', path: '/my/submissions' },
  { isVisibleToStudent: true, isVisibleToUser: true, studentLabel: 'Batch', label: 'Manage Batches', path: '/batches', studentPath: '/batches/my/students' },
  { isVisibleToStudent: false, isVisibleToUser: true, label: 'Data Import/Export', path: '/data' },
  { isVisibleToStudent: true, isVisibleToUser: true, label: 'Raised Tickets', path: '/tickets' },
  { isVisibleToStudent: false, isVisibleToUser: true, studentLabel: 'Profile', label: 'Help and Settings', path: '/settings' },
  { isVisibleToStudent: true, isVisibleToUser: false, studentLabel: 'Profile', label: 'Help and Settings', path: '/my/profile' },
];

const BaseEdubotSidebar: React.FC<{ isOpen: boolean }> = ({ isOpen }) => {
  const { permissionSet, isLoading, isError } = usePolicies();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const account = useAuthStore(state => state.account);

  const filteredSidebarItems = useMemo(() => {
    if (!isAuthenticated || isLoading || isError || !permissionSet) {
      return [];
    }

    return sidebarItems.filter(item => {
      const checkPermission = sidebarItemPermissions[item.path];
      if (account?.accountType === 'student' && item.isVisibleToStudent) {
        return checkPermission(permissionSet);
      } else if (account?.accountType === 'user' && item.isVisibleToUser) {
        return checkPermission(permissionSet);
      }
      return false;
    });
  }, [permissionSet, isAuthenticated, isLoading, isError, account?.accountType]);

  return (
    <aside className={`tw-w-64 tw-bg-primary tw-text-white tw-transition-all tw-duration-300 tw-ease-in-out ${isOpen ? 'tw-translate-x-0' : 'tw-translate-x-[-100%]'} md:tw-translate-x-0 tw-fixed tw-top-16 tw-bottom-0 tw-left-0 tw-z-50 md:tw-static`}>
      <nav>
        <ul className='tw-py-4'>
          {filteredSidebarItems.map((item) => (
            <li key={account?.accountType === 'student' ? item.studentPath ?? item.path : item.path}>
              <Link
                to={account?.accountType === 'student' ? item.studentPath ?? item.path : item.path}
                className="tw-block tw-py-2 tw-px-4 tw-font-normal tw-rounded hover:tw-bg-primary-button-pressed tw-transition-colors"
                activeProps={{
                  className: "tw-bg-primary-button-pressed"
                }}
              >
                {account?.accountType === 'student' ? item.studentLabel ?? item.label : item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default BaseEdubotSidebar;
