$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $ProjectRoot "frontend"

if (!(Test-Path $frontend)) {
    Write-Host ""
    Write-Host "Pasta frontend nao encontrada."
    Read-Host
    exit
}

$Temp = Join-Path $env:TEMP "AlePejoERP_frontend_DEV"

if (Test-Path $Temp) {
    Remove-Item $Temp -Recurse -Force
}

New-Item -ItemType Directory -Path $Temp | Out-Null

Copy-Item "$frontend\src" "$Temp\" -Recurse

$Arquivos = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json"
)

foreach ($Arquivo in $Arquivos) {
    $Origem = Join-Path $frontend $Arquivo

    if (Test-Path $Origem) {
        Copy-Item $Origem $Temp
    }
}

$Destino = Join-Path $ProjectRoot "frontend-DEV.zip"

if (Test-Path $Destino) {
    Remove-Item $Destino -Force
}

Compress-Archive `
    -Path "$Temp\*" `
    -DestinationPath $Destino `
    -CompressionLevel Optimal

Remove-Item $Temp -Recurse -Force

Write-Host ""
Write-Host "========================================="
Write-Host " FRONTEND-DEV.ZIP GERADO COM SUCESSO"
Write-Host "========================================="
Write-Host ""
Write-Host $Destino
Write-Host ""

Read-Host "Pressione ENTER para finalizar"