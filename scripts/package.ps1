param(
  [string]$Output = (Join-Path (Split-Path $PSScriptRoot -Parent) "tmp\cdlatam_deploy.tar.gz")
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$tmpDir = Split-Path $Output -Parent

if (-not (Test-Path $tmpDir)) {
  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
}

$dbFile = Join-Path $root "gestion.db"
$clausesDir = Join-Path $root "data\clauses"

if (-not (Test-Path $dbFile)) { Write-Host "ERROR: No se encuentra gestion.db en $root"; exit 1 }
if (-not (Test-Path $clausesDir)) { Write-Host "ERROR: No se encuentra data/clauses/ en $root"; exit 1 }

Write-Host "Empaquetando gestion.db + data/clauses/ ..."
& "C:\Windows\system32\tar.exe" -czf $Output -C $root "gestion.db" "data\clauses"

if ($LASTEXITCODE -eq 0) {
  $size = "{0:N2}" -f ((Get-Item $Output).Length / 1MB)
  Write-Host "OK: $Output ($size MB)"
  Write-Host ""
  $answer = Read-Host "Enviar al VPS ahora? (s/n)"
  if ($answer -eq "s") {
    scp $Output root@trapemn-opt-pe-02:/home/trapemn/cdlatam_webform/tmp/
    if ($LASTEXITCODE -eq 0) {
      Write-Host "Enviado! En el VPS: bash scripts/deploy.sh"
    } else {
      Write-Host "ERROR: no se pudo enviar. Hacelo manual:"
      Write-Host "  scp $Output root@trapemn-opt-pe-02:/home/trapemn/cdlatam_webform/tmp/"
    }
  } else {
    Write-Host "Enviá manual con:"
    Write-Host "  scp $Output root@trapemn-opt-pe-02:/home/trapemn/cdlatam_webform/tmp/"
  }
} else {
  Write-Host "ERROR: fallo al crear el paquete"
  exit 1
}
