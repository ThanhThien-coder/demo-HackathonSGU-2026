# Local copy of simplifey-api-integrator skill
# Source: C:\Users\nquyleee\.gemini\config\skills\simplifey-api-integrator\SKILL.md

Quy trình chuẩn hóa và an toàn để tích hợp các API (từ Bước 0 đến Bước 13 trong API_INTEGRATION_PROMPTS.md) vào giao diện SimpliFey.
Hàm gọi tập trung tại src/lib/api.ts, dùng apiFetch, hỗ trợ Bearer token và dev mock / bypass auth, tuân thủ 100% contracts spec/02 và spec/03.
