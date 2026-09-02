/**
 * Platform - what every enterprise needs.
 *
 * Sites and weather are not grow's, though they lived there while grow was the only
 * module. Propagation already stores `siteId`, and vegetables will too.
 */

export { useSites, type SitesState } from './stores/useSites';
export { useWeather } from './hooks/useWeather';
