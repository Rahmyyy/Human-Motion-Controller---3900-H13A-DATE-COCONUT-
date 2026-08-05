use anyhow::{anyhow, Result};
use rusqlite::Connection;
use std::collections::HashMap;

use super::repository::{self, Session, SessionMappingStat};
use crate::preset;

/// Everything the frontend knows about a session that just ended. The preset name and the
/// mapping settings are not part of this: they are read from the database here so a caller
/// cannot record history that disagrees with what was actually configured.
pub struct CompletedSession<'a> {
    pub session_id: &'a str,
    pub patient_id: &'a str,
    pub preset_id: &'a str,
    pub started_at_ms: i64,
    pub ended_at_ms: i64,
    pub trigger_counts_by_mapping: &'a HashMap<String, u32>,
}

/// Stores a finished session and freezes the preset and mapping settings it ran with.
pub fn record_completed_session(conn: &mut Connection, session: &CompletedSession) -> Result<()> {
    let session_id = session.session_id.trim();
    let patient_id = session.patient_id.trim();
    let preset_id = session.preset_id.trim();

    if session_id.is_empty() {
        return Err(anyhow!("Session ID cannot be empty"));
    }

    if patient_id.is_empty() {
        return Err(anyhow!("Patient ID cannot be empty"));
    }

    if preset_id.is_empty() {
        return Err(anyhow!("Preset ID cannot be empty"));
    }

    if session.started_at_ms <= 0 {
        return Err(anyhow!("Session start time must be a positive timestamp"));
    }

    if session.ended_at_ms < session.started_at_ms {
        return Err(anyhow!("Session cannot end before it starts"));
    }

    // The overlay retries neither ending nor recording, but a session id arriving twice would
    // otherwise double-count the patient's history.
    if repository::session_exists(conn, session_id)? {
        return Err(anyhow!("Session has already been recorded"));
    }

    // Also validates that the preset belongs to this patient.
    let stored_preset = preset::repository::select_preset_by_id(conn, preset_id, patient_id)
        .map_err(|_| anyhow!("Preset not found for this patient"))?;

    let stats = mapping_stats(conn, preset_id, session.trigger_counts_by_mapping)?;

    let record = Session {
        id: session_id.to_string(),
        patient_id: patient_id.to_string(),
        preset_id: preset_id.to_string(),
        preset_name: stored_preset.name,
        started_at_ms: session.started_at_ms,
        ended_at_ms: session.ended_at_ms,
        duration_ms: session.ended_at_ms - session.started_at_ms,
        // The per-mapping counts are the same events the live counter counted, so summing
        // them keeps one source of truth instead of trusting a separately reported total.
        trigger_count: total_triggers(session.trigger_counts_by_mapping),
    };

    repository::insert_session(conn, &record, &stats)
}

/// One row per mapping in the preset, including mappings that never fired: the history page
/// plots the thresholds a session ran with, not only the ones that produced a keypress.
fn mapping_stats(
    conn: &Connection,
    preset_id: &str,
    trigger_counts: &HashMap<String, u32>,
) -> Result<Vec<SessionMappingStat>> {
    let snapshots = repository::select_mapping_snapshots(conn, preset_id)?;

    Ok(snapshots
        .into_iter()
        .map(|mapping| SessionMappingStat {
            trigger_count: i64::from(trigger_counts.get(&mapping.id).copied().unwrap_or(0)),
            mapping_id: mapping.id,
            mapping_name: mapping.name,
            keybind: mapping.keybind,
            threshold_percentage: mapping.threshold_percentage,
            keypress_trigger_threshold_percentage: mapping.keypress_trigger_threshold_percentage,
        })
        .collect())
}

/// Counts every reported trigger, including any from a mapping deleted mid-session, so the
/// session total matches what the patient saw on the overlay.
fn total_triggers(trigger_counts: &HashMap<String, u32>) -> i64 {
    trigger_counts.values().map(|count| i64::from(*count)).sum()
}

#[cfg(test)]
#[path = "service_tests.rs"]
mod tests;
