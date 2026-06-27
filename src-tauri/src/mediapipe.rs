use std::path::PathBuf;

use anyhow::Result as AnyhowResult;

use log::{debug, error, info, warn};
use ort::{
    self, ep,
    session::{builder::GraphOptimizationLevel, Session},
    value::Tensor,
};
use tauri::ipc::Channel;
use tokio::sync::mpsc;

use crate::{
    annotate::{self, sigmoid, PoseLandmarks},
    cam_feeds::SenderThreadCommand,
};

use image::{DynamicImage, ImageBuffer, Rgba};

fn run_landmarker(
    model: &mut Session,
    image: ImageBuffer<image::Rgba<u8>, Vec<u8>>,
) -> AnyhowResult<(PoseLandmarks, ImageBuffer<image::Luma<u8>, Vec<u8>>), anyhow::Error> {
    let resized = DynamicImage::ImageRgba8(image.clone())
        .resize_exact(256, 256, image::imageops::FilterType::Triangle)
        .to_rgb8();

    let input = Tensor::from_array(ndarray::Array4::from_shape_fn(
        (1, 256, 256, 3),
        |(_, y, x, c)| resized[(x as _, y as _)][c] as f32 / 255.0,
    ))?;

    let result = model.run(ort::inputs![input.clone()])?;

    let points_raw = result["Identity"].try_extract_array::<f32>()?;
    let points = points_raw.slice(ndarray::s![0, ..]).to_vec();

    let pose = PoseLandmarks::new(points.try_into().unwrap());

    let visability_mask = result["Identity_2"].try_extract_array::<f32>()?;
    let visability_mask = visability_mask.slice(ndarray::s![0, .., .., 0]);

    let visability_mask = image::GrayImage::from_vec(
        visability_mask.shape()[1] as u32,
        visability_mask.shape()[0] as u32,
        visability_mask
            .iter()
            .map(|v| (v.clamp(0.0, 1.0) * 255.0) as u8)
            .collect(),
    )
    .unwrap();

    Ok((pose, visability_mask))
}

#[derive(Clone)]
pub enum LandmarkerThreadCommand {
    SetModel(PathBuf),
    InputFrame(ImageBuffer<Rgba<u8>, Vec<u8>>),
    SetChannel(Channel<Vec<u8>>),
    Stop,
}

pub async fn landmarker_thread(
    mut command_rx: mpsc::Receiver<LandmarkerThreadCommand>,
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
) {
    let mut model: Option<Session> = None;
    let mut frame_sender_channel: Option<Channel<Vec<u8>>> = None;

    loop {
        match command_rx.recv().await.unwrap() {
            LandmarkerThreadCommand::SetModel(model_path) => {
                model = Some(
                    Session::builder()
                        .unwrap()
                        .with_execution_providers([
                            // ep::CoreML::default().build(),
                            // ep::WebGPU::default().build(),
                            ep::XNNPACK::default().build(),
                        ])
                        .unwrap()
                        .with_optimization_level(GraphOptimizationLevel::Level3)
                        .unwrap()
                        .with_intra_threads(4)
                        .unwrap()
                        .commit_from_file(&model_path)
                        .unwrap(),
                );
                info!("Model loaded successfully from {:?}", model_path);
            }
            LandmarkerThreadCommand::Stop => break,
            LandmarkerThreadCommand::SetChannel(channel) => {
                frame_sender_channel = Some(channel);
            }
            LandmarkerThreadCommand::InputFrame(image_buffer) => {
                if let Some(model) = &mut model {
                    let (pose, mask) = run_landmarker(model, image_buffer.clone()).unwrap();

                    let annotated_frame = annotate::annotate_frame(image_buffer, &pose, mask);

                    if let Some(channel) = &frame_sender_channel {
                        frame_sender_tx
                            .send(SenderThreadCommand::SendFrame {
                                frame: annotated_frame,
                                channel: channel.clone(),
                                format: image::ImageFormat::Png,
                                size: None,
                            })
                            .await
                            .unwrap();
                    } else {
                        warn!("No channel set for landmarker thread");
                    }
                } else {
                    warn!("Model not loaded yet");
                }
            }
        }
    }
}
