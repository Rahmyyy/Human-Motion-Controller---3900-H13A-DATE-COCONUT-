use image::RgbaImage;
use log::{info, warn};
use tauri::ipc::Channel;
use tokio::sync::mpsc;

#[derive(Clone)]
pub enum SenderThreadCommand {
    SendFrame {
        frame: RgbaImage,
        channel: Channel<Vec<u8>>,
        format: image::ImageFormat,
        size: Option<(i32, i32)>,
    },
    #[allow(dead_code)]
    Stop,
}

async fn frame_sender_thread(mut frame_rx: mpsc::Receiver<SenderThreadCommand>) {
    let mut encoder_buffer: Vec<u8> = Vec::new();

    loop {
        match frame_rx.recv().await.unwrap() {
            SenderThreadCommand::Stop => {
                info!("Stopping frame sender thread");
                break;
            }
            SenderThreadCommand::SendFrame {
                frame,
                channel,
                format,
                size,
            } => {
                encoder_buffer.clear();
                let mut cursor = std::io::Cursor::new(&mut encoder_buffer);

                let mut frame = match size {
                    Some((width, height)) => image::imageops::resize(
                        &frame,
                        width as u32,
                        height as u32,
                        ::image::imageops::FilterType::Triangle,
                    ),
                    None => frame,
                };

                image::imageops::flip_horizontal_in_place(&mut frame);

                let frame = image::DynamicImage::ImageRgba8(frame);

                if frame.write_to(&mut cursor, format).is_ok() {
                    if channel.send(encoder_buffer.clone()).is_err() {
                        warn!("Failed to send frame through channel");
                    }
                } else {
                    warn!("Failed to encode frame to {:?}", format);
                }
            }
        }
    }
}

pub fn start_frame_sender_thread() -> mpsc::Sender<SenderThreadCommand> {
    let (command_tx, command_rx) = mpsc::channel::<SenderThreadCommand>(5);

    tauri::async_runtime::spawn(frame_sender_thread(command_rx));

    command_tx
}
