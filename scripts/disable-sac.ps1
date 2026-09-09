# disable-sac.ps1
# Desativa o Windows Smart App Control para permitir a execucao de binarios
# nao assinados (ou assinados com certificado local) durante o desenvolvimento.
#
# ATENCAO: requer execucao como Administrador. Use com criterio.
# Uso: powershell -ExecutionPolicy Bypass -File scripts/disable-sac.ps1

#Requires -RunAsAdministrator

$sac = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy" -Name VerifiedAndReputablePolicyState -ErrorAction SilentlyContinue

if (-not $sac) {
    Write-Host "Smart App Control nao encontrado. Nada a fazer." -ForegroundColor Yellow
    exit 0
}

if ($sac.VerifiedAndReputablePolicyState -eq 0) {
    Write-Host "Smart App Control ja esta desativado." -ForegroundColor Green
    exit 0
}

Write-Host "Desativando Smart App Control..." -ForegroundColor Cyan
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\CI\Policy" -Name VerifiedAndReputablePolicyState -Value 0 -Type DWord

Write-Host "Smart App Control desativado. Reinicie o PC para aplicar." -ForegroundColor Green