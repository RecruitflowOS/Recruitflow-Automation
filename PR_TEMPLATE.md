# Fix CSP Policy to Allow Importmap Script Execution

## Summary
Resolves CSP (Content Security Policy) violation that was blocking the inline importmap script from executing. This was causing the application to fail rendering resumes due to missing ES module imports.

## Changes
- Added script hash `'sha256-cEga6KrrOCBTrtGV17rSRRG7K45tY55nxwu25blniio='` to the `script-src` directive in `vercel.json`
- This allows the specific inline JSON importmap in `index.html` to execute while maintaining security

## Why This Fix
The browser console was displaying the error:
```
Executing inline script violates the following Content Security Policy directive 'script-src 'self' https://esm.sh'
```

This error prevented the importmap from loading React and other dependencies from esm.sh, which in turn blocked resume rendering functionality.

## Test Plan
- [ ] Deploy to Vercel and verify no CSP console errors appear
- [ ] Confirm resumes render correctly in the dashboard
- [ ] Verify all module imports (React, Lucide, Supabase) load successfully
- [ ] Check browser DevTools Console for any CSP violations

## Related Issues
- CSP blocking inline script execution
- Resume rendering not working due to missing module imports
