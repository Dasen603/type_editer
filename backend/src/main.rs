mod db;
mod handlers;
mod models;

use axum::{
    routing::{get, post, put, delete},
    Router,
};
use sqlx::sqlite::SqlitePool;
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Initialize database
    let db_pool = db::init_db().await?;
    
    let state = AppState { db: db_pool };

    // Build our application with routes
    let app = Router::new()
        // Document routes
        .route("/api/documents", get(handlers::list_documents))
        .route("/api/documents", post(handlers::create_document))
        .route("/api/documents/:id", get(handlers::get_document))
        .route("/api/documents/:id", put(handlers::update_document))
        .route("/api/documents/:id", delete(handlers::delete_document))
        
        // Node routes
        .route("/api/nodes", post(handlers::create_node))
        .route("/api/nodes/:id", get(handlers::get_node))
        .route("/api/nodes/:id", put(handlers::update_node))
        .route("/api/nodes/:id", delete(handlers::delete_node))
        .route("/api/documents/:doc_id/nodes", get(handlers::list_nodes))
        
        // Content routes
        .route("/api/content/:node_id", get(handlers::get_content))
        .route("/api/content/:node_id", put(handlers::save_content))
        
        // File upload
        .route("/api/upload", post(handlers::upload_file))
        
        // PDF export
        .route("/api/export/pdf", post(handlers::export_pdf))
        
        // Serve uploaded files
        .nest_service("/uploads", ServeDir::new("../uploads"))
        
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await?;
    
    tracing::info!("Backend server listening on {}", listener.local_addr()?);
    
    axum::serve(listener, app).await?;

    Ok(())
}
