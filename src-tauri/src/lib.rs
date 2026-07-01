mod annotate;
mod cam_feeds;
mod db;
mod input;
mod mediapipe;
mod movement_mapping_commands;
mod movement_mapping_repository;
mod movement_mapping_service;

use std::sync::OnceLock;

use tauri::{async_runtime::spawn, ipc::Channel, path::BaseDirectory, Manager};
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
            app.manage(db::init_db(app.handle())?);

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

            // tauri::async_runtime::block_on(async {
            //     webcam_tx
            //         .send(WebcamThreadCommand::SetCamera(
            //             nokhwa::utils::CameraIndex::Index(0),
            //         ))
            //         .await
            //         .unwrap();
            // });

            let model_path = app
                .path()
                .resolve("models/pose_landmark_heavy.onnx", BaseDirectory::Resource)?;

            tauri::async_runtime::block_on(async {
                annotated_tx
                    .send(LandmarkerThreadCommand::SetModel(model_path))
                    .await
                    .unwrap();
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            webcam_handler,
            annotated_handler,
            movement_mapping_commands::create_movement_mapping,
            movement_mapping_commands::get_movement_mappings,
            input::press_key,
            movement_mapping_commands::get_movement_mapping,
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
