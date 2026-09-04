import { Navigate, useLocation } from 'react-router-dom';

/**
 * Paddock's grow module became microgreens when vegetables arrived as a sibling rather than
 * something feeding it. Links, bookmarks, keyboard shortcuts and anything an agent has been
 * told about the app still say /grow, so redirect rather than 404 - the module's own routes
 * file already keeps aliases for the same reason.
 *
 * The sub-path is preserved, so a bookmarked /grow/analytics lands on
 * /microgreens/analytics rather than dumping the reader at the module root.
 *
 * Lives in its own file because routes.tsx also exports `router`, and a second component
 * beside a non-component export trips react-refresh/only-export-components.
 */
export function GrowRedirect() {
  const { pathname, search, hash } = useLocation();
  return <Navigate to={pathname.replace(/^\/grow/, '/microgreens') + search + hash} replace />;
}
