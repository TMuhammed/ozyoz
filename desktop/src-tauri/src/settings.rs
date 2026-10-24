use ozyoz_core::ConversionOptions;
use ozyoz_input::{EngineOptions, Mode};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub enabled: bool,
    pub mode: String, // "immediate" | "wordBoundary"
    pub normalize_apostrophes: bool,
    pub excluded_apps: Vec<String>,
    pub launch_at_login: bool,
    pub first_run_done: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            enabled: true,
            mode: "immediate".into(),
            normalize_apostrophes: false,
            excluded_apps: default_exclusions(),
            launch_at_login: false,
            first_run_done: false,
        }
    }
}

/// Apps where converting keystrokes is almost always wrong: terminals, IDEs,
/// password managers. Users can edit the list.
fn default_exclusions() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        vec![
            "Terminal.app", "iTerm.app", "iTerm2.app", "Warp.app", "Ghostty.app", "Alacritty.app", "kitty.app",
            "Xcode.app", "Visual Studio Code.app", "Cursor.app", "IntelliJ IDEA.app", "WebStorm.app", "PyCharm.app",
            "1Password.app", "Bitwarden.app", "KeePassXC.app",
        ]
        .into_iter().map(String::from).collect()
    }
    #[cfg(target_os = "windows")]
    {
        vec![
            "windowsterminal.exe", "cmd.exe", "powershell.exe", "pwsh.exe", "wt.exe", "conhost.exe",
            "code.exe", "cursor.exe", "idea64.exe", "webstorm64.exe", "pycharm64.exe", "devenv.exe",
            "1password.exe", "bitwarden.exe", "keepassxc.exe",
        ]
        .into_iter().map(String::from).collect()
    }
    #[cfg(target_os = "linux")]
    {
        vec![
            "gnome-terminal", "konsole", "xterm", "alacritty", "kitty", "tilix", "terminator",
            "code", "cursor", "jetbrains-idea", "jetbrains-webstorm", "jetbrains-pycharm",
            "1password", "bitwarden", "keepassxc",
        ]
        .into_iter().map(String::from).collect()
    }
}

impl Settings {
    pub fn engine_options(&self) -> EngineOptions {
        EngineOptions {
            mode: if self.mode == "wordBoundary" { Mode::WordBoundary } else { Mode::Immediate },
            conversion: ConversionOptions { normalize_apostrophes: self.normalize_apostrophes, protect_urls: true },
        }
    }

    pub fn load(path: &Path) -> Self {
        std::fs::read_to_string(path).ok().and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
    }

    pub fn save(&self, path: &Path) -> Result<(), String> {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(path, json).map_err(|e| e.to_string())
    }
}

pub fn settings_path(config_dir: PathBuf) -> PathBuf {
    config_dir.join("settings.json")
}
