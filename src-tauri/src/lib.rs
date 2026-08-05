mod db;
mod input;
mod movement_mapping;
mod native;
mod overlay;
mod patient;
mod preset;
mod session;

#[cfg(test)]
mod test_support;

use tauri::{
    menu::{AboutMetadata, MenuBuilder, SubmenuBuilder},
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .setup(move |app| {
            // Starts up SQLite
            app.manage(db::init_db(app.handle())?);

            input::init_action_backend();

            let app_menu = SubmenuBuilder::new(app, "Human Controller")
                .about(Some(AboutMetadata {
                    version: Some("1.0.0".into()),
                    authors: Some(vec!["Our Names".into()]),
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

            overlay::close_with_main_window(app.handle());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
            session::commands::record_completed_session,
            overlay::open_overlay,
            overlay::close_overlay,
        ])
        .plugin(
            tauri_plugin_log::Builder::new()
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
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
