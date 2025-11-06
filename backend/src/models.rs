use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: i64,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Node {
    pub id: i64,
    pub document_id: i64,
    pub parent_id: Option<i64>,
    pub node_type: String, // section, equation, figure
    pub title: String,
    pub order_index: i64,
    pub indent_level: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateNodeRequest {
    pub document_id: i64,
    pub parent_id: Option<i64>,
    pub node_type: String,
    pub title: String,
    pub order_index: i64,
    pub indent_level: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateNodeRequest {
    pub title: Option<String>,
    pub order_index: Option<i64>,
    pub indent_level: Option<i64>,
    pub parent_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Content {
    pub id: i64,
    pub node_id: i64,
    pub content_json: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveContentRequest {
    pub content_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportPdfRequest {
    pub document_id: i64,
    pub template: String, // paper, report, resume
}
