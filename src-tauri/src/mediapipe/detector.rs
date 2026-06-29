use core::f32;
use image::{DynamicImage, RgbaImage};
use ort::{self, session::Session, value::Tensor};

use crate::mediapipe::landmarks::sigmoid;
use crate::mediapipe::preprocessing::InputTransformation;

const MIN_SCORE_THRESHOLD_DETECTION: f32 = 0.5;

pub fn run_detector(
    model: &mut Session,
    frame: &RgbaImage,
    anchors_matrix: &ndarray::Array2<f64>,
) -> Option<InputTransformation> {
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

    let mut xc = vec![];
    let mut yc = vec![];
    let mut x1 = vec![];
    let mut y1 = vec![];

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

        xc.push(p_centre.0);
        yc.push(p_centre.1);
        x1.push(p1.0);
        y1.push(p1.1);
    }

    let mean = |in_vec: Vec<f32>| in_vec.iter().sum::<f32>() / in_vec.len() as f32;

    let centre = (mean(xc), mean(yc));
    let point1 = (mean(x1), mean(y1));

    Some(InputTransformation::from_detector(centre, point1))
}
