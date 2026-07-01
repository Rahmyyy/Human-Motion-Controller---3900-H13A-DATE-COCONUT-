use anyhow::Result as AnyhowResult;
use core::f32;
use image::{DynamicImage, GrayImage, RgbaImage};
use ort::{self, session::Session, value::Tensor};

use crate::mediapipe::landmarks::PoseLandmarks;

const CONFIDENCE_THRESHOLD: f32 = 0.5;

pub fn run_landmarker(
    model: &mut Session,
    image: RgbaImage,
) -> AnyhowResult<Option<(PoseLandmarks, GrayImage)>, anyhow::Error> {
    let (width, height) = image.dimensions();

    let resized = DynamicImage::ImageRgba8(image)
        .resize_exact(256, 256, image::imageops::FilterType::Triangle)
        .to_rgb8();

    let input = Tensor::from_array(ndarray::Array4::from_shape_fn(
        (1, 256, 256, 3),
        |(_, y, x, c)| resized[(x as _, y as _)][c] as f32 / 255.0,
    ))?;

    let result = model.run(ort::inputs![input.clone()])?;

    let confidence = result["Identity_1"].try_extract_array::<f32>()?[[0, 0]];

    if confidence < CONFIDENCE_THRESHOLD {
        return Ok(None);
    }

    let points_raw = result["Identity"].try_extract_array::<f32>()?;
    let points = points_raw.slice(ndarray::s![0, ..]).to_vec();

    let pose = PoseLandmarks::new(points.try_into().unwrap());

    let visability_mask = result["Identity_2"].try_extract_array::<f32>()?;
    let visability_mask = visability_mask.slice(ndarray::s![0, .., .., 0]);

    let visability_mask = GrayImage::from_vec(
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
        width,
        height,
        ::image::imageops::FilterType::Triangle,
    );

    Ok(Some((pose, visability_mask)))
}
