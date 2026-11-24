# Servidor de la comunidad en tu PC, para probar el aviso de actualizar desde el móvil en la red de casa.
# Uso (desde la carpeta server):  .\local\servidor.ps1 -Tipo grande
# Tipos: pequena, grande, rota, ninguno. Para pararlo: Ctrl+C.
param(
    [ValidateSet('pequena', 'grande', 'rota', 'ninguno')] [string] $Tipo = 'pequena',
    [int] $Puerto = 8080
)
$ErrorActionPreference = 'Stop'
$php = 'C:\xampp\php\php.exe'
$server = Split-Path -Parent $PSScriptRoot
& $php (Join-Path $PSScriptRoot 'preparar.php') $Tipo
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
Write-Host ''
Write-Host "Servidor en http://${ip}:$Puerto  (prueba: http://${ip}:$Puerto/estado.php)"
Write-Host "Para el juego:  `$env:VITE_COMMUNITY_URL = 'http://${ip}:$Puerto'"
Write-Host ''
& $php -S "0.0.0.0:$Puerto" -t (Join-Path $server 'public')
