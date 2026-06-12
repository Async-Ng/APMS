# Show Vertex AI quota limits relevant to APMS (50 users).
param(
  [string]$ProjectId = "ordinal-algebra-498802-q6",
  [string]$Region = "asia-southeast1"
)

$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$token = & $gcloud auth print-access-token
$base = "https://cloudquotas.googleapis.com/v1/projects/$ProjectId/locations/global/services/aiplatform.googleapis.com/quotaInfos"

function Show-Limit($quotaId, $dimensions) {
  $info = Invoke-RestMethod -Uri "$base/$quotaId" -Headers @{ Authorization = "Bearer $token" }
  $match = $info.dimensionsInfos | Where-Object {
    $ok = $true
    foreach ($k in $dimensions.Keys) {
      if ($_.dimensions.$k -ne $dimensions[$k]) { $ok = $false }
    }
    $ok
  } | Select-Object -First 1
  $val = if ($match) { $match.details.value } else { "(not listed / uses DSQ)" }
  Write-Host "$quotaId"
  Write-Host "  dims: $($dimensions | ConvertTo-Json -Compress) => $val"
}

Write-Host "APMS Vertex AI quotas ($ProjectId, $Region)`n" -ForegroundColor Cyan
Show-Limit "EmbedContentInputTokensPerMinutePerRegionPerBaseModel" @{
  region = $Region; base_model = "gemini-embedding"
}
Show-Limit "OnlinePredictionRequestsPerMinutePerProjectPerRegion" @{ region = $Region }
Show-Limit "GenerateContentRequestsPerMinutePerProjectPerRegionPerBaseModel" @{
  region = $Region; base_model = "gemini-2.5-flash"
}
Write-Host "`nNote: gemini-2.5-flash may use Dynamic Shared Quota instead of fixed regional RPM."
