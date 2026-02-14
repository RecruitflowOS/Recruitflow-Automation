#Requires -Version 5.1
<#
.SYNOPSIS
    Sprint 0 - Step 3: Verify Row Level Security (T1-T4).

.DESCRIPTION
    Loads credentials from .env.local in the repo root, then runs four
    tests to confirm RLS is correctly configured on campaign_candidates.

    T1 - Anon read must return empty          (no user JWT)
    T2 - Attacker JWT read must return empty  (wrong user)
    T3 - Attacker INSERT must be blocked      (RLS write policy)
    T4 - Recruiter JWT read must return data  (authorised user)

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\step3_verify_rls.ps1
#>

$ErrorActionPreference = 'Stop'

# ---------- helpers -----------------------------------------------------------

function Write-Pass { param([string]$Msg) Write-Host "  [PASS] $Msg" -ForegroundColor Green }
function Write-Fail { param([string]$Msg) Write-Host "  [FAIL] $Msg" -ForegroundColor Red }
function Write-Skip { param([string]$Msg) Write-Host "  [SKIP] $Msg" -ForegroundColor Yellow }
function Write-Info { param([string]$Msg) Write-Host "         $Msg" -ForegroundColor Gray }
function Write-Head { param([string]$Msg) Write-Host "" ; Write-Host $Msg -ForegroundColor Cyan }

function Get-Snippet ([object]$Obj) {
    if ($null -eq $Obj) { return '(null)' }
    $s = ''
    try { $s = $Obj | ConvertTo-Json -Compress -Depth 3 } catch { $s = "$Obj" }
    if ($s.Length -gt 300) { return $s.Substring(0, 300) + '...' }
    return $s
}

function Get-HttpStatus ([System.Exception]$Ex) {
    try { return [int]$Ex.Response.StatusCode } catch { }
    try { return $Ex.Response.StatusCode.value__ } catch { }
    return 0
}

function Get-ResponseBody ([System.Exception]$Ex) {
    try {
        $stream = $Ex.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        return $reader.ReadToEnd()
    } catch { }
    return ''
}

function Get-RowCount ([object]$Resp) {
    if ($null -eq $Resp)         { return 0 }
    if ($Resp -is [array])       { return $Resp.Count }
    if ($Resp -is [System.Collections.IList]) { return $Resp.Count }
    return 1
}

# ---------- load .env.local ---------------------------------------------------

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath  = Join-Path $repoRoot '.env.local'

if (-not (Test-Path $envPath)) {
    Write-Host ""
    Write-Host "ERROR: .env.local not found." -ForegroundColor Red
    Write-Host "  Expected : $envPath" -ForegroundColor Yellow
    Write-Host "  Fix      : Copy-Item .env.example .env.local" -ForegroundColor Yellow
    Write-Host "             then fill in your Supabase URL and keys." -ForegroundColor Yellow
    exit 1
}

