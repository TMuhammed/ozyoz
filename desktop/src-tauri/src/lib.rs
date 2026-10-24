mod settings;

use ozyoz_input::{Controller, HookState, Permission};
use serde::Serialize;
use settings::{settings_path, Settings};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder};
use tauri::{AppHandle, Emitter, Manager, State, WindowEvent};
use tauri_plugin_autostart::ManagerExt as _;

struct AppState {
    controller: Arc<Controller>,
    settings: Mutex<Settings>,
    settings_file: PathBuf,
    log_file: PathBuf,
    tray: Mutex<Option<TrayIcon>>,
    enabled_item: Mutex<Option<CheckMenuItem<tauri::Wry>>>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct Status {
    enabled: bool,
    paused_seconds_left: Option<u64>,
    permission: String,
    platform: String,
    current_app: Option<String>,
    converted_words: u64,
    events_seen: u64,
    hook: String,
    hook_detail: Option<String>,
    secure_input_app: Option<String>,
    log_file: String,
    rules_version: String,
    law_number: String,
    effective_on: String,
    law_url: String,
}

fn permission_str(p: Permission) -> &'static str {
    match p {
        Permission::Granted => "granted",
        Permission::Denied => "denied",
        Permission::NotRequired => "notRequired",
    }
}

#[tauri::command]
fn get_settings(state: State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[tauri::command]
fn set_settings(app: AppHandle, state: State<AppState>, settings: Settings) -> Result<Settings, String> {
    let mut s = settings;
    s.first_run_done = true;
    state.controller.set_enabled(s.enabled);
    state.controller.set_options(s.engine_options());
    state.controller.set_excluded_apps(s.excluded_apps.clone());
    let autostart = app.autolaunch();
    if s.launch_at_login {
        let _ = autostart.enable();
    } else {
        let _ = autostart.disable();
    }
    s.save(&state.settings_file)?;
    *state.settings.lock().unwrap() = s.clone();
    sync_tray(&state);
    let _ = app.emit("settings-changed", s.clone());
    Ok(s)
}

#[tauri::command]
fn get_status(state: State<AppState>) -> Status {
    let snap = state.controller.snapshot();
    let rules = ozyoz_core::ruleset();
    let (hook, hook_detail) = match snap.hook_state {
        HookState::Starting => ("starting", None),
        HookState::WaitingForPermission => ("waitingForPermission", None),
        HookState::Running => ("running", None),
        HookState::Failed(e) => ("failed", Some(e)),
    };
    Status {
        enabled: snap.enabled,
        paused_seconds_left: snap.paused_seconds_left,
        permission: permission_str(ozyoz_input::check_permission(false)).into(),
        platform: std::env::consts::OS.into(),
        current_app: snap.current_app,
        converted_words: snap.converted_words,
        events_seen: snap.events_seen,
        hook: hook.into(),
        hook_detail,
        secure_input_app: ozyoz_input::secure_input_blocker(),
        log_file: state.log_file.display().to_string(),
        rules_version: rules.version.clone(),
        law_number: rules.source.number.clone(),
        effective_on: rules.source.effective_on.clone(),
        law_url: rules.source.url.clone(),
    }
}

#[tauri::command]
fn request_permission() -> String {
    permission_str(ozyoz_input::check_permission(true)).into()
}

#[tauri::command]
fn pause(state: State<AppState>, minutes: u64) {
    state.controller.pause_for(Duration::from_secs(minutes * 60));
}

#[tauri::command]
fn resume(state: State<AppState>) {
    state.controller.resume();
}

#[tauri::command]
fn convert_preview(text: String, state: State<AppState>) -> String {
    let opts = state.settings.lock().unwrap().engine_options().conversion;
    ozyoz_core::convert_text(&text, opts).text
}

fn toggle_enabled(app: &AppHandle) {
    let state = app.state::<AppState>();
    let next = {
        let mut s = state.settings.lock().unwrap();
        s.enabled = !s.enabled;
        let _ = s.save(&state.settings_file);
        s.clone()
    };
    state.controller.set_enabled(next.enabled);
    sync_tray(&state);
    let _ = app.emit("settings-changed", next);
}

fn sync_tray(state: &AppState) {
    let enabled = state.settings.lock().unwrap().enabled;
    if let Some(item) = state.enabled_item.lock().unwrap().as_ref() {
        let _ = item.set_checked(enabled);
    }
    if let Some(tray) = state.tray.lock().unwrap().as_ref() {
        let _ = tray.set_tooltip(Some(if enabled { "Özyoz — faol" } else { "Özyoz — öçirilgan" }));
    }
}

fn show_main(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("main") {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

fn init_logging(log_dir: &std::path::Path) -> PathBuf {
    let _ = std::fs::create_dir_all(log_dir);
    let path = log_dir.join("ozyoz.log");
    let mut builder = env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"));
    if let Ok(file) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
        builder.target(env_logger::Target::Pipe(Box::new(file)));
    }
    let _ = builder.try_init();
    log::info!("Özyoz {} starting", env!("CARGO_PKG_VERSION"));
    path
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .setup(|app| {
            let config_dir = app.path().app_config_dir().expect("config dir");
            let log_file = init_logging(&app.path().app_log_dir().unwrap_or_else(|_| config_dir.clone()));
            let settings_file = settings_path(config_dir);
            let settings = Settings::load(&settings_file);

            let controller = Arc::new(Controller::new(settings.engine_options()));
            controller.set_enabled(settings.enabled);
            controller.set_excluded_apps(settings.excluded_apps.clone());
            if let Err(e) = ozyoz_input::start(controller.clone()) {
                log::error!("could not start input hook: {e}");
            }

            // Tray menu (new alphabet in the UI, as everywhere else).
            let enabled_item = CheckMenuItem::with_id(app, "enabled", "Avtomatik ötkaziş", true, settings.enabled, None::<&str>)?;
            let pause15 = MenuItem::with_id(app, "pause15", "15 daqiqa pauza", true, None::<&str>)?;
            let pause60 = MenuItem::with_id(app, "pause60", "1 soat pauza", true, None::<&str>)?;
            let resume_item = MenuItem::with_id(app, "resume", "Davom ettiriş", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Sozlamalar…", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Çiqiş", true, None::<&str>)?;
            let menu = Menu::with_items(
                app,
                &[
                    &enabled_item,
                    &PredefinedMenuItem::separator(app)?,
                    &pause15,
                    &pause60,
                    &resume_item,
                    &PredefinedMenuItem::separator(app)?,
                    &settings_item,
                    &PredefinedMenuItem::separator(app)?,
                    &quit,
                ],
            )?;
            let tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().cloned().expect("icon"))
                .menu(&menu)
                .show_menu_on_left_click(true)
                .tooltip("Özyoz")
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "enabled" => toggle_enabled(app),
                    "pause15" => app.state::<AppState>().controller.pause_for(Duration::from_secs(15 * 60)),
                    "pause60" => app.state::<AppState>().controller.pause_for(Duration::from_secs(60 * 60)),
                    "resume" => app.state::<AppState>().controller.resume(),
                    "settings" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let first_run = !settings.first_run_done;
            app.manage(AppState {
                controller,
                settings: Mutex::new(settings),
                settings_file,
                log_file,
                tray: Mutex::new(Some(tray)),
                enabled_item: Mutex::new(Some(enabled_item)),
            });

            // Show the window on first run or when the hook has no permission yet.
            if first_run || ozyoz_input::check_permission(false) == Permission::Denied {
                show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the settings window hides it; the app lives in the tray.
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            set_settings,
            get_status,
            request_permission,
            pause,
            resume,
            convert_preview
        ])
        .run(tauri::generate_context!())
        .expect("error while running Özyoz");
}
