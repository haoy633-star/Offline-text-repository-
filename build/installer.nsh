!macro customInit
  ${If} $hasPerMachineInstallation == "1"
  ${OrIf} $hasPerUserInstallation == "1"
    DetailPrint "Upgrading existing Offline Library installation..."
    ${IfNot} ${Silent}
      MessageBox MB_ICONINFORMATION|MB_OK "检测到电脑上已经安装过 Offline Library。安装器将升级旧版本，并自动关闭正在运行的旧程序。$\r$\n$\r$\nExisting Offline Library installation detected. This installer will upgrade the old version and close the running app if needed."
    ${EndIf}
  ${EndIf}
  nsExec::ExecToLog 'taskkill /IM "Offline Library.exe" /T /F'
!macroend
