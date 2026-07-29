$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$Backend = Join-Path $ProjectRoot "backend"

if (!(Test-Path $Backend)) {
    Write-Host ""
    Write-Host "Pasta backend nao encontrada."
    Read-Host
    exit
}

$Temp = Join-Path $env:TEMP "AlePejoERP_Backend_DEV"

if (Test-Path $Temp) {
    Remove-Item $Temp -Recurse -Force
}

New-Item -ItemType Directory -Path $Temp | Out-Null

Copy-Item "$Backend\src" "$Temp\" -Recurse
Copy-Item "$Backend\prisma" "$Temp\" -Recurse

$Arquivos = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "nest-cli.json",
    ".env.example"
)

foreach ($Arquivo in $Arquivos) {
    $Origem = Join-Path $Backend $Arquivo

    if (Test-Path $Origem) {
        Copy-Item $Origem $Temp
    }
}

$Destino = Join-Path $ProjectRoot "Backend-DEV.zip"

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
Write-Host " BACKEND-DEV.ZIP GERADO COM SUCESSO"
Write-Host "========================================="
Write-Host ""
Write-Host $Destino
Write-Host ""

Read-Host "Pressione ENTER para finalizar"