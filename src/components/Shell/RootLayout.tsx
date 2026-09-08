/**
 * RootLayout - wraps every route so the welcome modal has router context.
 *
 * It lives here rather than in routes.tsx because routes.tsx exports the router, not a
 * component. React Fast Refresh can only swap a module's exports in place when they are all
 * components, so one component sitting beside the router config forced a full reload on
 * every routing change.
 */

import { Outlet } from 'react-router-dom';
import { WelcomeModal } from '@/components/onboarding';

export function RootLayout() {
  return (
    <>
      <WelcomeModal />
      <Outlet />
    </>
  );
}
