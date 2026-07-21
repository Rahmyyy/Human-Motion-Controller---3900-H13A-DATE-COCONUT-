mod db;
mod input;
mod mediapipe;
mod movement_mapping;
mod overlay;
mod preset;
mod streams;

#[cfg(test)]
mod test_support;

use log::{error, warn};
use nokhwa::utils::CameraIndex;
use std::path::PathBuf;
use tauri::{
    menu::{AboutMetadata, MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder},
    path::BaseDirectory,
    App, AppHandle, Manager,
};

use crate::{mediapipe::runner::set_model_path, streams::camera};

const ALTERNATIVE_CAMERA_VIEW: bool = true;

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

            let mediapipe_tx = mediapipe::runner::start_mediapipe_thread(
                get_path(app.handle(), "models/MediaPipePoseDetector.onnx"),
                get_path(app.handle(), "models/anchors_pose.npy"),
            );

            let webcam_tx = streams::camera::start_webcam_thread(mediapipe_tx.clone());

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

            let make_submenu = |app: &App, menu_name: &str, ids: &[&str], names: &[&str]| {
                let list_items: Vec<MenuItem<_>> = ids
                    .iter()
                    .zip(names)
                    .map(|(id, name)| {
                        MenuItemBuilder::with_id(id, name)
                            // .checked(i == 0)
                            .enabled(true)
                            .build(app)
                            .unwrap()
                    })
                    .collect();

                let list_items: Vec<&dyn tauri::menu::IsMenuItem<_>> = list_items
                    .iter()
                    .map(|item| item as &dyn tauri::menu::IsMenuItem<_>)
                    .collect();

                SubmenuBuilder::new(app, menu_name)
                    .items(&list_items)
                    .build()
                    .unwrap()
            };

            let camera_list = camera::get_all_cameras();
            let ids: Vec<String> = camera_list
                .iter()
                .map(|c| format!("cam-{}", c.index().as_string()))
                .collect();
            let names: Vec<String> = camera_list.iter().map(|c| c.human_name()).collect();

            let camera_menu = make_submenu(
                app,
                "Camera",
                &ids.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
                &names.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            );

            let model_paths = vec![
                "models/pose_landmark_heavy.onnx",
                "models/pose_landmark_full.onnx",
                "models/pose_landmark_lite.onnx",
            ];
            let names = vec!["Heavy", "Full", "Lite"];

            let model_menu = make_submenu(app, "Model", &model_paths, &names);

            let menu = MenuBuilder::new(app)
                .items(&[&app_menu, &camera_menu, &model_menu])
                .build()?;

            app.set_menu(menu)?;

            overlay::close_with_main_window(app.handle());

            set_model_path(
                get_path(app.handle(), model_paths.first().unwrap()),
                &mediapipe_tx,
            );

            app.on_menu_event(move |app_handle, event| {
                let mediapipe_tx = mediapipe_tx.clone();
                let webcam_tx = webcam_tx.clone();

                match event.id().0.as_str() {
                    path if path.starts_with("models") => {
                        set_model_path(get_path(app_handle, path), &mediapipe_tx);
                    }
                    cam_id if cam_id.starts_with("cam-") => {
                        camera::set_camera(
                            CameraIndex::Index(
                                cam_id.strip_prefix("cam-").unwrap().parse::<u32>().unwrap(),
                            ),
                            &webcam_tx,
                        );
                    }
                    other => {
                        warn!("Unknown menu event: {}", other)
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            camera::webcam_handler,
            camera::start_backend_camera,
            camera::stop_backend_camera,
            mediapipe::runner::mediapipe_handler,
            movement_mapping::commands::create_movement_mapping,
            movement_mapping::commands::get_movement_mappings,
            input::press_key,
            movement_mapping::commands::get_movement_mapping,
            movement_mapping::commands::update_movement_mapping,
            movement_mapping::commands::delete_movement_mapping,
            preset::commands::create_preset,
            preset::commands::get_presets,
            preset::commands::get_preset,
            preset::commands::duplicate_preset,
            preset::commands::delete_preset,
            preset::commands::update_default_pose,
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
                .filter(|metadata| metadata.target() != "ort::logging")
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn get_path(app: &AppHandle, relative_path: &str) -> PathBuf {
    match app.path().resolve(relative_path, BaseDirectory::Resource) {
        Ok(path) => path,
        Err(e) => {
            error!("Failed to resolve path {}: {}", relative_path, e);
            panic!("Failed to resolve path {}: {}", relative_path, e);
        }
    }
}
