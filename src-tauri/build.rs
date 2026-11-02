fn main() {
    tauri_build::build();

    // Integration tests and examples link tauri too, so they need the
    // Common-Controls v6 manifest that tauri-build only embeds into bins.
    #[cfg(windows)]
    {
        println!("cargo:rerun-if-changed=windows/test-manifest.rc");
        println!("cargo:rerun-if-changed=windows/test-manifest.xml");
        embed_resource::compile_for_tests("windows/test-manifest.rc", embed_resource::NONE)
            .manifest_required()
            .unwrap();
        embed_resource::compile_for_examples("windows/test-manifest.rc", embed_resource::NONE)
            .manifest_required()
            .unwrap();
    }
}
