use log::{error, info};
use nokhwa::utils::{CameraFormat, FrameFormat, Resolution};
use nokhwa::{
    self, nokhwa_initialize,
    pixel_format::RgbAFormat,
    utils::{ApiBackend::Auto, CameraIndex, CameraInfo, RequestedFormat, RequestedFormatType},
    Camera, NokhwaError,
};
use std::sync::OnceLock;
use std::time::Duration;
use tauri::ipc::Channel;
use tokio::sync::mpsc;

use crate::{mediapipe::runner::MediapipeThreadCommand, streams::sender::SenderThreadCommand};

static WEBCAM_TX: OnceLock<mpsc::Sender<WebcamThreadCommand>> = OnceLock::new();

pub fn get_all_cameras() -> Vec<CameraInfo> {
    nokhwa::query(Auto).unwrap_or(vec![])
}

pub fn start_webcam(cam_index: CameraIndex) -> Result<Camera, NokhwaError> {
    // let requested =
    //     RequestedFormat::new::<RgbAFormat>(RequestedFormatType::AbsoluteHighestFrameRate);
    let requested = RequestedFormat::new::<RgbAFormat>(RequestedFormatType::Exact(
        CameraFormat::new(Resolution::new(640, 480), FrameFormat::MJPEG, 30),
    ));

    let mut camera = Camera::new(cam_index, requested)?;
    camera.open_stream()?;

    Ok(camera)
}

#[derive(Clone)]
#[allow(dead_code)]
pub enum WebcamThreadCommand {
    SetCamera(CameraIndex),
    SetChannel(Channel<Vec<u8>>),
    ClearCamera,
    #[allow(dead_code)]
    Stop,
}

async fn webcam_thread(
    mut command_rx: mpsc::Receiver<WebcamThreadCommand>,
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    annotate_tx: mpsc::Sender<MediapipeThreadCommand>,
) {
    nokhwa_initialize(|granted| {
        info!("nokhwa_initialize = {}", granted);
    });

    let mut interval = tokio::time::interval(Duration::from_millis(10)); // 30 FPS

    // let mut camera: Option<Camera> = None;
    let mut camera: Option<Camera> = None;
    let mut frame_sender_channel: Option<Channel<Vec<u8>>> = None;

    loop {
        interval.tick().await;

        if let Some(cam) = &mut camera {
            let frame = cam.frame().unwrap().decode_image::<RgbAFormat>().unwrap();

            if let Some(channel) = &frame_sender_channel {
                frame_sender_tx
                    .send(SenderThreadCommand::SendFrame {
                        frame: frame.clone(),
                        channel: channel.clone(),
                        format: image::ImageFormat::Jpeg,
                        size: None,
                    })
                    .await
                    .unwrap();
            }

            annotate_tx
                .send(MediapipeThreadCommand::InputFrame(frame))
                .await
                .unwrap();
        }

        if let Ok(command) = command_rx.try_recv() {
            match command {
                WebcamThreadCommand::SetCamera(cam_index) => {
                    info!("Switching to camera {:?}", cam_index);
                    camera = match start_webcam(cam_index) {
                        Ok(cam) => Some(cam),
                        Err(e) => {
                            error!("Failed to start webcam: {}", e);
                            None
                        }
                    };
                }
                WebcamThreadCommand::SetChannel(channel) => {
                    info!("Setting new channel for webcam thread");
                    frame_sender_channel = Some(channel);
                }
                WebcamThreadCommand::ClearCamera => {
                    info!("Clearing webcam camera");
                    camera = None;
                }
                WebcamThreadCommand::Stop => {
                    info!("Stopping webcam thread");
                    break;
                }
            }
        }
    }
}

pub fn start_webcam_thread(
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    annotate_tx: mpsc::Sender<MediapipeThreadCommand>,
) -> mpsc::Sender<WebcamThreadCommand> {
    let (command_tx, command_rx) = mpsc::channel::<WebcamThreadCommand>(5);

    let _ = WEBCAM_TX.set(command_tx.clone());

    tauri::async_runtime::spawn(webcam_thread(command_rx, frame_sender_tx, annotate_tx));

    command_tx
}

#[tauri::command]
pub async fn webcam_handler(channel: Channel<Vec<u8>>) {
    WEBCAM_TX
        .get()
        .unwrap()
        .send(WebcamThreadCommand::SetChannel(channel))
        .await
        .unwrap();
}

#[tauri::command]
pub async fn start_backend_camera() -> Result<(), String> {
    let Some(cam) = get_all_cameras().first().cloned() else {
        return Err("No camera found. Restart with camera attached.".to_string());
    };

    WEBCAM_TX
        .get()
        .ok_or_else(|| "Webcam thread has not started.".to_string())?
        .send(WebcamThreadCommand::SetCamera(cam.index().clone()))
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn stop_backend_camera() -> Result<(), String> {
    WEBCAM_TX
        .get()
        .ok_or_else(|| "Webcam thread has not started.".to_string())?
        .send(WebcamThreadCommand::ClearCamera)
        .await
        .map_err(|error| error.to_string())
}

pub fn set_camera(cam_index: CameraIndex, webcam_tx: &mpsc::Sender<WebcamThreadCommand>) {
    tauri::async_runtime::block_on(async {
        webcam_tx
            .send(WebcamThreadCommand::SetCamera(cam_index))
            .await
            .unwrap();
    });
}
