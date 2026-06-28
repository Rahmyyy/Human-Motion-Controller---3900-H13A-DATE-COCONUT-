#[allow(unused_imports)]
use ab_glyph::{FontRef, PxScale};
use std::collections::HashMap;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

use image::{GrayImage, ImageBuffer, Rgba, RgbaImage};
#[allow(unused_imports)]
use imageproc::{
    drawing::{
        draw_antialiased_line_segment_mut, draw_filled_circle_mut, draw_hollow_ellipse_mut,
        draw_line_segment_mut, draw_text_mut,
    },
    geometric_transformations::Projection,
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

impl Landmarks {
    fn is_left(&self) -> bool {
        matches!(
            self,
            LeftEyeInner
                | LeftEye
                | LeftEyeOuter
                | LeftEar
                | LeftShoulder
                | LeftElbow
                | LeftWrist
                | LeftPinky
                | LeftIndex
                | LeftThumb
                | LeftHip
                | LeftKnee
                | LeftAnkle
                | LeftHeel
                | LeftFootIndex
        )
    }
}

const LANDMARK_LINKS: &[(Landmarks, Landmarks)] = &[
    // (Nose, LeftEyeInner),
    // (LeftEyeInner, LeftEye),
    // (LeftEye, LeftEyeOuter),
    // (LeftEyeOuter, LeftEar),
    // (Nose, RightEyeInner),
    // (RightEyeInner, RightEye),
    // (RightEye, RightEyeOuter),
    // (RightEyeOuter, RightEar),
    // (MouthLeft, MouthRight),
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

const IGNORE_RENDER_LANDMARKS: &[Landmarks] = &[
    Hip,
    Head,
    HandExtra1Right,
    HandExtra2Right,
    HandExtra1Left,
    HandExtra2Left,
    LeftEyeInner,
    LeftEye,
    LeftEyeOuter,
    RightEyeInner,
    RightEyeOuter,
    RightEye,
    MouthLeft,
    MouthRight,
    LeftEar,
    RightEar,
    Nose,
];

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LandmarkPoint {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
    pub presence: f32,
}

const VISIBILITY_THRESHOLD: f32 = 0.5;
const PRESENCE_THRESHOLD: f32 = 0.5;

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

    fn fix_transform(&mut self, transform: &Projection, (width, height): (u32, u32)) {
        let (width, height) = (width as f32, height as f32);

        let (x, y) = *transform * (self.x * width, self.y * height);
        self.x = x / width;
        self.y = y / height;
    }

    pub fn visable(&self) -> bool {
        self.visibility > VISIBILITY_THRESHOLD && self.presence > PRESENCE_THRESHOLD
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

    pub fn get(&self, landmark: &Landmarks) -> &LandmarkPoint {
        // Can assume if built with the constructor, all landmarks are present
        self.0.get(landmark).unwrap()
    }

    pub fn fix_transform(&mut self, transform: &Projection, (width, height): (u32, u32)) {
        for point in self.0.values_mut() {
            point.fix_transform(transform, (width, height));
        }
    }

    fn annotate(&self, mut frame: image::RgbaImage) -> image::RgbaImage {
        for (point1, point2) in LANDMARK_LINKS {
            link_points(&mut frame, self.get(point1), self.get(point2));
        }

        let l_ear = self.get(&LeftEar).image_point(&frame);
        let r_ear = self.get(&RightEar).image_point(&frame);
        let head = self.get(&Head).image_point(&frame);

        let nose = self.get(&Nose).image_point(&frame);

        let h_radius =
            (((l_ear.0 - r_ear.0).pow(2) + (l_ear.1 - r_ear.1).pow(2)) as f32).sqrt() / 2.0;

        let v_radius = (((head.0 - nose.0).pow(2) + (head.1 - nose.1).pow(2)) as f32).sqrt() / 2.0;

        draw_hollow_ellipse_mut(
            &mut frame,
            nose,
            h_radius as i32,
            v_radius as i32,
            Rgba([255, 0, 0, 255]),
        );

        for (landmark, point) in &self.0 {
            if !point.visable() || IGNORE_RENDER_LANDMARKS.contains(landmark) {
                continue;
            }

            let (x, y) = point.image_point(&frame);

            let colour = if landmark.is_left() {
                Rgba([0u8, 255u8, 0u8, 255u8])
            } else {
                Rgba([0, 0u8, 255, 255u8])
            };

            draw_filled_circle_mut(&mut frame, (x, y), (point.presence * 10.0) as i32, colour);
        }

        frame
    }
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

const BLUR_SIGMA: f32 = 3.0;
const MASK_THRESHOLD: u8 = 100;

fn mask_image(image: &RgbaImage, mask: &GrayImage) -> RgbaImage {
    let mask = image::imageops::blur(mask, BLUR_SIGMA);

    ImageBuffer::from_fn(image.width(), image.height(), |x, y| {
        let rgb = image.get_pixel(x, y);
        // let mask = mask.get_pixel(x, y)[0];
        let mask = (mask.get_pixel(x, y)[0] > MASK_THRESHOLD) as u8 * 255;
        Rgba([rgb[0], rgb[1], rgb[2], mask])
    })
}

pub struct BoundingBox {
    tl: (f32, f32),
    bl: (f32, f32),
    tr: (f32, f32),
    br: (f32, f32),
}
impl BoundingBox {
    pub fn new(tl: (f32, f32), bl: (f32, f32), tr: (f32, f32), br: (f32, f32)) -> Self {
        Self { tl, bl, tr, br }
    }

    pub fn draw(&self, image: &mut RgbaImage) {
        draw_line_segment_mut(image, self.tl, self.bl, Rgba([0, 255, 0, 255]));
        draw_line_segment_mut(image, self.bl, self.br, Rgba([0, 255, 0, 255]));
        draw_line_segment_mut(image, self.br, self.tr, Rgba([0, 255, 0, 255]));
        draw_line_segment_mut(image, self.tr, self.tl, Rgba([0, 255, 0, 255]));
    }
}

pub fn annotate_frame(
    frame: RgbaImage,
    pose: &PoseLandmarks,
    visability_mask: GrayImage,
) -> RgbaImage {
    pose.annotate(mask_image(&frame, &visability_mask))
}
