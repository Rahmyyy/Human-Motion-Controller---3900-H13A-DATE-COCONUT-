use serde::{Deserialize, Serialize};

/// Stable error payload at the Tauri seam. Its message remains the current user-facing text.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NativeError {
    pub code: String,
    pub message: String,
}

impl NativeError {
    pub fn operation(code: &'static str, error: impl std::fmt::Display) -> Self {
        Self {
            code: code.to_string(),
            message: error.to_string(),
        }
    }

    pub fn database_lock() -> Self {
        Self {
            code: "database_lock_failed".to_string(),
            message: "failed to lock database connection".to_string(),
        }
    }
}
