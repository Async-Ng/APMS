# Request Vertex AI quota increases for APMS (~50 daily users: chat + upload/embed).
# Usage: .\scripts\request-vertex-quotas-50users.ps1
# Track: https://console.cloud.google.com/iam-admin/quotas/increase-requests

param(
  [string]$ProjectId = "ordinal-algebra-498802-q6",
  [string]$Region = "asia-southeast1",
  [string]$ContactEmail = "truongnnse182324@fpt.edu.vn",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) { throw "gcloud not found" }

$justification = @"
APMS (Academic Paper Management System) - FPT University WDP301.
Up to 50 daily active users: RAG chat (50 msgs/user/day max) + document upload/re-embed.
Peak: 50 concurrent chat + worker embedding (~300 RPM with 200ms throttle).
Request headroom for class demos and bulk re-index.
"@.Trim()

# Correct Cloud Quotas API quotaId values (see scripts/check-vertex-quota-limits.ps1)
$quotaRequests = @(
  @{
    Id = "EmbedContentInputTokensPerMinutePerRegionPerBaseModel"
    Value = 2000000
    Dimensions = @{ region = $Region; base_model = "gemini-embedding" }
    Suffix = "embed-tokens"
    Note = "gemini-embedding-001 TPM (current default often 1M)"
  },
  @{
    Id = "GenerateContentInputTokensPerMinutePerRegionPerBaseModel"
    Value = 8000000
    Dimensions = @{ region = $Region; base_model = "gemini-2.5-flash" }
    Suffix = "chat-tokens"
    Note = "Chat input TPM if regional quota applies"
  },
  @{
    Id = "GenerateContentRequestsPerMinutePerProjectPerRegionPerBaseModel"
    Value = 600
    Dimensions = @{ region = $Region; base_model = "gemini-2.5-flash" }
    Suffix = "chat-rpm"
    Note = "Chat RPM if regional quota applies"
  }
)

Write-Host "=== APMS Vertex AI quota requests (50 users) ===" -ForegroundColor Cyan
Write-Host "Project: $ProjectId | Region: $Region"
Write-Host ""

& $gcloud services enable cloudquotas.googleapis.com --project=$ProjectId | Out-Null
$token = & $gcloud auth print-access-token
$baseUrl = "https://cloudquotas.googleapis.com/v1/projects/$ProjectId/locations/global"

function Get-CurrentLimit($quotaId, $dimensions) {
  $info = Invoke-RestMethod -Uri "$baseUrl/services/aiplatform.googleapis.com/quotaInfos/$quotaId" -Headers @{ Authorization = "Bearer $token" }
  $match = $info.dimensionsInfos | Where-Object {
    $ok = $true
    foreach ($k in $dimensions.Keys) {
      if ($_.dimensions.$k -ne $dimensions[$k]) { $ok = $false }
    }
    $ok
  } | Select-Object -First 1
  if ($match) { return $match.details.value }
  return $null
}

function New-QuotaPreference($quotaId, $value, $dimensions, $suffix) {
  $dimObj = @{}
  foreach ($k in $dimensions.Keys) { $dimObj[$k] = $dimensions[$k] }

  $body = @{
    quotaConfig = @{ preferredValue = $value }
    quotaId = $quotaId
    service = "aiplatform.googleapis.com"
    dimensions = $dimObj
    contactEmail = $ContactEmail
    justification = $justification
  } | ConvertTo-Json -Depth 5

  $prefId = "apms-50users-$suffix"
  $uri = "$baseUrl/quotaPreferences?quotaPreferenceId=$prefId"

  if ($DryRun) {
    Write-Host "[DRY RUN] POST $prefId -> $value" -ForegroundColor Yellow
    return $null
  }

  try {
    return Invoke-RestMethod -Method POST -Uri $uri -Headers @{
      Authorization = "Bearer $token"
      "Content-Type" = "application/json"
    } -Body $body
  } catch {
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $detail = $reader.ReadToEnd()
    Write-Host "FAILED: $quotaId" -ForegroundColor Red
    Write-Host $detail
    return $null
  }
}

$ok = 0
$i = 0
foreach ($req in $quotaRequests) {
  $i++
  Write-Host "($i of $($quotaRequests.Count)) $($req.Note)" -ForegroundColor Green
  Write-Host "  $($req.Id) -> $($req.Value)"

  $current = Get-CurrentLimit $req.Id $req.Dimensions
  if ($null -ne $current) {
    Write-Host "  Current limit: $current" -ForegroundColor DarkGray
    if ([int64]$current -ge [int64]$req.Value) {
      Write-Host "  SKIP: already at or above target" -ForegroundColor Yellow
      Write-Host ""
      continue
    }
  } else {
    Write-Host "  Current limit: (no matching dimension - may use Dynamic Shared Quota)" -ForegroundColor DarkGray
  }

  $res = New-QuotaPreference $req.Id $req.Value $req.Dimensions $req.Suffix
  if ($res) {
    Write-Host "  Submitted: $($res.name) reconciling=$($res.reconciling)" -ForegroundColor Cyan
    $ok++
  }
  Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Submitted: $ok request(s)"
Write-Host "Online prediction RPM (asia-southeast1): default ~30,000 - sufficient for 50 users."
Write-Host "gemini-2.5-flash chat: Dynamic Shared Quota (TPM tiers) - model fallbacks in gemini.provider.ts"
Write-Host "Increase requests: https://console.cloud.google.com/iam-admin/quotas/increase-requests?project=$ProjectId"
Write-Host "Enable Quota Adjuster in Console: IAM Admin -> Quotas -> Quota adjuster -> Vertex AI API"
