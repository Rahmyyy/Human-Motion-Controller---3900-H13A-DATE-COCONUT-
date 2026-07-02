use image::{GrayImage, ImageBuffer, Rgba, RgbaImage};
use imageproc::drawing::{
    draw_antialiased_line_segment_mut, draw_filled_circle_mut, draw_hollow_ellipse_mut,
    draw_line_segment_mut,
};

use crate::mediapipe::{
    landmarks::{
        LandmarkPoint,
        Landmarks::{self, *},
        PoseLandmarks,
    },
    preprocessing::InputTransformation,
};

const POINT_COLOUR_LEFT: Rgba<u8> = Rgba([0, 255, 0, 255]);
const POINT_COLOUR_RIGHT: Rgba<u8> = Rgba([0, 0, 255, 255]);
const LINE_COLOUR: Rgba<u8> = Rgba([255, 0, 0, 255]);

const MASK_BLUR_SIGMA: f32 = 3.0;
const MASK_THRESHOLD: u8 = 100;

const BB_COLOUR: Rgba<u8> = Rgba([0, 255, 0, 255]);

const VISIBILITY_THRESHOLD: f32 = 0.;
const PRESENCE_THRESHOLD: f32 = 0.;

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
    LeftPinky,
    LeftIndex,
    LeftThumb,
    RightPinky,
    RightIndex,
    RightThumb,
];

impl LandmarkPoint {
    fn image_point(&self, frame: &RgbaImage) -> (i32, i32) {
        let x = (self.x * frame.width() as f32).round() as i32;
        let y = (self.y * frame.height() as f32).round() as i32;
        (x, y)
    }

    fn visable(&self) -> bool {
        self.visibility > VISIBILITY_THRESHOLD && self.presence > PRESENCE_THRESHOLD
    }
}

impl PoseLandmarks {
    fn annotate(&self, frame: &mut RgbaImage) {
        for (point1, point2) in LANDMARK_LINKS {
            link_points(frame, self.get(point1), self.get(point2));
        }

        self.draw_head(frame);

        for (landmark, point) in &self.0 {
            if !point.visable() || IGNORE_RENDER_LANDMARKS.contains(landmark) {
                continue;
            }

            let (x, y) = point.image_point(frame);

            let colour = if landmark.is_left() {
                POINT_COLOUR_LEFT
            } else {
                POINT_COLOUR_RIGHT
            };

            draw_filled_circle_mut(frame, (x, y), (point.presence * 10.0) as i32, colour);
        }
    }

    fn draw_head(&self, frame: &mut RgbaImage) {
        let l_ear = self.get(&LeftEar).image_point(frame);
        let r_ear = self.get(&RightEar).image_point(frame);
        let head = self.get(&Head).image_point(frame);
        let nose = self.get(&Nose).image_point(frame);

        let h_radius =
            (((l_ear.0 - r_ear.0).pow(2) + (l_ear.1 - r_ear.1).pow(2)) as f32).sqrt() / 2.0;

        let v_radius = (((head.0 - nose.0).pow(2) + (head.1 - nose.1).pow(2)) as f32).sqrt() / 2.0;

        draw_hollow_ellipse_mut(frame, nose, h_radius as i32, v_radius as i32, LINE_COLOUR);
    }
}

fn link_points(frame: &mut RgbaImage, point1: &LandmarkPoint, point2: &LandmarkPoint) {
    if point1.visable() || point2.visable() {
        draw_antialiased_line_segment_mut(
            frame,
            point1.image_point(frame),
            point2.image_point(frame),
            LINE_COLOUR,
            imageproc::pixelops::interpolate,
        );
    }
}

fn mask_image(frame: &mut RgbaImage, mask: &GrayImage) {
    let mask = image::imageops::blur(mask, MASK_BLUR_SIGMA);

    *frame = ImageBuffer::from_fn(frame.width(), frame.height(), |x, y| {
        let rgb = frame.get_pixel(x, y);
        // let mask = mask.get_pixel(x, y)[0];
        let mask = (mask.get_pixel(x, y)[0] > MASK_THRESHOLD) as u8 * 255;
        Rgba([rgb[0], rgb[1], rgb[2], mask])
    });
}

fn draw_bounding_box(frame: &mut RgbaImage, transform: &InputTransformation) {
    let width = frame.width() as f32;
    let height = frame.height() as f32;

    let inv_proj = transform.projection((width as u32, height as u32)).invert();

    let edges = [(0.0, 0.0), (0.0, height), (width, 0.0), (width, height)]
        .iter()
        .map(|(x, y)| inv_proj * (*x, *y))
        .collect::<Vec<_>>();

    draw_line_segment_mut(frame, edges[0], edges[1], BB_COLOUR);
    draw_line_segment_mut(frame, edges[1], edges[3], BB_COLOUR);
    draw_line_segment_mut(frame, edges[3], edges[2], BB_COLOUR);
    draw_line_segment_mut(frame, edges[2], edges[0], BB_COLOUR);
}

pub fn annotate_frame(
    mut frame: RgbaImage,
    pose: Option<&PoseLandmarks>,
    visability_mask: Option<GrayImage>,
    bounding_box: bool,
    transform: Option<&InputTransformation>,
) -> RgbaImage {
    if let Some(mask) = visability_mask {
        let mask = match transform {
            Some(transform) => transform.transform_frame_inv(&mask),
            None => mask,
        };

        mask_image(&mut frame, &mask)
    };

    if let Some(pose) = pose {
        let pose = match transform {
            Some(transform) => &pose.transform_inv(transform),
            None => pose,
        };

        pose.annotate(&mut frame)
    }

    if bounding_box {
        if let Some(transform) = transform {
            draw_bounding_box(&mut frame, transform);
        }
    }

    frame
}
