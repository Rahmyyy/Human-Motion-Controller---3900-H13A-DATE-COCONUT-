use anyhow::Error;
use image::RgbaImage;
use log::{error, info, warn};
use ort::{
    self,
    ep::{self, ExecutionProvider},
    session::{builder::GraphOptimizationLevel, Session},
};
use std::{path::PathBuf, sync::OnceLock};
use tauri::ipc::Channel;
use tokio::sync::mpsc;

use crate::{
    mediapipe::{
        annotate, detector::run_detector, landmarker::run_landmarker,
        preprocessing::InputTransformation,
    },
    streams::sender::SenderThreadCommand,
};

#[derive(Clone)]
pub enum MediapipeThreadCommand {
    SetModel(PathBuf),
    InputFrame(RgbaImage),
    SetChannel(Channel<Vec<u8>>),
    #[allow(dead_code)]
    Stop,
}

static MEDIAPIPE_TX: OnceLock<mpsc::Sender<MediapipeThreadCommand>> = OnceLock::new();

macro_rules! check_backend {
    ($($backend:expr),+) => {[
        $(
            if $backend.is_available().unwrap_or(false) {
            info!("Using {} backend", stringify!($backend));
            Some($backend.build())
        } else {
            None
        }
    ),+].into_iter()
    .flatten()
    .collect::<Vec<_>>()
    };
}

fn load_model(model_path: &PathBuf) -> Result<Session, Error> {
    info!("Loading model from {:?}", model_path);

    let err_handler = |e: ort::Error<ort::session::builder::SessionBuilder>| {
        anyhow::anyhow!("Failed to load model: {}", e)
    };

    let mut builder = Session::builder()
        .unwrap()
        .with_execution_providers(check_backend![
            ep::CoreML::default(),
            ep::XNNPACK::default(),
            ep::DirectML::default()
        ])
        .map_err(err_handler)?
        .with_optimization_level(GraphOptimizationLevel::Level3)
        .map_err(err_handler)?
        .with_intra_threads(4)
        .map_err(err_handler)?;

    let model = match builder.commit_from_file(model_path) {
        Ok(model) => model,
        Err(e) => {
            error!("Failed to load model: {}", e);
            return Err(anyhow::anyhow!("Failed to load model: {}", e));
        }
    };

    info!("Model loaded successfully");

    Ok(model)
}

async fn mediapipe_thread(
    mut command_rx: mpsc::Receiver<MediapipeThreadCommand>,
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    detector_model_path: PathBuf,
    anchor_path: PathBuf,
) {
    info!("Starting detector model...");
    let mut detector_model = match load_model(&detector_model_path) {
        Ok(model) => model,
        Err(e) => {
            error!("Failed to load detector model: {}", e);
            return;
        }
    };

    let anchors_matrix: ndarray::Array2<f64> = ndarray_npy::read_npy(anchor_path).unwrap();

    let mut model_saved: Option<Session> = None;
    let mut frame_sender_channel_saved: Option<Channel<Vec<u8>>> = None;
    let mut transformation_saved: Option<InputTransformation> = None;

    loop {
        match command_rx.recv().await.unwrap() {
            MediapipeThreadCommand::SetModel(model_path) => {
                info!("Loading landmarker model from {:?}", model_path);
                model_saved = match load_model(&model_path) {
                    Ok(model) => Some(model),
                    Err(e) => {
                        error!("Failed to load detector model: {}", e);
                        continue;
                    }
                };
            }
            MediapipeThreadCommand::Stop => break,
            MediapipeThreadCommand::SetChannel(channel) => {
                frame_sender_channel_saved = Some(channel);
            }
            MediapipeThreadCommand::InputFrame(frame) => {
                let new_transformation = run_detector(&mut detector_model, &frame, &anchors_matrix);

                // If transformation is better will replace it
                transformation_saved =
                    InputTransformation::pick_best(transformation_saved, new_transformation);

                // Check if everything is valid otherwise skip
                let (model, channel, transform) = match (
                    &mut model_saved,
                    &frame_sender_channel_saved,
                    &transformation_saved,
                ) {
                    (Some(model), Some(frame_sender_channel), Some(transformation_saved)) => {
                        (model, frame_sender_channel, transformation_saved)
                    }
                    (model, channel, transformation) => {
                        warn!(
                            "Landmarker frame skipped due to: model={}, channel={}, transformation={}",
                            model.is_none(),
                            channel.is_none(),
                            transformation.is_none()
                        );
                        continue;
                    }
                };

                // Transform frame to be in reference to the person for best detection
                let input_frame = transform.transform_frame(&frame);

                let (pose, mask) = match run_landmarker(model, input_frame.clone()) {
                    Ok(result) => result,
                    Err(e) => {
                        error!("Error occurred while running landmarker: {}", e);
                        continue;
                    }
                };

                let annotated_frame = match crate::ALTERNATIVE_CAMERA_VIEW {
                    false => annotate::annotate_frame(
                        frame,
                        Some(&pose),
                        Some(mask),
                        true,
                        Some(transform),
                    ),
                    true => annotate::annotate_frame(input_frame, Some(&pose), None, false, None),
                };

                let pose = pose.transform_inv(transform);
                transformation_saved = Some(InputTransformation::from_landmarker(&pose));

                match frame_sender_tx
                    .send(SenderThreadCommand::SendFrame {
                        frame: annotated_frame,
                        channel: channel.clone(),
                        format: image::ImageFormat::Png,
                        size: None,
                    })
                    .await
                {
                    Ok(_) => {}
                    Err(e) => {
                        error!("Error sending annotated frame: {}", e);
                    }
                };
            }
        }
    }
}

pub fn start_mediapipe_thread(
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    detector_model_path: PathBuf,
    anchor_path: PathBuf,
) -> mpsc::Sender<MediapipeThreadCommand> {
    let (command_tx, command_rx) = mpsc::channel::<MediapipeThreadCommand>(5);

    let _ = MEDIAPIPE_TX.set(command_tx.clone());

    tauri::async_runtime::spawn(mediapipe_thread(
        command_rx,
        frame_sender_tx,
        detector_model_path,
        anchor_path,
    ));

    command_tx
}

#[tauri::command]
pub async fn mediapipe_handler(channel: Channel<Vec<u8>>) {
    MEDIAPIPE_TX
        .get()
        .unwrap()
        .send(MediapipeThreadCommand::SetChannel(channel))
        .await
        .unwrap();
}

pub fn set_model_path(model_path: PathBuf, mediapipe_tx: &mpsc::Sender<MediapipeThreadCommand>) {
    tauri::async_runtime::block_on(async {
        mediapipe_tx
            .send(MediapipeThreadCommand::SetModel(model_path))
            .await
            .unwrap();
    });
}
