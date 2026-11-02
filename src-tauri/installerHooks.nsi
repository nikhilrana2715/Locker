!include "LogicLib.nsh"
!include "nsDialogs.nsh"

Var Dialog
Var CheckboxDesktop
Var CreateDesktopIconState

Function ShowCustomShortcutPage
  !insertmacro MUI_HEADER_TEXT "Select Additional Tasks" "Choose which additional tasks you would like Setup to perform."
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Additional shortcuts:"
  Pop $0

  ${NSD_CreateCheckbox} 10u 25u 100% 12u "Create a &desktop shortcut"
  Pop $CheckboxDesktop
  ${NSD_SetState} $CheckboxDesktop 1

  nsDialogs::Show
FunctionEnd

Function LeaveCustomShortcutPage
  ${NSD_GetState} $CheckboxDesktop $CreateDesktopIconState
FunctionEnd

!macro customHeader
!macroend

!macro customPage
  Page custom ShowCustomShortcutPage LeaveCustomShortcutPage
!macroend

!macro customInstall
  ${If} $CreateDesktopIconState == 1
    CreateShortCut "$DESKTOP\Quick Lock.lnk" "$INSTDIR\quick-lock.exe" "" "$INSTDIR\quick-lock.exe" 0
  ${Else}
    Delete "$DESKTOP\Quick Lock.lnk"
  ${EndIf}
!macroend
