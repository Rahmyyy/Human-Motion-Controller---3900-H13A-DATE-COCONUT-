use core::f32;
use std::path::PathBuf;

use anyhow::Result as AnyhowResult;

use imageproc::geometric_transformations::{self, Projection};
use log::{error, info, warn};
use ort::{
    self, ep,
    session::{builder::GraphOptimizationLevel, Session},
    value::Tensor,
};
use tauri::ipc::Channel;
use tokio::sync::mpsc;

use crate::{
    annotate::{self, sigmoid, BoundingBox, PoseLandmarks},
    cam_feeds::SenderThreadCommand,
};

use image::{DynamicImage, GrayImage, Luma, Rgba, RgbaImage};

fn run_landmarker(
    model: &mut Session,
    image: RgbaImage,
) -> AnyhowResult<(PoseLandmarks, GrayImage), anyhow::Error> {
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

    let visability_mask = image::imageops::resize(
        &visability_mask,
        image.width(),
        image.height(),
        ::image::imageops::FilterType::Triangle,
    );

    Ok((pose, visability_mask))
}

const MIN_SCORE_THRESHOLD_DETECTION: f32 = 0.75;

fn run_detector(
    model: &mut Session,
    frame: &RgbaImage,
    anchors_matrix: &ndarray::Array2<f64>,
) -> Option<Projection> {
    let resized = DynamicImage::ImageRgba8(frame.clone())
        .resize_exact(128, 128, image::imageops::FilterType::Triangle)
        .to_rgb8();

    let input = Tensor::from_array(ndarray::Array4::from_shape_fn(
        (1, 3, 128, 128),
        |(_, c, y, x)| resized[(x as _, y as _)][c] as f32 / 255.0,
    ))
    .unwrap();

    let result = model.run(ort::inputs![input.clone()]).unwrap();
    let raw_result = result["cat_1"].try_extract_array::<f32>().unwrap();

    let detected: Vec<usize> = result["cat"]
        .try_extract_array::<f32>()
        .unwrap()
        .mapv(|x| sigmoid(x.clamp(-100.0, 100.0)) > MIN_SCORE_THRESHOLD_DETECTION)
        .flatten()
        .iter()
        .enumerate()
        .filter(|(_, &detected)| detected)
        .map(|(index, _)| index)
        .collect();

    if detected.is_empty() {
        return None;
    }

    fn anchor_fix(pos: (f32, f32), anchor: &[f32]) -> (f32, f32) {
        let (x, y) = pos;

        (x * anchor[2] + anchor[0], y * anchor[3] + anchor[1])
    }

    let mut all_center = vec![];
    let mut all_point1 = vec![];

    for i in detected {
        let anchor: Vec<f32> = anchors_matrix
            .slice(ndarray::s![i, ..])
            .mapv(|x| x as f32)
            .to_vec();

        let box_raw = raw_result
            .slice(ndarray::s![0, i, ..])
            .mapv(|x| x / 128.0)
            .to_vec();

        let p_centre = anchor_fix((box_raw[8], box_raw[9]), &anchor); // kp2
        let p1 = anchor_fix((box_raw[10], box_raw[11]), &anchor); // kp3

        all_center.push(p_centre);
        all_point1.push(p1);
    }

    let xc = all_center.iter().map(|kp| kp.0).sum::<f32>() / all_center.len() as f32;
    let yc = all_center.iter().map(|kp| kp.1).sum::<f32>() / all_center.len() as f32;
    let x1 = all_point1.iter().map(|kp| kp.0).sum::<f32>() / all_point1.len() as f32;
    let y1 = all_point1.iter().map(|kp| kp.1).sum::<f32>() / all_point1.len() as f32;

    let centre = (xc, yc);
    let point1 = (x1, y1);

    let scale = ((centre.0 - point1.0).powi(2) + (centre.1 - point1.1).powi(2)).sqrt() * 2.0 * 1.5;
    let theta = (point1.0 - centre.0).atan2(point1.1 - centre.1) - std::f32::consts::PI;

    let xc = xc * frame.width() as f32;
    let yc = yc * frame.height() as f32;

    // Applies from bottom up
    let projection = {
        Projection::translate(0.5 * frame.width() as f32, 0.5 * frame.height() as f32)
            * Projection::scale(1. / scale, 1. / scale)
            * Projection::rotate(theta)
            * Projection::translate(-xc, -yc)
    };

    Some(projection)
}

