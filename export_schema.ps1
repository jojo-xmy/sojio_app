# 双击即可运行的 Supabase schema 导出脚本
# 保存为 export_schema.ps1 并替换 PASSWORD

# ---------------- 配置 ----------------
$DB_USER = "postgres"
$DB_PASSWORD = "f5canBUigtX9Ifw4"   # 替换为 Supabase 控制台里的密码
$DB_HOST = "aws-0-ap-northeast-1.pooler.supabase.com"
$DB_PORT = "6543"
$DB_NAME = "postgres"
$OUTPUT_FILE = "schema.sql"

# ---------------- 构造连接 ----------------
$DB_URL = "postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?sslmode=require"

# ---------------- 导出 schema ----------------
Write-Host "正在导出 Supabase schema 到 $OUTPUT_FILE ..."
supabase db dump --db-url $DB_URL --file $OUTPUT_FILE --data-only false

# ---------------- 完成提示 ----------------
Write-Host "✅ 导出完成！文件位置：$(Resolve-Path $OUTPUT_FILE)"
Pause
