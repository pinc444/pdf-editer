#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod pdf_workflow;

use pdf_workflow::{
    add_annotation, export_session, get_session, open_pdf, read_pdf_bytes, update_page_order, AppSessions,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppSessions::default())
        .invoke_handler(tauri::generate_handler![
            open_pdf,
            read_pdf_bytes,
            add_annotation,
            update_page_order,
            get_session,
            export_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
