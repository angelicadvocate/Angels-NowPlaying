; Angels NowPlaying — NSIS installer hooks
;
; Registered via `bundle.windows.nsis.installerHooks` in tauri.conf.json.
; Supported Tauri hooks: NSIS_HOOK_PREINSTALL, NSIS_HOOK_POSTINSTALL,
; NSIS_HOOK_PREUNINSTALL, NSIS_HOOK_POSTUNINSTALL.

; ----------------------------------------------------------------------------
; POSTUNINSTALL — user-data notice
;
; Angels NowPlaying stores installed overlays, custom fonts, and preferences
; under %APPDATA%\Roaming\AngelsNowPlaying (outside of Tauri's bundle-id
; path, so the built-in "Delete the application data" checkbox does NOT
; remove them).
;
; We intentionally do NOT delete this folder from the uninstaller, even when
; the checkbox is ticked. Automatic deletion would destroy a user's library
; of installed overlays — including any paid overlays from the community
; store — on a single misclick. Instead, we surface a message explaining
; what was preserved and how to remove it manually if that is what the user
; actually wants.
;
; The message is suppressed in silent and passive installs so scripted and
; CI uninstalls are unaffected.
; ----------------------------------------------------------------------------
!macro NSIS_HOOK_POSTUNINSTALL
  ; Skip entirely for silent / passive / update-mode uninstalls so scripted
  ; and CI uninstalls are unaffected. ${Silent} is a LogicLib test symbol
  ; (expands to IfSilent) and cannot be combined with other conditions via
  ; ${AndIf}, so we gate it with a separate ${IfNot} ${Silent} block.
  ${IfNot} ${Silent}
    ${If} $DeleteAppDataCheckboxState = 1
    ${AndIf} $UpdateMode <> 1
    ${AndIf} $PassiveMode <> 1
      SetShellVarContext current
      MessageBox MB_OK|MB_ICONINFORMATION "Your Angels NowPlaying data has been preserved.$\r$\n$\r$\nTo protect your installed overlays (including any paid overlays) and your preferences, this uninstaller does NOT delete your overlay library.$\r$\n$\r$\nIf you want to remove everything, delete this folder manually:$\r$\n$\r$\n$APPDATA\AngelsNowPlaying$\r$\n$\r$\nWarning: this will permanently delete all installed overlays, custom fonts, and settings. Back up anything you want to keep before deleting."
    ${EndIf}
  ${EndIf}
!macroend
