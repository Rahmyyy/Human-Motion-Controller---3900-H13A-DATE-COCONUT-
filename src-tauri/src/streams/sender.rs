use image::RgbaImage;
use log::warn;
use tauri::ipc::Channel;

#[derive(Clone)]
pub struct SenderThreadCommand {
    pub frame: RgbaImage,
    pub channel: Channel<Vec<u8>>,
    pub format: image::ImageFormat,
    pub size: Option<(i32, i32)>,
}

impl SenderThreadCommand {
    pub fn send_frame(self) {
        let mut encoder_buffer: Vec<u8> = Vec::new();

        encoder_buffer.clear();
        let mut cursor = std::io::Cursor::new(&mut encoder_buffer);

        let mut frame = match self.size {
            Some((width, height)) => image::imageops::resize(
                &self.frame,
                width as u32,
                height as u32,
                ::image::imageops::FilterType::Triangle,
            ),
            None => self.frame,
        };

        image::imageops::flip_horizontal_in_place(&mut frame);

        let frame = image::DynamicImage::ImageRgba8(frame);

        if frame.write_to(&mut cursor, self.format).is_ok() {
            if self.channel.send(encoder_buffer.clone()).is_err() {
                warn!("Failed to send frame through channel");
            }
        } else {
            warn!("Failed to encode frame to {:?}", self.format);
        }
    }
}
