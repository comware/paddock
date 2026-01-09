/**
 * SiteContext - Context for site-specific data
 *
 * Extracted to separate file to satisfy Fast Refresh requirements.
 */

import { createContext, useContext } from 'react';
import type { GrowSite } from '@/lib/db';

export interface SiteContextValue {
  site: GrowSite | null;
  siteId: string;
  isLoading: boolean;
}

export const SiteContext = createContext<SiteContextValue>({
  site: null,
  siteId: '',
  isLoading: true,
});

export function useSiteContext() {
  return useContext(SiteContext);
}
