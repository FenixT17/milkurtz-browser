# create-signing-cert.ps1
# Cria um certificado de assinatura de codigo local (para desenvolvimento)
# e o exporta como PFX em scripts/certs/milkurtz.pfx.
#
# Uso: powershell -ExecutionPolicy Bypass -File scripts/create-signing-cert.ps1

$ErrorActionPreference = "Stop"

$certsDir = Join-Path $PSScriptRoot "certs"
$pfxPath = Join-Path $certsDir "milkurtz.pfx"
$password = "milkurtz-dev"   # apenas para dev local; nao usar em producao

New-Item -ItemType Directory -Force -Path $certsDir | Out-Null

$cert = New-SelfSignedCertificate `
    -Subject "CN=Milkurtz Browser (Dev)" `
    -Type CodeSigningCert `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(3)

Export-PfxCertificate `
    -Cert $cert `
    -FilePath $pfxPath `
    -Password (ConvertTo-SecureString $password -AsPlainText -Force) | Out-Null

Write-Host "Certificado criado: $pfxPath" -ForegroundColor Green
Write-Host "Thumbprint: $($cert.Thumbprint)" -ForegroundColor Cyan
Write-Host "Para assinar o executavel use signtool.exe com este PFX." -ForegroundColor Yellow