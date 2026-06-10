import os
import requests
import json

url = "https://mfyrftpdhprjyouyjecd.supabase.co/rest/v1/unified_orders"
headers = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meXJmdHBkaHByanlvdXlqZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2MDI4MiwiZXhwIjoyMDk0OTM2MjgyfQ.0BePv_YwiQN5k21qrOJnyH-zr4-aiJsDEwZTlyB2PZU",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meXJmdHBkaHByanlvdXlqZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTM2MDI4MiwiZXhwIjoyMDk0OTM2MjgyfQ.0BePv_YwiQN5k21qrOJnyH-zr4-aiJsDEwZTlyB2PZU"
}

# Fetch all orders (we will paginate since there might be more than 1000 rows)
all_orders = []
offset = 0
limit = 1000
has_more = True

print("Fetching orders from Supabase...")
while has_more:
    # Use headers for range
    pag_headers = {**headers, "Range": f"{offset}-{offset + limit - 1}"}
    r = requests.get(url, headers=pag_headers)
    if r.status_code not in (200, 206):
        print("Error:", r.status_code, r.text)
        break
    data = r.json()
    all_orders.extend(data)
    print(f"Fetched {len(data)} rows (total: {len(all_orders)})")
    if len(data) < limit:
        has_more = False
    else:
        offset += limit

# Get project mapping
print("Fetching projects mapping...")
p_r = requests.get("https://mfyrftpdhprjyouyjecd.supabase.co/rest/v1/projects", headers=headers)
projects = {p["id"]: p for p in p_r.json()}

# Analyze landings
analysis = {}
for o in all_orders:
    p_id = o.get("project_id")
    p_name = projects.get(p_id, {}).get("name", "Unknown")
    p_slug = projects.get(p_id, {}).get("slug", "unknown")
    
    if p_slug not in analysis:
        analysis[p_slug] = {
            "name": p_name,
            "target_sheets": {},
            "page_urls": {},
            "original_sheets": {}
        }
    
    meta = o.get("metadata") or {}
    
    target_sheet = meta.get("target_sheet") or meta.get("targetSheet")
    if target_sheet:
        analysis[p_slug]["target_sheets"][target_sheet] = analysis[p_slug]["target_sheets"].get(target_sheet, 0) + 1
        
    page_url = meta.get("page_url") or meta.get("pageUrl") or meta.get("full_url") or meta.get("fullUrl")
    if page_url:
        analysis[p_slug]["page_urls"][page_url] = analysis[p_slug]["page_urls"].get(page_url, 0) + 1
        
    original_sheet = meta.get("original_sheet") or meta.get("originalSheet")
    if original_sheet:
        analysis[p_slug]["original_sheets"][original_sheet] = analysis[p_slug]["original_sheets"].get(original_sheet, 0) + 1

# Save results to output
output_path = r"c:\B&W Prod\B&W Prod\bnw-website\scratch\landings_report.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(analysis, f, ensure_ascii=False, indent=2)

print(f"\nAnalysis completed successfully! Results written to {output_path}")
