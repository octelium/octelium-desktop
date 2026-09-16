!macro NSIS_HOOK_PREINSTALL
  ${If} ${FileExists} "$INSTDIR\install-daemon.ps1"
    nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\install-daemon.ps1" -Action Stop'
    Pop $0
    Pop $1
    ${If} $0 != 0
      DetailPrint "$1"
      Abort
    ${EndIf}
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\install-daemon.ps1" -Action Install -ExecutablePath "$INSTDIR\octelium-desktop-daemon.exe"'
  Pop $0
  Pop $1
  ${If} $0 != 0
    DetailPrint "$1"
    Abort
  ${EndIf}
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$INSTDIR\install-daemon.ps1" -Action Uninstall'
  Pop $0
  Pop $1
  ${If} $0 != 0
    DetailPrint "$1"
    Abort
  ${EndIf}
!macroend