#[derive(Clone)]
pub enum LandmarkerThreadCommand {
    SetModel(PathBuf),
    InputFrame(RgbaImage),
    SetChannel(Channel<Vec<u8>>),
    #[allow(dead_code)]
    Stop,
}

const DETECTOR_MISSED_DISABLE_THRESHOLD: u32 = 10000;

pub async fn landmarker_thread(
    mut command_rx: mpsc::Receiver<LandmarkerThreadCommand>,
    frame_sender_tx: mpsc::Sender<SenderThreadCommand>,
    detector_model_path: PathBuf,
    anchor_path: PathBuf,
) {
    let mut detector_model = Session::builder()
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
        .commit_from_file(&detector_model_path)
        .unwrap();

    let anchors_matrix: ndarray::Array2<f64> = ndarray_npy::read_npy(anchor_path).unwrap();

    let mut model_saved: Option<Session> = None;
    let mut frame_sender_channel_saved: Option<Channel<Vec<u8>>> = None;
    let mut projection_saved: Option<(Projection, u32)> = None;

    loop {
        match command_rx.recv().await.unwrap() {
            LandmarkerThreadCommand::SetModel(model_path) => {
                model_saved = Some(
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
                frame_sender_channel_saved = Some(channel);
            }
            LandmarkerThreadCommand::InputFrame(frame) => {
                // let start = std::time::Instant::now();

                let new_projection = run_detector(&mut detector_model, &frame, &anchors_matrix);

                // Detector is more sensitive than the landmarker, so can keep running on existing projection for a bit
                projection_saved = match (new_projection, projection_saved) {
                    (Some(new_proj), _) => Some((new_proj, 0)),
                    (None, None) => None,
                    (None, Some((_, count))) if count > DETECTOR_MISSED_DISABLE_THRESHOLD => None,
                    (None, Some((existing_proj, count))) => Some((existing_proj, count + 1)),
                };

                // Check if everything is valid otherwise skip
                let (model, channel, proj) = match (
                    &mut model_saved,
                    &frame_sender_channel_saved,
                    &projection_saved,
                ) {
                    (Some(model), Some(frame_sender_channel), Some((projection, _))) => {
                        (model, frame_sender_channel, projection)
                    }
                    (model, channel, projection) => {
                        warn!(
                            "Landmarker frame skipped due to: model={}, channel={}, projection={}",
                            model.is_none(),
                            channel.is_none(),
                            projection.is_none()
                        );
                        continue;
                    }
                };


                // Transform frame to be in reference to the person for best detection
                let input_frame = geometric_transformations::warp(
                    &frame,
                    *proj,
                    imageproc::geometric_transformations::Interpolation::Bilinear,
                    imageproc::geometric_transformations::Border::Constant(Rgba([0, 0, 0, 255])),
                );

                let (mut pose, mask) = match run_landmarker(model, input_frame) {
                    Ok(result) => result,
                    Err(e) => {
                        error!("Error occurred while running landmarker: {}", e);
                        continue;
                    }
                };

                let inv_proj = proj.invert();

                let (width, height) = (frame.width(), frame.height());

                pose.fix_transform(&inv_proj, (width, height));

                let mask = geometric_transformations::warp(
                    &mask,
                    inv_proj,
                    imageproc::geometric_transformations::Interpolation::Bilinear,
                    imageproc::geometric_transformations::Border::Constant(Luma([0])),
                );

                let mut annotated_frame = annotate::annotate_frame(frame, &pose, mask);

                let edges = [(0.0, 0.0), (0.0, 1.0), (1.0, 0.0), (1.0, 1.0)]
                    .iter()
                    .map(|(x, y)| inv_proj * ((*x * width as f32), *y * height as f32))
                    .collect::<Vec<_>>();

                BoundingBox::new(edges[0], edges[1], edges[2], edges[3]).draw(&mut annotated_frame);

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
