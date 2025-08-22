import { writeFileSync } from "fs";
import pkg from "pg";
import "dotenv/config";

const { Client } = pkg;

async function exportSchema() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
  });
  await client.connect();

  // 1. 表和字段
  const tablesRes = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    ORDER BY table_name;
  `);

  let output = "# 📂 Supabase Schema Export\n\n";

  for (const row of tablesRes.rows) {
    const tableName = row.table_name;
    output += `## 🗂 Table: \`${tableName}\`\n\n`;

    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);

    output += "| Column | Type | Nullable | Default |\n";
    output += "|--------|------|----------|---------|\n";
    cols.rows.forEach(c => {
      output += `| ${c.column_name} | ${c.data_type} | ${c.is_nullable} | ${c.column_default || ""} |\n`;
    });
    output += "\n";
  }

  // 2. 外键
  const fkRes = await client.query(`
    SELECT
      tc.table_name, kcu.column_name, 
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY';
  `);

  if (fkRes.rows.length) {
    output += "## 🔗 Foreign Keys\n\n";
    fkRes.rows.forEach(r => {
      output += `- ${r.table_name}.${r.column_name} → ${r.foreign_table_name}.${r.foreign_column_name}\n`;
    });
    output += "\n";
  }

  // 3. 索引
  const idxRes = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public';
  `);

  if (idxRes.rows.length) {
    output += "## 📑 Indexes\n\n";
    idxRes.rows.forEach(r => {
      output += `- (${r.tablename}) \`${r.indexname}\`: ${r.indexdef}\n`;
    });
    output += "\n";
  }

  // 4. 触发器
  const trgRes = await client.query(`
    SELECT event_object_table AS table_name,
           trigger_name,
           action_timing,
           event_manipulation AS event,
           action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
  `);

  if (trgRes.rows.length) {
    output += "## ⏱ Triggers\n\n";
    trgRes.rows.forEach(r => {
      output += `- Table: ${r.table_name}, Trigger: ${r.trigger_name}, When: ${r.action_timing} ${r.event}, Action: ${r.action_statement}\n`;
    });
    output += "\n";
  }

  await client.end();

  // 写入文件
  writeFileSync("schema.md", output, "utf-8");
  console.log("✅ Schema exported to schema.md");
}

exportSchema().catch(err => {
  console.error("❌ Error exporting schema:", err);
});
