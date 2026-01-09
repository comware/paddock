# 🚀 Paddock Launch Checklist

Use this checklist to complete your production deployment.

## Pre-Deployment Tasks

### ✅ Code Preparation (COMPLETED)

- [x] Production build tested and working
- [x] Sentry integration added
- [x] Analytics script added (Plausible)
- [x] Environment variable documentation created
- [x] Vercel configuration file created
- [x] Deployment documentation written
- [x] README updated with deployment info

### 📝 Tasks You Need to Complete

## 1. Set Up Sentry (15 minutes)

1. **Create Sentry Account**
   - Go to https://sentry.io
   - Sign up for free account
   - Create a new project, select "React"

2. **Get Your DSN**
   - After creating project, copy the DSN
   - It looks like: `https://xxx@xxx.ingest.sentry.io/xxx`
   - Save this for the Vercel setup

## 2. Set Up Analytics (10 minutes)

**Option A: Plausible (Recommended)**
1. Go to https://plausible.io (or self-host)
2. Sign up and add your domain
3. Note: You'll need to update `index.html` with your actual domain after deployment

**Option B: PostHog**
1. Go to https://posthog.com
2. Sign up and create project
3. Get your snippet code
4. Replace Plausible script in `index.html`

## 3. Deploy to Vercel (10 minutes)

### Option A: Via CLI (Faster)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (test deployment first)
vercel

# Review the preview URL, test it
# If everything works, deploy to production
vercel --prod
```

### Option B: Via Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. Add Environment Variables:
   - Key: `VITE_SENTRY_DSN`
   - Value: [Your Sentry DSN from Step 1]

5. Click "Deploy"

## 4. Post-Deployment Configuration (10 minutes)

### Update Analytics Domain

After deployment, you'll have a URL like `your-project.vercel.app`

1. Open `index.html`
2. Find: `<script defer data-domain="REPLACE_WITH_YOUR_DOMAIN"`
3. Replace with: `<script defer data-domain="your-project.vercel.app"`
4. Commit and push changes
5. Vercel will auto-deploy

### Or Use Custom Domain

If you have a custom domain:
1. In Vercel dashboard: Settings → Domains
2. Add your domain (e.g., `paddock.app`)
3. Follow DNS configuration instructions
4. Update `index.html` with your custom domain
5. Update Plausible dashboard with your custom domain

## 5. Verify Everything Works (20 minutes)

### Basic Functionality
- [ ] Visit your production URL
- [ ] App loads without errors (check browser console)
- [ ] Create a test growing site
- [ ] Add a test tray
- [ ] Log a daily entry
- [ ] Check AI assistant works (configure your API key in Settings)
- [ ] Test dark/light theme toggle
- [ ] Verify PWA install prompt appears (mobile/desktop)

### PWA Installation
- [ ] On iOS: Add to Home Screen works
- [ ] On Android: Install App prompt appears
- [ ] On Desktop: Install icon in address bar
- [ ] App opens standalone without browser UI

### Error Tracking
1. Open browser console on production site
2. Run: `throw new Error('Test Sentry error')`
3. Check Sentry dashboard (may take a minute)
4. Confirm error appears with stack trace

### Analytics
1. Navigate through several pages on production site
2. Wait 2-3 minutes
3. Check Plausible dashboard
4. Confirm page views are recording

### Performance
- [ ] No console errors in production
- [ ] Pages load quickly
- [ ] Offline mode works (disconnect internet, refresh)
- [ ] Service worker is active (DevTools → Application → Service Workers)

## 6. Optional: Custom Domain Setup (15 minutes)

If you want to use a custom domain like `paddock.app`:

1. **In Vercel Dashboard**
   - Go to Project Settings → Domains
   - Click "Add Domain"
   - Enter your domain name

2. **Update DNS**
   - Add A record or CNAME as instructed by Vercel
   - Wait for DNS propagation (can take up to 24 hours)

3. **Update Analytics**
   - Update domain in `index.html`
   - Update domain in Plausible dashboard

4. **Enable HTTPS**
   - Vercel automatically provisions SSL certificate
   - Force HTTPS redirect in Settings

## 7. Share & Monitor

### Share Your App
- [ ] Share production URL with test users
- [ ] Post on social media (if public)
- [ ] Add to portfolio/website

### Set Up Monitoring
- [ ] Add Sentry to your browser bookmarks
- [ ] Add Plausible dashboard to bookmarks
- [ ] Set up Sentry email alerts for critical errors
- [ ] Check analytics weekly to understand usage

## Troubleshooting

### Build Fails
```bash
# Clear and rebuild locally first
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### Service Worker Not Working
- Clear cache: DevTools → Application → Clear Storage
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### Sentry Not Receiving Errors
- Verify DSN is set in Vercel environment variables
- Check that you're testing on production URL (not localhost)
- Check Sentry project quota limits

### Analytics Not Recording
- Verify domain matches exactly in both `index.html` and Plausible
- Disable ad blockers when testing
- Try incognito mode
- Allow 2-3 minutes for data to appear

## Cost Breakdown

- **Vercel**: Free (hobby tier)
- **Sentry**: Free (5K errors/month)
- **Plausible**: $9/month for 10K pageviews (or self-host for free)
- **Domain**: ~$10-15/year (optional)

**Total minimum cost**: $0/month (using Vercel subdomain)
**Total with custom domain + analytics**: ~$10/month

## Security Notes

- ✅ HTTPS automatically enabled by Vercel
- ✅ Security headers configured in `vercel.json`
- ✅ No backend to secure (fully client-side)
- ✅ API keys stored client-side only (user's responsibility)
- ✅ No cookies or tracking
- ✅ GDPR compliant by design

## Next Steps After Launch

1. **Monitor errors** in Sentry for the first week
2. **Check analytics** to see which features are used
3. **Collect feedback** from test users
4. **Plan improvements** based on usage data
5. **Update documentation** with any learnings

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Sentry Documentation](https://docs.sentry.io)
- [Plausible Documentation](https://plausible.io/docs)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**🎉 When complete, you'll have a production-ready PWA with monitoring and analytics!**

Questions or issues? Check the DEPLOYMENT.md guide for detailed troubleshooting.
