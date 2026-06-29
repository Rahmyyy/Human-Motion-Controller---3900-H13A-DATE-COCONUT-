use std::collections::HashMap;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

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
    pub fn is_left(&self) -> bool {
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

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct LandmarkPoint {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub visibility: f32,
    pub presence: f32,
}

pub fn sigmoid(x: f32) -> f32 {
    1.0 / (1.0 + (-x).exp())
}

impl LandmarkPoint {
    pub fn new(x: f32, y: f32, z: f32, visibility: f32, presence: f32) -> Self {
        Self {
            x,
            y,
            z,
            visibility: sigmoid(visibility),
            presence: sigmoid(presence),
        }
    }
}

#[derive(Debug, Clone)]
pub struct PoseLandmarks(pub(crate) HashMap<Landmarks, LandmarkPoint>);

impl PoseLandmarks {
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
}
