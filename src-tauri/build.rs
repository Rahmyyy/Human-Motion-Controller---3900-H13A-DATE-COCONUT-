fn main() {
    // tauri_build embeds the Common-Controls v6 manifest into the app binary only.
    // Test binaries link the same tao/webview2 code, which imports comctl32 v6-only
    // symbols (TaskDialogIndirect, SetWindowSubclass), so without a manifest they
    // resolve against legacy comctl32 v5 and fail to start with STATUS_ENTRYPOINT_NOT_FOUND.
    #[cfg(windows)]
    println!(
        "cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' \
         name='Microsoft.Windows.Common-Controls' version='6.0.0.0' \
         processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'"
    );

    tauri_build::build()
}
