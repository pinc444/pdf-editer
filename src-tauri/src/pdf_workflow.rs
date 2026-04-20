use base64::Engine;
use lopdf::Document;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

#[derive(Default)]
pub struct AppSessions {
    pub sessions: Mutex<HashMap<String, WorkflowState>>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    pub page: usize,
    pub tool: String,
    pub text: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenPdfResult {
    pub session_id: String,
    pub file_path: String,
    pub page_count: usize,
    pub page_order: Vec<usize>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub output_path: String,
    pub metadata_path: String,
    pub limitations: Vec<String>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub session_id: String,
    pub file_path: String,
    pub page_count: usize,
    pub page_order: Vec<usize>,
    pub annotations: Vec<Annotation>,
}

#[derive(Clone)]
pub struct WorkflowState {
    pub session_id: String,
    pub file_path: String,
    pub page_count: usize,
    pub page_order: Vec<usize>,
    pub annotations: Vec<Annotation>,
}

fn validate_page_order(page_order: &[usize], page_count: usize) -> Result<(), String> {
    if page_order.len() != page_count {
        return Err("Page order length does not match page count".to_string());
    }

    let unique: HashSet<usize> = page_order.iter().copied().collect();
    if unique.len() != page_count {
        return Err("Page order contains duplicates".to_string());
    }

    let expected: HashSet<usize> = (1..=page_count).collect();
    if unique != expected {
        return Err("Page order must contain every page exactly once".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn open_pdf(path: String, sessions: State<AppSessions>) -> Result<OpenPdfResult, String> {
    let pdf_path = Path::new(&path);
    if !pdf_path.exists() {
        return Err("PDF file does not exist".to_string());
    }

    let document = Document::load(pdf_path).map_err(|error| error.to_string())?;
    let page_count = document.get_pages().len();
    if page_count == 0 {
        return Err("PDF has no pages".to_string());
    }

    let page_order: Vec<usize> = (1..=page_count).collect();
    let session_id = Uuid::new_v4().to_string();

    let state = WorkflowState {
        session_id: session_id.clone(),
        file_path: path.clone(),
        page_count,
        page_order: page_order.clone(),
        annotations: vec![],
    };

    let mut map = sessions
        .sessions
        .lock()
        .map_err(|_| "Unable to access session store".to_string())?;
    map.insert(session_id.clone(), state);

    Ok(OpenPdfResult {
        session_id,
        file_path: path,
        page_count,
        page_order,
    })
}

#[tauri::command]
pub fn read_pdf_bytes(path: String) -> Result<String, String> {
    let file_bytes = fs::read(path).map_err(|error| error.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(file_bytes))
}

#[tauri::command]
pub fn add_annotation(
    session_id: String,
    annotation: Annotation,
    sessions: State<AppSessions>,
) -> Result<(), String> {
    let mut map = sessions
        .sessions
        .lock()
        .map_err(|_| "Unable to access session store".to_string())?;

    let session = map
        .get_mut(&session_id)
        .ok_or_else(|| "Session not found".to_string())?;

    if annotation.page == 0 || annotation.page > session.page_count {
        return Err("Annotation page is out of range".to_string());
    }

    session.annotations.push(annotation);
    Ok(())
}

#[tauri::command]
pub fn update_page_order(
    session_id: String,
    page_order: Vec<usize>,
    sessions: State<AppSessions>,
) -> Result<Vec<usize>, String> {
    let mut map = sessions
        .sessions
        .lock()
        .map_err(|_| "Unable to access session store".to_string())?;

    let session = map
        .get_mut(&session_id)
        .ok_or_else(|| "Session not found".to_string())?;

    validate_page_order(&page_order, session.page_count)?;
    session.page_order = page_order.clone();

    Ok(page_order)
}

#[tauri::command]
pub fn get_session(session_id: String, sessions: State<AppSessions>) -> Result<SessionSnapshot, String> {
    let map = sessions
        .sessions
        .lock()
        .map_err(|_| "Unable to access session store".to_string())?;

    let session = map
        .get(&session_id)
        .ok_or_else(|| "Session not found".to_string())?;

    Ok(SessionSnapshot {
        session_id: session.session_id.clone(),
        file_path: session.file_path.clone(),
        page_count: session.page_count,
        page_order: session.page_order.clone(),
        annotations: session.annotations.clone(),
    })
}

#[tauri::command]
pub fn export_session(
    session_id: String,
    output_path: String,
    sessions: State<AppSessions>,
) -> Result<ExportResult, String> {
    let session = {
        let map = sessions
            .sessions
            .lock()
            .map_err(|_| "Unable to access session store".to_string())?;

        map.get(&session_id)
            .cloned()
            .ok_or_else(|| "Session not found".to_string())?
    };

    fs::copy(&session.file_path, &output_path).map_err(|error| error.to_string())?;

    let metadata_path = format!("{}.workflow.json", output_path);

    let snapshot = SessionSnapshot {
        session_id: session.session_id,
        file_path: session.file_path,
        page_count: session.page_count,
        page_order: session.page_order,
        annotations: session.annotations,
    };

    let metadata = serde_json::to_string_pretty(&snapshot).map_err(|error| error.to_string())?;
    fs::write(&metadata_path, metadata).map_err(|error| error.to_string())?;

    Ok(ExportResult {
        output_path,
        metadata_path,
        limitations: vec![
            "Annotations and reordered pages are stored in sidecar metadata for MVP.".to_string(),
            "The exported PDF is a file copy of the original source document.".to_string(),
        ],
    })
}

#[cfg(test)]
mod tests {
    use super::validate_page_order;

    #[test]
    fn accepts_valid_order() {
        assert!(validate_page_order(&[3, 1, 2], 3).is_ok());
    }

    #[test]
    fn rejects_duplicates() {
        assert!(validate_page_order(&[1, 1, 2], 3).is_err());
    }

    #[test]
    fn rejects_missing_page() {
        assert!(validate_page_order(&[1, 2], 3).is_err());
    }
}
