# check-sac.ps1
# Verifica o estado do Windows Smart App Control.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/check-sac.ps1

$sac = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy" -Name VerifiedAndReputablePolicyState -ErrorAction SilentlyContinue

if (-not $sac) {
    Write-Host "Smart App Control: nao encontrado (possivelmente nao suportado neste Windows)." -ForegroundColor Yellow
    exit 2
}

switch ($sac.VerifiedAndReputablePolicyState) {
    0 { Write-Host "Smart App Control: DESATIVADO." -ForegroundColor Green }
    1 { Write-Host "Smart App Control: em modo de avaliacao." -ForegroundColor Yellow }
    2 { Write-Host "Smart App Control: ATIVADO." -ForegroundColor Red }
    default { Write-Host "Smart App Control: estado desconhecido ($($sac.VerifiedAndReputablePolicyState))." -ForegroundColor Yellow }
}