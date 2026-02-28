# Resume Debugging Guide

## Step 1: Open Browser Console
Press `F12` → Click "Console" tab

## Step 2: Copy and Paste This Code

```javascript
const { data } = await supabase
  .from('campaign_candidates')
  .select('full_name, resume_url')
  .limit(5);
console.log(data);
```

## Step 3: Check the Output
Look at what prints:
- **If you see data with resume_url values** → resumes exist in database
- **If resume_url is null/empty** → files aren't linked in database
- **If you see an error** → database access issue

## Step 4: Check Storage Bucket

If Step 2 shows resume_url values, paste this:

```javascript
const { data: files } = await supabase.storage
  .from('resumes')
  .list('', { limit: 10 });
console.log('Files in storage:', files);
```

## Step 5: Try to Load One Resume

Replace `YOUR_RESUME_URL_HERE` with an actual value from Step 2:

```javascript
const { data: signed } = await supabase.storage
  .from('resumes')
  .createSignedUrls(['YOUR_RESUME_URL_HERE'], 3600);
console.log('Signed URL:', signed);
```

## Step 6: Click a Candidate

After running Step 2-5, click on a candidate name in the list.
- Check if a detail panel opens on the right
- Take a screenshot and share it
