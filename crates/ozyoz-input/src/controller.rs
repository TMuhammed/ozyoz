use ozyoz_typing::{Decision, EngineOptions, KeyInput, TypingEngine};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Lifecycle of the platform hook, for the UI.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HookState {
    Starting,
    /// Waiting for the OS permission (macOS Accessibility); retried automatically.
    WaitingForPermission,
    Running,
    Failed(String),
}

/// Shared, thread-safe state between the platform hook and the UI.
pub struct Controller {
    inner: Mutex<State>,
    hook_state: Mutex<HookState>,
}

struct State {
    enabled: bool,
    paused_until: Option<Instant>,
    engine: TypingEngine,
    excluded_apps: Vec<String>,
    current_app: Option<String>,
    converted_words: u64,
    events_seen: u64,
}

/// Read-only view for the UI.
#[derive(Debug, Clone)]
pub struct Snapshot {
    pub enabled: bool,
    pub paused_seconds_left: Option<u64>,
    pub options: EngineOptions,
    pub excluded_apps: Vec<String>,
    pub current_app: Option<String>,
    pub converted_words: u64,
    /// Key events the hook has delivered to the engine (diagnostics).
    pub events_seen: u64,
    pub hook_state: HookState,
}

impl Controller {
    pub fn new(options: EngineOptions) -> Self {
        Self {
            inner: Mutex::new(State {
                enabled: true,
                paused_until: None,
                engine: TypingEngine::new(options),
                excluded_apps: Vec::new(),
                current_app: None,
                converted_words: 0,
                events_seen: 0,
            }),
            hook_state: Mutex::new(HookState::Starting),
        }
    }

    pub fn set_hook_state(&self, state: HookState) {
        *self.hook_state.lock().unwrap_or_else(|e| e.into_inner()) = state;
    }

    pub fn hook_state(&self) -> HookState {
        self.hook_state.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    pub fn set_enabled(&self, enabled: bool) {
        let mut s = self.lock();
        s.enabled = enabled;
        s.engine.reset();
    }

    pub fn pause_for(&self, d: Duration) {
        let mut s = self.lock();
        s.paused_until = Some(Instant::now() + d);
        s.engine.reset();
    }

    pub fn resume(&self) {
        self.lock().paused_until = None;
    }

    pub fn set_options(&self, options: EngineOptions) {
        self.lock().engine.set_options(options);
    }

    pub fn set_excluded_apps(&self, apps: Vec<String>) {
        let mut s = self.lock();
        s.excluded_apps = apps.into_iter().map(|a| a.trim().to_lowercase()).filter(|a| !a.is_empty()).collect();
    }

    pub fn snapshot(&self) -> Snapshot {
        let s = self.lock();
        Snapshot {
            enabled: s.enabled,
            paused_seconds_left: s.paused_until.and_then(|t| t.checked_duration_since(Instant::now())).map(|d| d.as_secs()),
            options: s.engine.options(),
            excluded_apps: s.excluded_apps.clone(),
            current_app: s.current_app.clone(),
            converted_words: s.converted_words,
            events_seen: s.events_seen,
            hook_state: self.hook_state(),
        }
    }

    /// Called by the hook for every key. `app` identifies the focused
    /// application; a change of application resets the current word.
    pub fn handle(&self, app: Option<&str>, input: KeyInput) -> Decision {
        let mut s = self.lock();
        s.events_seen += 1;
        if s.current_app.as_deref() != app {
            s.current_app = app.map(str::to_owned);
            s.engine.reset();
        }
        if !s.is_active_for(app) {
            s.engine.reset();
            return Decision::PassThrough;
        }
        let d = s.engine.feed(input);
        if matches!(d, Decision::Replace { .. }) {
            s.converted_words += 1;
        }
        d
    }

    pub fn reset_word(&self) {
        self.lock().engine.reset();
    }

    fn lock(&self) -> std::sync::MutexGuard<'_, State> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }
}

impl State {
    fn is_active_for(&mut self, app: Option<&str>) -> bool {
        if !self.enabled {
            return false;
        }
        if let Some(t) = self.paused_until {
            if Instant::now() < t {
                return false;
            }
            self.paused_until = None;
        }
        if let Some(a) = app {
            let a = a.to_lowercase();
            if self.excluded_apps.iter().any(|x| a == *x || a.ends_with(x.as_str())) {
                return false;
            }
        }
        true
    }
}