foreach ($line in (Get-Content $envPath)) {
    if ($line -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$') {
        [System.Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}

# ---------- validate required vars --------------------------------------------

$SUPABASE_URL      = [System.Environment]::GetEnvironmentVariable('SUPABASE_URL',           'Process')
$SUPABASE_ANON_KEY = [System.Environment]::GetEnvironmentVariable('SUPABASE_ANON_KEY',      'Process')
$CAMPAIGN_TABLE    = [System.Environment]::GetEnvironmentVariable('CAMPAIGN_TABLE',          'Process')
$ATTACKER_JWT      = [System.Environment]::GetEnvironmentVariable('SUPABASE_ATTACKER_JWT',  'Process')
$RECRUITER_JWT     = [System.Environment]::GetEnvironmentVariable('SUPABASE_RECRUITER_JWT', 'Process')

if (-not $SUPABASE_URL) {
    Write-Host "ERROR: SUPABASE_URL missing from .env.local" -ForegroundColor Red
    Write-Host "  Get it: Supabase Dashboard -> Settings -> API -> Project URL" -ForegroundColor Yellow
    exit 1
}
if (-not $SUPABASE_ANON_KEY) {
    Write-Host "ERROR: SUPABASE_ANON_KEY missing from .env.local" -ForegroundColor Red
    Write-Host "  Get it: Supabase Dashboard -> Settings -> API -> anon public key" -ForegroundColor Yellow
    Write-Host "  NOTE  : use the anon key, NOT the service_role key." -ForegroundColor Yellow
    exit 1
}
if (-not $CAMPAIGN_TABLE) { $CAMPAIGN_TABLE = 'campaign_candidates' }

$BASE       = $SUPABASE_URL.TrimEnd('/')
$READ_URI   = "$BASE/rest/v1/$CAMPAIGN_TABLE" + '?select=*'
$INSERT_URI = "$BASE/rest/v1/$CAMPAIGN_TABLE"
$KEY_HINT   = $SUPABASE_ANON_KEY.Substring(0, [Math]::Min(12, $SUPABASE_ANON_KEY.Length)) + '...'

Write-Host ""
Write-Host "======  Sprint 0 - Step 3: Verify RLS  ======" -ForegroundColor Cyan
Write-Host "  Project URL : $BASE"        -ForegroundColor Gray
Write-Host "  Table       : $CAMPAIGN_TABLE"  -ForegroundColor Gray
Write-Host "  Anon key    : $KEY_HINT"    -ForegroundColor Gray

$passed  = 0
$failed  = 0
$skipped = 0

# ---------- T1 : anon read ----------------------------------------------------

Write-Head "T1 - Anon read (no user JWT) must return empty"
try {
    $h    = @{ apikey = $SUPABASE_ANON_KEY; Authorization = "Bearer $SUPABASE_ANON_KEY" }
    $resp = Invoke-RestMethod -Uri $READ_URI -Method Get -Headers $h
    $n    = Get-RowCount $resp
    if ($n -eq 0) {
        Write-Pass "Returned empty array - RLS is blocking anon reads."
        $passed++
    } else {
        Write-Fail "Returned $n row(s) - RLS is NOT blocking anon reads!"
        Write-Info "Response: $(Get-Snippet $resp)"
        $failed++
    }
} catch {
    $code = Get-HttpStatus $_.Exception
    if ($code -eq 401 -or $code -eq 403) {
        Write-Pass "HTTP $code - anon reads are blocked."
        $passed++
    } else {
        Write-Fail "Unexpected error (HTTP $code): $($_.Exception.Message)"
        Write-Info "Tip: verify SUPABASE_URL and SUPABASE_ANON_KEY have no extra spaces or quotes."
        $failed++
    }
}

# ---------- T2 : attacker JWT read --------------------------------------------

Write-Head "T2 - Attacker JWT read must return empty"
if (-not $ATTACKER_JWT) {
    Write-Skip "SUPABASE_ATTACKER_JWT not set in .env.local - skipping T2."
    $skipped++
} else {
    try {
        $h    = @{ apikey = $SUPABASE_ANON_KEY; Authorization = "Bearer $ATTACKER_JWT" }
        $resp = Invoke-RestMethod -Uri $READ_URI -Method Get -Headers $h
        $n    = Get-RowCount $resp
        if ($n -eq 0) {
            Write-Pass "Returned empty array - attacker JWT cannot read rows."
            $passed++
        } else {
            Write-Fail "Returned $n row(s) - attacker JWT CAN read rows!"
            Write-Info "Response: $(Get-Snippet $resp)"
            $failed++
        }
    } catch {
        $code = Get-HttpStatus $_.Exception
        if ($code -eq 401 -or $code -eq 403) {
            Write-Pass "HTTP $code - attacker JWT is blocked."
            $passed++
        } else {
            Write-Fail "Unexpected error (HTTP $code): $($_.Exception.Message)"
            $failed++
        }
    }
}

# ---------- T3 : attacker INSERT ----------------------------------------------

Write-Head "T3 - Attacker INSERT must be blocked"
if (-not $ATTACKER_JWT) {
    Write-Skip "SUPABASE_ATTACKER_JWT not set in .env.local - skipping T3."
    $skipped++
} else {
    $payload = '{"full_name":"RLS-Test-Probe","email":"rls_probe@example.com","screening_score":0}'
    $h = @{
        apikey           = $SUPABASE_ANON_KEY
        Authorization    = "Bearer $ATTACKER_JWT"
        'Content-Type'   = 'application/json'
    }
    try {
        $resp = Invoke-RestMethod -Uri $INSERT_URI -Method Post -Headers $h -Body $payload
        Write-Fail "INSERT succeeded - block_client_insert policy is missing or wrong!"
        Write-Info "Response: $(Get-Snippet $resp)"
        $failed++
    } catch {
        $code    = Get-HttpStatus $_.Exception
        $bodyStr = ''
        # PS 7+: ErrorDetails is available on the error record
        if ($_.ErrorDetails) { $bodyStr = "$($_.ErrorDetails.Message)" }
        # PS 5.1 fallback: read the response stream
        if (-not $bodyStr) { $bodyStr = Get-ResponseBody $_.Exception }

        if ($code -eq 403 -or $code -eq 422 -or $bodyStr -match '42501') {
            Write-Pass "HTTP $code - RLS blocked the INSERT (policy violation confirmed)."
            if ($bodyStr) {
                $preview = $bodyStr.Substring(0, [Math]::Min(200, $bodyStr.Length))
                Write-Info "Body: $preview"
            }
            $passed++
        } else {
            Write-Fail "Unexpected response (HTTP $code): $($_.Exception.Message)"
            Write-Info "Body: $bodyStr"
            $failed++
        }
    }
}

# ---------- T4 : recruiter JWT read -------------------------------------------

Write-Head "T4 - Recruiter JWT read must return data"
if (-not $RECRUITER_JWT) {
    Write-Skip "SUPABASE_RECRUITER_JWT not set in .env.local - skipping T4."
    $skipped++
} else {
    try {
        $h    = @{ apikey = $SUPABASE_ANON_KEY; Authorization = "Bearer $RECRUITER_JWT" }
        $resp = Invoke-RestMethod -Uri $READ_URI -Method Get -Headers $h
        $n    = Get-RowCount $resp
        if ($n -gt 0) {
            Write-Pass "Returned $n row(s) - recruiter JWT has correct read access."
            $passed++
        } else {
            Write-Fail "Returned empty - recruiter JWT is blocked (policy misconfigured)."
            Write-Info "Tip: confirm the USING expression email matches exactly (case-sensitive)."
            $failed++
        }
    } catch {
        $code = Get-HttpStatus $_.Exception
        Write-Fail "Recruiter read threw an error (HTTP $code) - policy misconfigured."
        Write-Info "Error: $($_.Exception.Message)"
        $failed++
    }
}

# ---------- summary -----------------------------------------------------------

Write-Host ""
Write-Host "==============================================" -ForegroundColor Gray
$total = $passed + $failed + $skipped
if ($failed -eq 0 -and $skipped -eq 0) {
    Write-Host "  $passed/$total PASS - All RLS checks passed!" -ForegroundColor Green
} elseif ($failed -eq 0) {
    Write-Host "  $passed PASS  |  $skipped SKIPPED" -ForegroundColor Yellow
    Write-Host "  Add the missing JWTs to .env.local for full T2/T3/T4 coverage." -ForegroundColor Yellow
} else {
    Write-Host "  $passed PASS  |  $failed FAIL  |  $skipped SKIPPED" -ForegroundColor Red
    Write-Host "  Review the FAIL output above and re-check the SQL from Step 1." -ForegroundColor Red
}
Write-Host "==============================================" -ForegroundColor Gray
Write-Host ""

if ($failed -gt 0) { exit 1 } else { exit 0 }
