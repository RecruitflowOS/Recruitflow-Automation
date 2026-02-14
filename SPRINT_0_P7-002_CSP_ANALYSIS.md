# Sprint 0 — P7-002: Content Security Policy Analysis

**Finding:** P7-002 — No Content Security Policy Headers
**Severity:** 🔴 HIGH
**CVSS Score:** 7.0
**Status:** ✅ **PARTIALLY IMPLEMENTED**

---

## Current Status

You already have a `vercel.json` with CSP headers configured! Let me analyze what's present and what needs improvement.

---

## Current Configuration Analysis

### ✅ What's Good

**Headers present:**
- ✅ Content-Security-Policy (CSP)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy: camera, microphone, geolocation, payment disabled

**CSP Policy Structure:**
```
default-src 'none'                                    ✅ Good — default deny
script-src: 'self' + CDNs                            ✅ Good — allows only self + trusted CDNs
connect-src: Supabase + WebSocket                    ✅ Good — restricted to Supabase
frame-src: Limited to Supabase                       ✅ Good — PDF iframe only
frame-ancestors 'none'                               ✅ Good — can't be embedded
```

---

## Issues Found

### 🟡 Issue 1: `'unsafe-inline'` in script-src

**Current:**
```
script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://esm.sh
```

**Problem:**
- `'unsafe-inline'` allows any inline `<script>` tag
- If XSS vulnerability exists, attacker can inject `<script>` tags
- Defeats purpose of CSP for scripts

**Recommendation:**
- Remove `'unsafe-inline'` from script-src
- Use Tailwind's JIT mode instead (no inline styles needed)

---

### 🟡 Issue 2: `'unsafe-inline'` in style-src

**Current:**
```
style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com
```

**Problem:**
- Allows inline `<style>` tags
- If XSS exists, attacker can inject styles for exfiltration or UI spoofing

**Recommendation:**
- Remove `'unsafe-inline'` from style-src
- Use CSS classes only (Tailwind handles this)
- If inline styles needed, use nonce-based CSP instead

---

## Remediation

### Option A (Recommended): Tighten CSP, Remove Unsafe-Inline

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'none'; script-src 'self' https://cdn.tailwindcss.com https://esm.sh; style-src 'self' https://cdn.tailwindcss.com; connect-src 'self' https://bebiojwkjnyyccnlqjge.supabase.co wss://bebiojwkjnyyccnlqjge.supabase.co; frame-src https://bebiojwkjnyyccnlqjge.supabase.co; img-src 'self' data: blob: https://bebiojwkjnyyccnlqjge.supabase.co; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; upgrade-insecure-requests"
        },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=()" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" }
      ]
    }
  ]
}
```

**Changes from current:**
- ❌ Removed `'unsafe-inline'` from script-src
- ❌ Removed `'unsafe-inline'` from style-src
- ✅ Added `object-src 'none'` (prevent object/embed exploitation)
- ✅ Added `upgrade-insecure-requests` (force HTTPS)
- ✅ Added `X-XSS-Protection` header (defense in depth)

---

### Option B (If Unsafe-Inline Needed): Keep Current

If your code has inline `<style>` tags that can't be removed:

**Keep current vercel.json as-is**

But then:
1. Migrate all inline styles to Tailwind classes (recommended)
2. Or use nonce-based CSP (more complex)

---

## Impact of Removing Unsafe-Inline

### What breaks?
- ❌ Inline `<style>` tags (migrate to Tailwind)
- ❌ Inline `<script>` tags (move to `<script src="...">`)

### What is protected?
- ✅ XSS via inline script injection — BLOCKED
- ✅ XSS via inline style injection — BLOCKED
- ✅ Data exfiltration via malicious CSS — BLOCKED

---

## Verification

After updating `vercel.json`:

### Check 1: Headers are sent correctly
```bash
curl -i https://your-domain.vercel.app | grep -i "content-security-policy"
```

Should show your CSP policy.

### Check 2: CSP violations in console
```javascript
// In browser console (F12), look for CSP violation logs
// Should see NO violations if CSP is correct
```

### Check 3: Test CSP inline script blocking
```javascript
// This should be blocked by CSP:
eval('alert("XSS")');
// Should see CSP error in console
```

---

## Recommendation

### ✅ **Implement Option A** (recommended)

**Why:**
1. Removes unsafe-inline — eliminates XSS injection vector
2. Your code already uses Tailwind (no inline styles needed)
3. esm.sh/Tailwind are trusted CDNs (allowlisted explicitly)
4. More secure without performance impact
5. Aligns with security audit recommendations

**Step-by-step:**
1. Update `vercel.json` with Option A
2. Deploy to Vercel
3. Run verification checks above
4. Monitor browser console for CSP violations (should be none)

---

## Current vs. Recommended Comparison

| Aspect | Current | Recommended |
|---|---|---|
| Script Injection via XSS | ⚠️ Vulnerable | ✅ Protected |
| Style Injection via XSS | ⚠️ Vulnerable | ✅ Protected |
| Object/Embed Exploitation | ⚠️ Vulnerable | ✅ Protected |
| HTTP Downgrade | ⚠️ Possible | ✅ Prevented |
| Overall Security | 🟡 Medium | 🟢 Strong |

---

## Related Files

- Original audit: `SECURITY_AUDIT_REPORT.md` (P7-002)
- Re-audit: `SECURITY_AUDIT_REAUDIT_2026-02-14.md`
- Sprint 0 roadmap: `SECURITY_AUDIT_REAUDIT_2026-02-14.md`

---

*Sprint 0 Item 3 — Content Security Policy Hardening*
*Date: 2026-02-14*
