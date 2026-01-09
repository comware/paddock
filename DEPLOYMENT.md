# Paddock Deployment Guide

This guide walks you through deploying Paddock to production using Vercel.

## Prerequisites

- A Vercel account (free tier works great)
- Node.js 18+ installed locally
- Git repository pushed to GitHub, GitLab, or Bitbucket

## Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from project directory**
   ```bash
   # Test deployment
   vercel

   # Production deployment
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect the framework and settings
5. Click "Deploy"

## Environment Variables

Configure these in the Vercel dashboard under Project Settings → Environment Variables:

### Required for Error Tracking (Optional but Recommended)

- `VITE_SENTRY_DSN`: Your Sentry DSN from [sentry.io](https://sentry.io)
  - Sign up at Sentry
  - Create a new React project
  - Copy the DSN (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)

### Required for Analytics (Optional but Recommended)

The analytics script in `index.html` needs to be configured:
- Replace `REPLACE_WITH_YOUR_DOMAIN` with your actual domain in `index.html`
- Or use environment variable injection (see Advanced Configuration below)

For Plausible Analytics:
1. Sign up at [plausible.io](https://plausible.io) or self-host
2. Add your domain to Plausible
3. The script is already included in `index.html`

## Post-Deployment Setup

### 1. Test the Deployment

Visit your deployment URL and verify:
- ✅ App loads correctly
- ✅ PWA install prompt works on mobile
- ✅ No console errors
- ✅ Dark/light theme toggle works
- ✅ All routes are accessible

### 2. Configure Custom Domain (Optional)

In Vercel dashboard:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update Plausible script domain in `index.html`

### 3. Test Error Tracking

1. Visit your deployed app
2. Open browser console
3. Run: `throw new Error('Test Sentry error')`
4. Check Sentry dashboard for the error

### 4. Verify Analytics

1. Visit your deployed app
2. Navigate through a few pages
3. Check Plausible dashboard after a few minutes

## Production Checklist

Before going live, verify:

- [ ] Production build completes without errors (`npm run build`)
- [ ] All tests pass (`npm run test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Sentry DSN configured and tested
- [ ] Analytics domain configured correctly
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS is working (Vercel does this automatically)
- [ ] PWA manifest is accessible at `/manifest.webmanifest`
- [ ] Service worker is registered (`/sw.js`)
- [ ] App works offline after first visit

## Monitoring

### Error Tracking (Sentry)

- Dashboard: [sentry.io](https://sentry.io)
- Errors are automatically captured and reported
- Includes user session replays for debugging
- 10% of normal sessions recorded, 100% of error sessions

### Analytics (Plausible)

- Dashboard: [plausible.io/your-domain.com](https://plausible.io)
- Privacy-focused, no cookies
- Tracks page views, sessions, and user journeys
- GDPR compliant out of the box

## Troubleshooting

### Build Fails

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Try building locally
npm run build
```

### Service Worker Issues

```bash
# Clear service worker cache
# In browser DevTools:
# Application → Service Workers → Unregister
# Then hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
```

### Sentry Not Receiving Errors

- Verify DSN is set correctly in Vercel environment variables
- Check browser console for Sentry initialization logs
- Verify production build (Sentry only activates in production)
- Check Sentry project settings for rate limits

### Analytics Not Recording

- Verify domain is set correctly in `index.html`
- Check browser console for Plausible script errors
- Verify domain is added to Plausible dashboard
- Try incognito mode (ad blockers may block analytics)

## Advanced Configuration

### Using Environment Variables for Analytics

Instead of hardcoding the domain in `index.html`, you can use a custom build step:

1. Create `.env.production`:
   ```
   VITE_PLAUSIBLE_DOMAIN=your-domain.com
   ```

2. Update `index.html` to use a build-time replacement or inject via Vite plugin

### Custom Service Worker

Modify `vite.config.ts` → `VitePWA` options to customize caching strategies.

### Performance Optimization

The build currently warns about chunk size. To optimize:

1. Implement route-based code splitting
2. Use dynamic imports for heavy components
3. Configure manual chunks in `vite.config.ts`

## Cost Considerations

### Free Tier Coverage

- **Vercel**: Free tier includes unlimited personal projects
- **Sentry**: Free tier includes 5K errors/month
- **Plausible**: $9/month for 10K pageviews (or self-host for free)

### Scaling

Paddock is fully client-side, so hosting costs don't scale with users:
- No backend to manage
- No database to scale
- All data stored client-side (IndexedDB)
- Only static file serving costs

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review build logs in Vercel dashboard
- Check GitHub issues for known problems

## Security

Paddock is designed with security in mind:
- No server-side processing
- API keys stored client-side only (never transmitted to your server)
- Content Security Policy headers via `vercel.json`
- HTTPS enforced by Vercel
- No user authentication required (fully local-first)
