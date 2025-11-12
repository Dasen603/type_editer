use crate::models::*;
use crate::AppState;
use axum::{
    extract::{Multipart, Path, State},
    http::StatusCode,
    Json,
};
use serde_json::json;
use sqlx::Row;
use std::io::Write;

// Document handlers
pub async fn list_documents(
    State(state): State<AppState>,
) -> Result<Json<Vec<Document>>, StatusCode> {
    let documents = sqlx::query_as::<_, Document>("SELECT * FROM documents ORDER BY updated_at DESC")
        .fetch_all(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(documents))
}

pub async fn create_document(
    State(state): State<AppState>,
    Json(payload): Json<CreateDocumentRequest>,
) -> Result<Json<Document>, StatusCode> {
    let result = sqlx::query(
        "INSERT INTO documents (title) VALUES (?)"
    )
    .bind(&payload.title)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(doc))
}

pub async fn get_document(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Document>, StatusCode> {
    let doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(doc))
}

pub async fn update_document(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<CreateDocumentRequest>,
) -> Result<Json<Document>, StatusCode> {
    sqlx::query("UPDATE documents SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(&payload.title)
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let doc = sqlx::query_as::<_, Document>("SELECT * FROM documents WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(doc))
}

pub async fn delete_document(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("DELETE FROM documents WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Node handlers
pub async fn list_nodes(
    State(state): State<AppState>,
    Path(doc_id): Path<i64>,
) -> Result<Json<Vec<Node>>, StatusCode> {
    let nodes = sqlx::query_as::<_, Node>(
        "SELECT * FROM nodes WHERE document_id = ? ORDER BY order_index"
    )
    .bind(doc_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(nodes))
}

pub async fn create_node(
    State(state): State<AppState>,
    Json(payload): Json<CreateNodeRequest>,
) -> Result<Json<Node>, StatusCode> {
    let result = sqlx::query(
        "INSERT INTO nodes (document_id, parent_id, node_type, title, order_index, indent_level, image_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.document_id)
    .bind(payload.parent_id)
    .bind(&payload.node_type)
    .bind(&payload.title)
    .bind(payload.order_index)
    .bind(payload.indent_level)
    .bind(&payload.image_url)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let node = sqlx::query_as::<_, Node>("SELECT * FROM nodes WHERE id = ?")
        .bind(result.last_insert_rowid())
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(node))
}

pub async fn get_node(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Json<Node>, StatusCode> {
    let node = sqlx::query_as::<_, Node>("SELECT * FROM nodes WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(node))
}

pub async fn update_node(
    State(state): State<AppState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateNodeRequest>,
) -> Result<Json<Node>, StatusCode> {
    if let Some(title) = &payload.title {
        sqlx::query("UPDATE nodes SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(title)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(order_index) = payload.order_index {
        sqlx::query("UPDATE nodes SET order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(order_index)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(indent_level) = payload.indent_level {
        sqlx::query("UPDATE nodes SET indent_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(indent_level)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    if let Some(parent_id) = payload.parent_id {
        sqlx::query("UPDATE nodes SET parent_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(parent_id)
            .bind(id)
            .execute(&state.db)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    let node = sqlx::query_as::<_, Node>("SELECT * FROM nodes WHERE id = ?")
        .bind(id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(node))
}

pub async fn delete_node(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<StatusCode, StatusCode> {
    sqlx::query("DELETE FROM nodes WHERE id = ?")
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

// Content handlers
pub async fn get_content(
    State(state): State<AppState>,
    Path(node_id): Path<i64>,
) -> Result<Json<Content>, StatusCode> {
    let content = sqlx::query_as::<_, Content>("SELECT * FROM content WHERE node_id = ?")
        .bind(node_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    Ok(Json(content))
}

pub async fn save_content(
    State(state): State<AppState>,
    Path(node_id): Path<i64>,
    Json(payload): Json<SaveContentRequest>,
) -> Result<Json<Content>, StatusCode> {
    sqlx::query(
        "INSERT INTO content (node_id, content_json) VALUES (?, ?)
         ON CONFLICT(node_id) DO UPDATE SET content_json = ?, updated_at = CURRENT_TIMESTAMP"
    )
    .bind(node_id)
    .bind(&payload.content_json)
    .bind(&payload.content_json)
    .execute(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let content = sqlx::query_as::<_, Content>("SELECT * FROM content WHERE node_id = ?")
        .bind(node_id)
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(content))
}

// File validation constants
const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS: &[&str] = &[".jpg", ".jpeg", ".png", ".gif", ".webp"];

// Magic number signatures for image files
fn verify_image_magic_number(data: &[u8], extension: &str) -> bool {
    if data.len() < 4 {
        return false;
    }
    
    match extension {
        ".jpg" | ".jpeg" => {
            // JPEG: FF D8 FF
            data.len() >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF
        }
        ".png" => {
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            data.len() >= 8
                && data[0] == 0x89
                && data[1] == 0x50
                && data[2] == 0x4E
                && data[3] == 0x47
                && data[4] == 0x0D
                && data[5] == 0x0A
                && data[6] == 0x1A
                && data[7] == 0x0A
        }
        ".gif" => {
            // GIF: 47 49 46 38 (GIF87a or GIF89a)
            data.len() >= 4
                && data[0] == 0x47
                && data[1] == 0x49
                && data[2] == 0x46
                && data[3] == 0x38
        }
        ".webp" => {
            // WebP: RIFF header (52 49 46 46) followed by WEBP
            data.len() >= 12
                && data[0] == 0x52
                && data[1] == 0x49
                && data[2] == 0x46
                && data[3] == 0x46
                && &data[8..12] == b"WEBP"
        }
        _ => false,
    }
}

/// Sanitize filename to prevent path traversal attacks
fn sanitize_filename(filename: &str) -> String {
    use std::path::Path;
    
    // Get only the basename (remove any path components)
    let basename = Path::new(filename)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");
    
    // Remove any non-alphanumeric characters except dots, hyphens, and underscores
    let sanitized: String = basename
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' {
                c
            } else {
                '_'
            }
        })
        .collect();
    
    // Limit filename length
    const MAX_LENGTH: usize = 255;
    if sanitized.len() > MAX_LENGTH {
        if let Some(dot_pos) = sanitized.rfind('.') {
            let ext = &sanitized[dot_pos..];
            let name = &sanitized[..dot_pos.min(MAX_LENGTH - ext.len())];
            format!("{}{}", name, ext)
        } else {
            sanitized.chars().take(MAX_LENGTH).collect()
        }
    } else {
        sanitized
    }
}

// File upload handler
pub async fn upload_file(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    while let Some(field) = multipart.next_field().await
        .map_err(|_| StatusCode::BAD_REQUEST)? 
    {
        let original_name = field.file_name()
            .ok_or(StatusCode::BAD_REQUEST)?;
        
        let data = field.bytes().await
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        
        // Check file size
        if data.len() > MAX_FILE_SIZE {
            return Err(StatusCode::PAYLOAD_TOO_LARGE);
        }
        
        // Sanitize filename
        let sanitized_name = sanitize_filename(original_name);
        
        // Check file extension
        let extension = std::path::Path::new(&sanitized_name)
            .extension()
            .and_then(|ext| ext.to_str())
            .map(|ext| format!(".{}", ext.to_lowercase()))
            .ok_or(StatusCode::BAD_REQUEST)?;
        
        if !ALLOWED_EXTENSIONS.contains(&extension.as_str()) {
            return Err(StatusCode::BAD_REQUEST);
        }
        
        // Verify file content matches extension using magic numbers
        if !verify_image_magic_number(&data, &extension) {
            return Err(StatusCode::BAD_REQUEST);
        }
        
        // Generate timestamp-based filename
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .as_secs();
        
        let filename = format!("{}_{}", timestamp, sanitized_name);
        let filepath = format!("../uploads/{}", filename);
        
        // Create uploads directory if it doesn't exist
        std::fs::create_dir_all("../uploads")
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        
        // Write file
        let mut file = std::fs::File::create(&filepath)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        file.write_all(&data)
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        return Ok(Json(json!({
            "url": format!("/uploads/{}", filename),
            "filename": filename
        })));
    }

    Err(StatusCode::BAD_REQUEST)
}

// PDF export handler (placeholder - full implementation requires headless_chrome setup)
pub async fn export_pdf(
    State(state): State<AppState>,
    Json(payload): Json<ExportPdfRequest>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    // TODO: Implement full PDF generation with headless_chrome
    // For now, return a placeholder response
    
    Ok(Json(json!({
        "message": "PDF export not yet implemented",
        "document_id": payload.document_id,
        "template": payload.template
    })))
}
