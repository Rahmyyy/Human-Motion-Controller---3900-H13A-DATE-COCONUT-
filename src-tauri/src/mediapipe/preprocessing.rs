use image::Pixel;
use imageproc::{
    definitions::{Clamp, Image},
    geometric_transformations::{self, Projection},
};

use crate::mediapipe::landmarks::{LandmarkPoint, Landmarks, PoseLandmarks};

#[derive(Clone, Copy, Debug)]
pub struct InputTransformation {
    scale: f32,
    theta: f32,
    centre: (f32, f32),
    pub from_landmarker: bool,
}

fn dist(p1: (f32, f32), p2: (f32, f32)) -> f32 {
    ((p1.0 - p2.0).powi(2) + (p1.1 - p2.1).powi(2)).sqrt()
}

fn angle(p1: (f32, f32), p2: (f32, f32)) -> f32 {
    (p2.0 - p1.0).atan2(p2.1 - p1.1)
}

fn warp_image<P>(frame: &Image<P>, proj: Projection) -> Image<P>
where
    P: Pixel + Send + Sync,
    <P as Pixel>::Subpixel: Send + Sync,
    <P as Pixel>::Subpixel: Into<f32> + Clamp<f32>,
{
    geometric_transformations::warp(
        frame,
        proj,
        imageproc::geometric_transformations::Interpolation::Bilinear,
        imageproc::geometric_transformations::Border::Replicate,
    )
}

impl InputTransformation {
    pub fn from_detector(centre: (f32, f32), point1: (f32, f32)) -> Self {
        let scale = 1. / (dist(centre, point1) * 2.0 * 1.5);

        let theta = angle(centre, point1) - std::f32::consts::PI;

        Self {
            scale,
            theta,
            centre,
            from_landmarker: false,
        }
    }

    pub fn from_landmarker(pose: &PoseLandmarks) -> Self {
        let centre = pose.get(&Landmarks::Hip);
        let point1 = pose.get(&Landmarks::Head);

        let centre: (f32, f32) = (centre.x, centre.y);
        let point1 = (point1.x, point1.y);

        let scale = 1. / (dist(centre, point1) * 2.0 * 1.5 * 0.9);
        let theta = angle(centre, point1) - std::f32::consts::PI;

        Self {
            scale: scale.clamp(0.5, 1.0),
            theta,
            centre,
            from_landmarker: true,
        }
    }

    pub fn projection(&self, (width, height): (u32, u32)) -> Projection {
        let (width, height) = (width as f32, height as f32);

        let xc = self.centre.0 * width;
        let yc = self.centre.1 * height;

        // Applies from bottom up
        Projection::translate(0.5 * width, 0.5 * height)
            * Projection::scale(self.scale, self.scale)
            * Projection::rotate(self.theta)
            * Projection::translate(-xc, -yc)
    }

    pub fn transform_frame<P>(&self, frame: &Image<P>) -> Image<P>
    where
        P: Pixel + Send + Sync,
        <P as Pixel>::Subpixel: Send + Sync,
        <P as Pixel>::Subpixel: Into<f32> + Clamp<f32>,
    {
        warp_image(frame, self.projection(frame.dimensions()))
    }

    pub fn transform_frame_inv<P>(&self, frame: &Image<P>) -> Image<P>
    where
        P: Pixel + Send + Sync,
        <P as Pixel>::Subpixel: Send + Sync,
        <P as Pixel>::Subpixel: Into<f32> + Clamp<f32>,
    {
        warp_image(frame, self.projection(frame.dimensions()).invert())
    }

    pub fn pick_best(older: Option<Self>, newer: Option<Self>) -> Option<Self> {
        match (older, newer) {
            // If both present, take the one with better quality source
            (Some(old), Some(new)) => match (old.from_landmarker, new.from_landmarker) {
                (_, true) => Some(new),
                (true, _) => Some(old),
                _ => None,
            },
            // Always take the new option of present
            (None, Some(new)) => Some(new),
            // If no new option, take the old one if it was from the better quality source
            (Some(old), None) if old.from_landmarker => Some(old),
            // This covers the case of either no inputs or when the only option is older source is from the worse quality source
            _ => None,
        }
    }
}

impl LandmarkPoint {
    fn transform(&mut self, projection: &Projection) {
        let (x, y) = *projection * (self.x, self.y);
        self.x = x;
        self.y = y;
    }
}

impl PoseLandmarks {
    pub fn transform_inv(&self, transform: &InputTransformation) -> Self {
        let mut updated = self.clone();
        let projection = transform.projection((1, 1)).invert();

        for point in updated.0.values_mut() {
            point.transform(&projection);
        }

        updated
    }
}
