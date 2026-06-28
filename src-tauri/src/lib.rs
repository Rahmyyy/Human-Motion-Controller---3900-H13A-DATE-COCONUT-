mod annotate;
mod cam_feeds;
mod mediapipe;

use std::sync::OnceLock;

use log::{debug, warn};
use nokhwa::utils::CameraIndex;
use tauri::{
    async_runtime::spawn,
    ipc::Channel,
    menu::{AboutMetadata, MenuBuilder, MenuItem, MenuItemBuilder, SubmenuBuilder},
    path::BaseDirectory,
    App, AppHandle, Manager,
};
use tokio::sync::mpsc;

use crate::{cam_feeds::WebcamThreadCommand, mediapipe::LandmarkerThreadCommand};

static WEBCAM_TX: OnceLock<mpsc::Sender<WebcamThreadCommand>> = OnceLock::new();
static ANNOTATED_TX: OnceLock<mpsc::Sender<LandmarkerThreadCommand>> = OnceLock::new();

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (webcam_tx, webcam_rx) = mpsc::channel::<WebcamThreadCommand>(5);

    let _ = WEBCAM_TX.set(webcam_tx.clone());

    let (annotated_tx, annotated_rx) = mpsc::channel::<LandmarkerThreadCommand>(5);

    let _ = ANNOTATED_TX.set(annotated_tx.clone());

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Info)
                .build(),
        )
        .setup(move |app| {
            let (frame_sender_tx, frame_sender_rx) =
                mpsc::channel::<cam_feeds::SenderThreadCommand>(1);

            spawn(cam_feeds::frame_sender_thread(frame_sender_rx));

            spawn(cam_feeds::webcam_thread(
                webcam_rx,
                frame_sender_tx.clone(),
                annotated_tx.clone(),
            ));

            let detector_model_path = app
                .path()
                .resolve("models/MediaPipePoseDetector.onnx", BaseDirectory::Resource)?;

            let anchor_path = app
                .path()
                .resolve("models/anchors_pose.npy", BaseDirectory::Resource)?;

            spawn(mediapipe::landmarker_thread(
                annotated_rx,
                frame_sender_tx.clone(),
                detector_model_path,
                anchor_path,
            ));

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

            let camera_list = cam_feeds::get_all_cameras();
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

            app.on_menu_event(move |app_handle, event| {
                debug!("Menu Event: {:?}", event);
                match event.id().0.as_str() {
                    path if path.starts_with("models") => set_model_path(app_handle, path),
                    cam_id if cam_id.starts_with("cam-") => {
                        set_camera(CameraIndex::Index(
                            cam_id.strip_prefix("cam-").unwrap().parse::<u32>().unwrap(),
                        ));
                    }
                    other => {
                        warn!("Unknown menu event: {}", other)
                    }
                }
            });

            set_camera(camera_list.first().unwrap().index().clone());
            set_model_path(app.app_handle(), model_paths.first().unwrap());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![webcam_handler, annotated_handler])
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

#[tauri::command]
async fn webcam_handler(channel: Channel<Vec<u8>>) {
    WEBCAM_TX
        .get()
        .unwrap()
        .send(WebcamThreadCommand::SetChannel(channel))
        .await
        .unwrap();
}

#[tauri::command]
async fn annotated_handler(channel: Channel<Vec<u8>>) {
    ANNOTATED_TX
        .get()
        .unwrap()
        .send(LandmarkerThreadCommand::SetChannel(channel))
        .await
        .unwrap();
}

fn set_model_path(app: &AppHandle, model_path: &str) {
    let model_path = app
        .path()
        .resolve(model_path, BaseDirectory::Resource)
        .unwrap();

    tauri::async_runtime::block_on(async {
        ANNOTATED_TX
            .get()
            .unwrap()
            .send(LandmarkerThreadCommand::SetModel(model_path))
            .await
            .unwrap();
    });
}

fn set_camera(cam_index: CameraIndex) {
    tauri::async_runtime::block_on(async {
        WEBCAM_TX
            .get()
            .unwrap()
            .send(WebcamThreadCommand::SetCamera(cam_index))
            .await
            .unwrap();
    });
}
