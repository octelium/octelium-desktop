param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Install", "Stop", "Uninstall")]
    [string]$Action,

    [string]$ExecutablePath
)

$ErrorActionPreference = "Stop"
$InstallerLogDir = Join-Path ([Environment]::GetFolderPath("CommonApplicationData")) "Octelium Desktop"
$InstallerLogPath = Join-Path $InstallerLogDir "installer-error.log"
New-Item -ItemType Directory -Path $InstallerLogDir -Force | Out-Null
trap {
    $_ | Format-List * -Force | Out-File -LiteralPath $InstallerLogPath -Force
    exit 1
}

$ServiceName = "OcteliumDaemon"

function Wait-ServiceDeletion {
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        & sc.exe query $ServiceName 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 1060) {
            return
        }
        Start-Sleep -Milliseconds 500
    }
    throw "Timed out deleting the Octelium Desktop daemon service"
}

$Service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue

if ($null -ne $Service -and $Service.Status -ne "Stopped") {
    Stop-Service -Name $ServiceName -Force
    $Service.WaitForStatus("Stopped", [TimeSpan]::FromSeconds(30))
}

if ($Action -eq "Stop") {
    exit 0
}

if ($Action -eq "Uninstall") {
    if ($null -eq $Service) {
        exit 0
    }

    $Service.Dispose()
    $Service = $null
    & sc.exe delete $ServiceName | Out-Null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1072) {
        throw "Could not delete the Octelium Desktop daemon service"
    }
    Wait-ServiceDeletion
    exit 0
}

$ExecutablePath = [System.IO.Path]::GetFullPath($ExecutablePath)
if (-not (Test-Path -LiteralPath $ExecutablePath -PathType Leaf)) {
    throw "The Octelium Desktop daemon executable does not exist"
}

$StatePath = Join-Path ([Environment]::GetFolderPath("CommonApplicationData")) "Octelium Desktop\daemon-state"
New-Item -ItemType Directory -Path $StatePath -Force | Out-Null
$BinaryPath = '"' + $ExecutablePath + '" --homedir "' + $StatePath + '" daemon'
if ($null -ne $Service) {
    $Service.Dispose()
    $Service = $null
    & sc.exe delete $ServiceName | Out-Null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1072) {
        throw "Could not replace the Octelium Desktop daemon service (sc.exe exit code $LASTEXITCODE)"
    }
}
Wait-ServiceDeletion
New-Service -Name $ServiceName -BinaryPathName $BinaryPath -DisplayName "Octelium Desktop Daemon" -Description "Runs the privileged daemon used by Octelium Desktop" -StartupType Automatic | Out-Null

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
