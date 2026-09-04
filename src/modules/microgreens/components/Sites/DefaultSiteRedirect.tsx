/**
 * DefaultSiteRedirect - send a site-less URL into the grower's growing space
 *
 * Trays, the daily log and time tracking are all scoped to one growing space, but each has a
 * site-less route left over from before Paddock had growing spaces at all. Those routes
 * still resolved, and rendered the page without a site: /grow/time showed "No Site
 * Selected" and the others quietly worked across every growing space at once.
 *
 * They are kept - links, bookmarks and the mobile navigation point at them - but they
 * redirect rather than render, which is what an alias should do.
 */

import { Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useSites } from '@/platform';

interface DefaultSiteRedirectProps {
  /** Path within the growing space, e.g. 'trays' or 'daily'. Empty for the dashboard. */
  to: string;
  /** Rendered when there is no growing space to redirect into. */
  fallback: React.ReactNode;
}

export function DefaultSiteRedirect({ to, fallback }: DefaultSiteRedirectProps) {
  const { sites, isLoading, loadSites } = useSites();

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  if (isLoading) return null;

  const site = sites.find((s) => s.isDefault) ?? sites[0];
  if (!site?.id) return <>{fallback}</>;

  // replace so the back button does not bounce between the alias and its destination.
  return <Navigate to={`/grow/site/${site.id}${to ? `/${to}` : ''}`} replace />;
}
