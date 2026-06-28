#[allow(unused_imports)]
use ab_glyph::{FontRef, PxScale};
use std::collections::HashMap;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

use image::{ImageBuffer, Rgba, RgbaImage};
#[allow(unused_imports)]
use imageproc::drawing::{
    draw_antialiased_line_segment_mut, draw_filled_circle_mut, draw_text_mut,
};

#[derive(Debug, Clone, Copy, EnumIter, Eq, PartialEq, Hash)]
pub enum Landmarks {
    Nose,
    LeftEyeInner,
    LeftEye,
    LeftEyeOuter,
    RightEyeInner,
    RightEye,
    RightEyeOuter,
    LeftEar,
    RightEar,
    MouthLeft,
    MouthRight,
    LeftShoulder,
    RightShoulder,
    LeftElbow,
    RightElbow,
    LeftWrist,
    RightWrist,
    LeftPinky,
    RightPinky,
    LeftIndex,
    RightIndex,
    LeftThumb,
    RightThumb,
    LeftHip,
    RightHip,
    LeftKnee,
    RightKnee,
    LeftAnkle,
    RightAnkle,
    LeftHeel,
    RightHeel,
    LeftFootIndex,
    RightFootIndex,
    Hip,
    Head,
    HandExtra1Right,
    HandExtra2Right,
    HandExtra1Left,
    HandExtra2Left,
}

use Landmarks::*;

const LANDMARK_LINKS: &[(Landmarks, Landmarks)] = &[
    (Nose, LeftEyeInner),
    (LeftEyeInner, LeftEye),
    (LeftEye, LeftEyeOuter),
    (LeftEyeOuter, LeftEar),
    (Nose, RightEyeInner),
    (RightEyeInner, RightEar),
    (RightEar, RightEyeOuter),
    (RightEyeOuter, RightEar),
    (MouthLeft, MouthRight),
    (LeftShoulder, RightShoulder),
    (LeftShoulder, LeftElbow),
    (LeftElbow, LeftWrist),
    (LeftWrist, LeftPinky),
    (LeftWrist, LeftIndex),
    (LeftWrist, LeftThumb),
    (LeftPinky, LeftIndex),
    (RightShoulder, RightElbow),
    (RightElbow, RightWrist),
    (RightWrist, RightPinky),
    (RightWrist, RightIndex),
    (RightWrist, RightThumb),
    (RightPinky, RightIndex),
    (LeftShoulder, LeftHip),
    (RightShoulder, RightHip),
    (LeftHip, RightHip),
    (LeftHip, LeftKnee),
    (RightHip, RightKnee),
    (LeftKnee, LeftAnkle),
    (RightKnee, RightAnkle),
    (LeftAnkle, LeftHeel),
    (RightAnkle, RightHeel),
    (LeftHeel, LeftFootIndex),
    (RightHeel, RightFootIndex),
    (LeftAnkle, LeftFootIndex),
    (RightAnkle, RightFootIndex),
];

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LandmarkPoint {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
    pub presence: f32,
}

#[allow(dead_code)]
const TEXT_SCALE: ab_glyph::PxScale = PxScale { x: 20.0, y: 10.0 };

pub fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

impl LandmarkPoint {
    pub fn new(x: f32, y: f32, z: f32, visibility: f32, presence: f32) -> Self {
        Self {
            x,
            y,
            z,
            // TODO: Change these to be in bounds [min_float, max_float]
            visibility: sigmoid(visibility),
            presence: sigmoid(presence),
        }
    }

    fn image_point(&self, image: &RgbaImage) -> (i32, i32) {
        let x = (self.x * image.width() as f32).round() as i32;
        let y = (self.y * image.height() as f32).round() as i32;
        (x, y)
    }

    pub fn visable(&self) -> bool {
        self.visibility > 0.5 && self.presence > 0.5
    }
}

#[derive(Debug, Clone)]
pub struct PoseLandmarks(pub(crate) HashMap<Landmarks, LandmarkPoint>);

impl PoseLandmarks {
    // Associated function acting as a constructor
    pub fn new(points: [f32; 39 * 5]) -> Self {
        let mut landmark_points: Vec<LandmarkPoint> = vec![];

        for i in 0..(points.len() / 5) {
            let base = i * 5;
            let pose_points = &points[base..(base + 5)];

            let landmark = LandmarkPoint::new(
                pose_points[0] / 255.0,
                pose_points[1] / 255.0,
                pose_points[2] / 255.0,
                pose_points[3],
                pose_points[4],
            );
            landmark_points.push(landmark);
        }

        let mut out = Self(HashMap::new());

        for (point, landmark) in landmark_points.into_iter().zip(Landmarks::iter()) {
            out.0.insert(landmark, point);
        }

        out
    }

    fn annotate(&self, mut frame: image::RgbaImage) -> image::RgbaImage {
        for (landmark, point) in &self.0 {
            annotate_point(&mut frame, point, &format!("{:?}", landmark));
        }

        for (point1, point2) in LANDMARK_LINKS {
            link_points(
                &mut frame,
                self.0.get(point1).unwrap(),
                self.0.get(point2).unwrap(),
            );
        }

        frame
    }
}

fn annotate_point(image: &mut RgbaImage, point: &LandmarkPoint, _text: &str) {
    if !point.visable() {
        return;
    }

    let (x, y) = point.image_point(image);

    // let font = FontRef::try_from_slice(include_bytes!("../icons/font.ttf")).unwrap();

    draw_filled_circle_mut(image, (x, y), 5, Rgba([0u8, 0u8, 255u8, 255u8]));

    // draw_text_mut(
    //     image,
    //     Rgba([0u8, 0u8, 255u8, 255u8]),
    //     x,
    //     y,
    //     TEXT_SCALE,
    //     &font,
    //     text,
    // );

    draw_filled_circle_mut(image, (x, y), 5, Rgba([0u8, 0u8, 255u8, 255u8]));
}

fn link_points(frame: &mut RgbaImage, point1: &LandmarkPoint, point2: &LandmarkPoint) {
    if point1.visable() && point2.visable() {
        draw_antialiased_line_segment_mut(
            frame,
            point1.image_point(frame),
            point2.image_point(frame),
            Rgba([255u8, 0u8, 0u8, 255u8]),
            imageproc::pixelops::interpolate,
        );
    }
}

fn mask_image(image: &RgbaImage, mask: &image::GrayImage) -> RgbaImage {
    let mask_rgb = image::DynamicImage::ImageLuma8(mask.clone()).to_rgba8();

    image::ImageBuffer::from_fn(image.width(), image.height(), |x, y| {
        let rgb = image.get_pixel(x, y);
        let mask = mask_rgb.get_pixel(x, y)[0];
        image::Rgba([
            ((rgb[0] as u16 * mask as u16) / 255) as u8,
            ((rgb[1] as u16 * mask as u16) / 255) as u8,
            ((rgb[2] as u16 * mask as u16) / 255) as u8,
            ((rgb[3] as u16 * mask as u16) / 255) as u8,
        ])
    })
}

pub fn annotate_frame(
    frame: RgbaImage,
    pose: &PoseLandmarks,
    visability_mask: ImageBuffer<image::Luma<u8>, Vec<u8>>,
) -> RgbaImage {
    let image = pose.annotate(frame);

    let visability_mask_scaled = image::imageops::resize(
        &visability_mask,
        image.width(),
        image.height(),
        ::image::imageops::FilterType::Triangle,
    );

    mask_image(&image, &visability_mask_scaled)
}
