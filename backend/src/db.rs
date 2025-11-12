use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use sqlx::Row;

pub async fn init_db() -> anyhow::Result<SqlitePool> {
    // Get database path from environment variable or use default
    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "../type_editor.db".to_string());
    
    // Ensure the path is absolute or relative to the project root
    let database_url = if db_path.starts_with("sqlite:") {
        db_path
    } else {
        format!("sqlite:{}", db_path)
    };
    
    tracing::info!("Connecting to database: {}", database_url);
    
    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    // Create tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        "#
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS nodes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            parent_id INTEGER,
            node_type TEXT NOT NULL,
            title TEXT NOT NULL,
            order_index INTEGER NOT NULL,
            indent_level INTEGER NOT NULL DEFAULT 0,
            image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(&pool)
    .await?;
    
    // Add image_url column if it doesn't exist (for existing databases)
    sqlx::query("ALTER TABLE nodes ADD COLUMN image_url TEXT")
        .execute(&pool)
        .await
        .ok(); // Ignore error if column already exists

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS content (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            node_id INTEGER NOT NULL UNIQUE,
            content_json TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE
        )
        "#
    )
    .execute(&pool)
    .await?;

    tracing::info!("Database initialized successfully");

    Ok(pool)
}
