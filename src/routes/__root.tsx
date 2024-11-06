import { Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient } from '@tanstack/react-query';
import BaseEdubotHeader from '@/components/custom/base/BaseEdubotHeader';
import BaseEdubotSidebar from '@/components/custom/base/BaseEdubotSidebar';
import { useState } from 'react';
import { AuthContext } from '../hooks/useAuth';
import { cn } from '../lib/utils';
 
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  showSidebar?: boolean;
  showHeader?: boolean;
  hideRootPadding?: boolean;
  hideRootPaddingOnMobileOnly?: boolean;
  authentication: AuthContext
}>()({
  component: RootComponent,
});
 

function RootComponent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const matches = useMatches();
  const currentRoute = matches[matches.length - 1];
  const showSidebar = currentRoute?.context?.showSidebar ?? true;
  const showHeader = currentRoute?.context?.showHeader ?? true;
  const hideRootPadding = currentRoute?.context?.hideRootPadding ?? false;
  const hideRootPaddingOnMobileOnly = currentRoute?.context?.hideRootPaddingOnMobileOnly ?? false;
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  return (
    <div className="tw-font-montserrat tw-flex tw-flex-col tw-h-screen">
      {showHeader && <BaseEdubotHeader onMenuToggle={toggleSidebar}  />}
      <div className="tw-flex tw-flex-1 tw-overflow-hidden">
        {showSidebar && <BaseEdubotSidebar isOpen={sidebarOpen} />}
        <main className={cn(`tw-flex-1 tw-overflow-auto ${ hideRootPadding ? "tw-p-0" : "tw-p-6"} ${hideRootPaddingOnMobileOnly ? "tw-p-0 md:tw-p-6" : ""}`)}>
          <Outlet />
        </main>
      </div>
      <ReactQueryDevtools buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  );
}