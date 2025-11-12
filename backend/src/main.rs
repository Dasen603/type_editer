mod db;
mod handlers;
mod models;

use axum::{
    extract::State,
    routing::{get, post, put, delete},
    Router,
};
use sqlx::sqlite::SqlitePool;
use std::sync::Arc;
use tower_http::cors::{CorsLayer, AllowOrigin};
use tower_http::services::ServeDir;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
}

// Health check handler
async fn health_check(State(state): State<AppState>) -> axum::response::Json<serde_json::Value> {
    // Quick database health check
    let db_healthy = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();
    
    axum::response::Json(serde_json::json!({
        "status": if db_healthy { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "uptime": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    }))
}

// Detailed health check handler
async fn detailed_health_check(State(state): State<AppState>) -> axum::response::Json<serde_json::Value> {
    let db_healthy = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();
    
    axum::response::Json(serde_json::json!({
        "status": if db_healthy { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "uptime": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        "database": {
            "connected": db_healthy
        }
    }))
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

    // CORS configuration
    let allowed_origins_str = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5000,http://localhost:3000".to_string());
    
    let mut allowed_origins: Vec<axum::http::HeaderValue> = allowed_origins_str
        .split(',')
        .filter_map(|s| {
            s.trim().parse().map_err(|e| {
                tracing::warn!("Invalid CORS origin '{}': {}", s.trim(), e);
            }).ok()
        })
        .collect();
    
    if allowed_origins.is_empty() {
        tracing::warn!("No valid CORS origins configured, using defaults");
        // Fallback to default origins if parsing failed
        allowed_origins = vec![
            "http://localhost:5000".parse().expect("Hardcoded origin should be valid"),
            "http://localhost:3000".parse().expect("Hardcoded origin should be valid"),
        ];
    }

    // Build our application with routes
    let app = Router::new()
        // Health check routes (before API routes)
        .route("/health", get(health_check))
        .route("/health/detailed", get(detailed_health_check))
        
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
                .allow_origin(AllowOrigin::list(allowed_origins))
                .allow_methods([
                    axum::http::Method::GET,
                    axum::http::Method::POST,
                    axum::http::Method::PUT,
                    axum::http::Method::DELETE,
                    axum::http::Method::OPTIONS,
                ])
                .allow_headers([
                    axum::http::header::CONTENT_TYPE,
                    axum::http::header::AUTHORIZATION,
                ])
                .allow_credentials(true),
        )
        .with_state(state);

    let port = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".to_string())
        .parse::<u16>()
        .unwrap_or(3001);
    
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port))
        .await?;
    
    tracing::info!("Backend server listening on {}", listener.local_addr()?);
    
    axum::serve(listener, app).await?;

    Ok(())
}
