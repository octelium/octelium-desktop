param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Install", "Stop", "Uninstall")]
    [string]$Action,

    [string]$ExecutablePath
)

$ErrorActionPreference = "Stop"
$ServiceName = "OcteliumDaemon"
$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($null -ne $Service -and $Service.Status -ne "Stopped") {
    Stop-Service -Name $ServiceName -Force
    $Service.WaitForStatus("Stopped", [TimeSpan]::FromSeconds(30))
}

if ($Action -eq "Stop") {
    exit 0
}

if ($Action -eq "Uninstall") {
    if ($null -ne $Service) {
        & sc.exe delete $ServiceName | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Could not delete the Octelium Desktop daemon service"
        }
    }
    exit 0
}

$ExecutablePath = [System.IO.Path]::GetFullPath($ExecutablePath)
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    throw "The Octelium Desktop daemon executable does not exist"
}

$StatePath = Join-Path ([Environment]::GetFolderPath("CommonApplicationData")) "Octelium Desktop\daemon-state"
New-Item -ItemType Directory -Path $StatePath -Force | Out-Null
$BinaryPath = '"' + $ExecutablePath + '" --homedir "' + $StatePath + '" daemon'
if ($null -eq $Service) {
    New-Service -Name $ServiceName -BinaryPathName $BinaryPath -DisplayName "Octelium Desktop Daemon" -Description "Runs the privileged daemon used by Octelium Desktop" -StartupType Automatic | Out-Null
} else {
    & sc.exe config $ServiceName "binPath=" $BinaryPath "start=" "auto" "obj=" "LocalSystem" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not configure the Octelium Desktop daemon service"
    }
}

& sc.exe description $ServiceName "Runs the privileged daemon used by Octelium Desktop" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Could not set the Octelium Desktop daemon service description"
}
& sc.exe sidtype $ServiceName unrestricted | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Could not configure the Octelium Desktop daemon service SID"
}
& sc.exe failure $ServiceName "reset=" "86400" "actions=" "restart/5000/restart/5000/restart/5000" | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Could not configure the Octelium Desktop daemon recovery policy"
}

Start-Service -Name $ServiceName
