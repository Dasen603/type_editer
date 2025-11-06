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
        "INSERT INTO nodes (document_id, parent_id, node_type, title, order_index, indent_level) 
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(payload.document_id)
    .bind(payload.parent_id)
    .bind(&payload.node_type)
    .bind(&payload.title)
    .bind(payload.order_index)
    .bind(payload.indent_level)
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

// File upload handler
pub async fn upload_file(
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, StatusCode> {
    while let Some(field) = multipart.next_field().await.unwrap() {
        let name = field.file_name().unwrap_or("unknown").to_string();
        let data = field.bytes().await.unwrap();

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let filename = format!("{}_{}", timestamp, name);
        let filepath = format!("../uploads/{}", filename);

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
