mod db;
mod input;
mod movement_mapping;
mod native;
mod overlay;
mod patient;
mod patient_transfer;
mod preset;
mod scheduled_session;
mod session;

#[cfg(test)]
mod test_support;
#[cfg(test)]
#[path = "lib/tests/mod.rs"]
mod tests;

use std::{error::Error, path::Path};
use tauri::{
    menu::{AboutMetadata, MenuBuilder, SubmenuBuilder},
    plugin::TauriPlugin,
    App, Builder, Manager, Runtime,
};

type SetupResult = Result<(), Box<dyn Error>>;

fn logging_plugin<R: Runtime>(skip_logger: bool) -> TauriPlugin<R> {
    let builder = tauri_plugin_log::Builder::new()
        .format(|out, message, record| {
            out.finish(format_args!(
                "[{} {}:{:?}] {}",
                record.level(),
                record.target(),
                record.line().unwrap_or(0),
                message
            ))
        })
        .targets([
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                file_name: Some("logs".to_string()),
            }),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
            tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Webview),
        ])
        .level(log::LevelFilter::Debug);

    if skip_logger {
        builder.skip_logger().build()
    } else {
        builder.build()
    }
}

fn configure_builder<R: Runtime + overlay::OverlayRuntime>(
    builder: Builder<R>,
    log_plugin: TauriPlugin<R>,
) -> Builder<R> {
    let builder = builder
        .plugin(log_plugin)
        .plugin(tauri_plugin_dialog::init());

    // The embedded WebDriver server is compiled into explicit E2E builds only. Production builds
    // therefore expose no automation endpoint.
    #[cfg(feature = "e2e")]
    let builder = builder
        .plugin(tauri_plugin_wdio::init())
        .plugin(tauri_plugin_wdio_webdriver::init());

    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    builder.invoke_handler(tauri::generate_handler![
        movement_mapping::commands::create_movement_mapping,
        movement_mapping::commands::get_movement_mappings,
        input::press_key,
        input::execute_action,
        movement_mapping::commands::get_movement_mapping,
        movement_mapping::commands::update_movement_mapping,
        movement_mapping::commands::update_movement_mapping_threshold,
        movement_mapping::commands::delete_movement_mapping,
        preset::commands::create_preset,
        preset::commands::get_presets,
        preset::commands::get_preset,
        preset::commands::duplicate_preset,
        preset::commands::delete_preset,
        preset::commands::update_default_pose,
        patient::commands::create_patient,
        patient::commands::get_patients,
        patient::commands::get_patient,
        patient::commands::update_patient,
        patient::commands::delete_patient,
        patient::commands::touch_patient_activity,
        scheduled_session::commands::create_scheduled_session,
        scheduled_session::commands::get_dashboard_overview,
        patient_transfer::commands::export_patient,
        patient_transfer::commands::preview_import_patient,
        patient_transfer::commands::import_patient,
        session::commands::record_completed_session,
        session::commands::get_patient_sessions,
        overlay::open_overlay,
        overlay::close_overlay,
    ])
}

fn install_app_menu<R: Runtime>(app: &App<R>) -> tauri::Result<()> {
    let app_menu = SubmenuBuilder::new(app, "Human Controller")
        .about(Some(AboutMetadata {
            version: Some("1.0.0".into()),
            authors: Some(vec!["COMP3900 - H13A-DATE".into()]),
            name: Some("Human controller".into()),
            short_version: None,
            comments: None,
            copyright: None,
            license: None,
            website: None,
            website_label: None,
            credits: None,
            icon: None,
        }))
        .quit()
        .build()?;
    let menu = MenuBuilder::new(app).items(&[&app_menu]).build()?;
    app.set_menu(menu)?;
    Ok(())
}

fn initialize_app<R, I, M>(
    app: &mut App<R>,
    app_data_dir: &Path,
    initialize_input: I,
    install_menu: M,
) -> SetupResult
where
    R: Runtime,
    I: FnOnce(),
    M: FnOnce(&App<R>) -> tauri::Result<()>,
{
    app.manage(db::init_db(app_data_dir)?);
    initialize_input();
    install_menu(app)?;
    overlay::close_with_main_window(app.handle());

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    configure_builder(tauri::Builder::default(), logging_plugin(false))
        .setup(|app| {
            #[cfg(feature = "e2e")]
            let app_data_dir = std::env::var_os("HUMAN_CONTROLLER_E2E_DATA_DIR")
                .map(std::path::PathBuf::from)
                .unwrap_or(app.path().app_data_dir()?);

            #[cfg(not(feature = "e2e"))]
            let app_data_dir = app.path().app_data_dir()?;

            initialize_app(
                app,
                &app_data_dir,
                input::init_action_backend,
                install_app_menu,
            )
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
