use image::ImageBuffer;
use log::{info, warn};
use nokhwa::{
    self, nokhwa_initialize,
    pixel_format::RgbAFormat,
    utils::{ApiBackend::Auto, CameraIndex, CameraInfo, RequestedFormat, RequestedFormatType},
    Camera,
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

pub fn start_webcam(cam_index: CameraIndex) -> Camera {
    // let requested =
    //     RequestedFormat::new::<RgbAFormat>(RequestedFormatType::AbsoluteHighestFrameRate);
    let requested = RequestedFormat::new::<RgbAFormat>(RequestedFormatType::Exact(
        CameraFormat::new(Resolution::new(640, 480), FrameFormat::MJPEG, 30),
    ));

    let mut camera = Camera::new(cam_index, requested).unwrap();
    camera.open_stream().unwrap();

    camera
}

#[allow(dead_code)]
pub fn send_frame_to_channel(
    channel: Channel<Vec<u8>>,
    image_buffer: ImageBuffer<image::Rgb<u8>, Vec<u8>>,
) {
    // let resized =
    //     image::imageops::resize(&image, 640, 480, ::image::imageops::FilterType::Triangle);

    // Encode the ImageBuffer directly into compressed JPEG bytes
    let mut encoder_buffer = Vec::new();
    encoder_buffer.clear();
    let mut cursor = std::io::Cursor::new(&mut encoder_buffer);

    if image_buffer
        .write_to(&mut cursor, image::ImageFormat::Jpeg)
        .is_ok()
    {
        // Push the raw Vec<u8> directly down the Tauri channel to the frontend
        if channel.send(encoder_buffer.clone()).is_err() {
            // If the frontend closed the channel or component unmounted, stop streaming
            warn!("Failed to send frame through channel");
        }
    }
}

#[derive(Clone)]
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
    let mut camera: Option<Camera> = Some(start_webcam(CameraIndex::Index(0)));
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
                    camera = Some(start_webcam(cam_index.clone()));
                }
                WebcamThreadCommand::SetChannel(channel) => {
                    info!("Setting new channel for webcam thread");
                    frame_sender_channel = Some(channel.clone());
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
        frame: ImageBuffer<image::Rgba<u8>, Vec<u8>>,
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

                let frame = match size {
                    Some((width, height)) => image::imageops::resize(
                        &frame,
                        width as u32,
                        height as u32,
                        ::image::imageops::FilterType::Triangle,
                    ),
                    None => frame,
                };

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
