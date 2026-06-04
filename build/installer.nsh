; Windows NSIS 安装器自定义脚本：Mac 适配不用这份，Mac 打包要改 electron-builder 的 mac 配置。
!macro customInit
  ${If} $hasPerMachineInstallation == "1"
  ${OrIf} $hasPerUserInstallation == "1"
    DetailPrint "Existing Offline Library installation detected. Upgrading in place..."
  ${EndIf}
  nsExec::ExecToLog 'taskkill /IM "Offline Library.exe" /T /F'
!macroend
