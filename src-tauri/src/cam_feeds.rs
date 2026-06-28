use image::RgbaImage;
use log::{error, info, warn};
use nokhwa::{
    self, nokhwa_initialize,
    pixel_format::RgbAFormat,
    utils::{ApiBackend::Auto, CameraIndex, CameraInfo, RequestedFormat, RequestedFormatType},
    Camera, NokhwaError,
};

use std::time::Duration;

use tokio::sync::mpsc;

use nokhwa::utils::{CameraFormat, FrameFormat, Resolution};
use tauri::ipc::Channel;

use crate::mediapipe::LandmarkerThreadCommand;

#[allow(dead_code)]
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
    #[allow(dead_code)]
    Stop,
}

pub async fn webcam_thread(
    mut command_rx: mpsc::Receiver<WebcamThreadCommand>,
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    annotate_tx: mpsc::Sender<LandmarkerThreadCommand>,
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

                annotate_tx
                    .send(LandmarkerThreadCommand::InputFrame(frame))
                    .await
                    .unwrap();
            }
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
                WebcamThreadCommand::Stop => {
                    info!("Stopping webcam thread");
                    break;
                }
            }
        }
    }
}

#[derive(Clone)]
pub enum SenderThreadCommand {
    SendFrame {
        frame: RgbaImage,
        channel: Channel<Vec<u8>>,
        format: image::ImageFormat,
        size: Option<(i32, i32)>,
    },
    #[allow(dead_code)]
    Stop,
}

pub async fn frame_sender_thread(mut frame_rx: mpsc::Receiver<SenderThreadCommand>) {
    let mut encoder_buffer: Vec<u8> = Vec::new();

    loop {
        match frame_rx.recv().await.unwrap() {
            SenderThreadCommand::Stop => {
                info!("Stopping frame sender thread");
                break;
            }
            SenderThreadCommand::SendFrame {
                frame,
                channel,
                format,
                size,
            } => {
                encoder_buffer.clear();
                let mut cursor = std::io::Cursor::new(&mut encoder_buffer);

                let mut frame = match size {
                    Some((width, height)) => image::imageops::resize(
                        &frame,
                        width as u32,
                        height as u32,
                        ::image::imageops::FilterType::Triangle,
                    ),
                    None => frame,
                };

                image::imageops::flip_horizontal_in_place(&mut frame);

                let frame = image::DynamicImage::ImageRgba8(frame);

                if frame.write_to(&mut cursor, format).is_ok() {
                    if channel.send(encoder_buffer.clone()).is_err() {
                        warn!("Failed to send frame through channel");
                    }
                } else {
                    warn!("Failed to encode frame to {:?}", format);
                }
            }
        }
    }
}
