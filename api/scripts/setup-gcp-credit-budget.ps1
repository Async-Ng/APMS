# Thiết lập GCP Billing Budget — cảnh báo khi dùng >90% credit Google.
# Usage (PowerShell):
#   $env:GCP_CREDIT_BUDGET_VND = "7500000"   # chỉnh theo số credit thực tế
#   .\scripts\setup-gcp-credit-budget.ps1

param(
  [string]$BillingAccount = "0155A4-CFE75B-753501",
  [string]$ProjectId = "ordinal-algebra-498802-q6",
  [string]$BudgetAmountVnd = $(if ($env:GCP_CREDIT_BUDGET_VND) { $env:GCP_CREDIT_BUDGET_VND } else { "7900051" }),
  [string]$DisplayName = "APMS GCP Credits 90pct"
)

$gcloud = "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
if (-not (Test-Path $gcloud)) {
  Write-Error "gcloud CLI not found. Install Google Cloud SDK first."
  exit 1
}

Write-Host "Enabling billingbudgets.googleapis.com on $ProjectId..."
& $gcloud services enable billingbudgets.googleapis.com --project=$ProjectId

Write-Host "Creating budget: $DisplayName ($BudgetAmountVnd VND, alerts 50/90/100%)..."
& $gcloud billing budgets create `
  --billing-account=$BillingAccount `
  --display-name=$DisplayName `
  --budget-amount="${BudgetAmountVnd}VND" `
  --credit-types-treatment=exclude-all-credits `
  --filter-projects="projects/$ProjectId" `
  --threshold-rule=percent=50 `
  --threshold-rule=percent=90 `
  --threshold-rule=percent=100 `
  --calendar-period=YEAR

Write-Host ""
Write-Host "Done. Email alerts go to Billing Account Admin/User on this account."
Write-Host "Console: https://console.cloud.google.com/billing/budgets?project=$ProjectId"
Write-Host "Adjust GCP_CREDIT_BUDGET_VND if your Google credit amount differs (default 7,900,051 VND)."
