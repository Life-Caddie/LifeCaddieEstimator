import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

def extract_schema():
    conn = get_connection()
    cur = conn.cursor()

    # Get all user-created tables (excludes Supabase system tables)
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()

    md = "# Database Schema\n\n"

    for (table_name,) in tables:
        md += f"## Table: `{table_name}`\n\n"
        md += "| Column | Type | Nullable | Default |\n"
        md += "|--------|------|----------|---------|\n"

        # Get columns for each table
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = %s
            ORDER BY ordinal_position;
        """, (table_name,))
        columns = cur.fetchall()

        for col in columns:
            col_name, data_type, is_nullable, default = col
            default = default if default else "—"
            md += f"| {col_name} | {data_type} | {is_nullable} | {default} |\n"

        # Get foreign key relationships
        cur.execute("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = %s;
        """, (table_name,))
        foreign_keys = cur.fetchall()

        if foreign_keys:
            md += "\n**Relationships:**\n"
            for fk in foreign_keys:
                md += f"- `{fk[0]}` → `{fk[1]}.{fk[2]}`\n"

        md += "\n---\n\n"

    cur.close()
    conn.close()

    with open("schema.md", "w", encoding="utf-8") as f:
        f.write(md)

    print("✅ schema.md generated successfully!")

if __name__ == "__main__":
    extract_schema()