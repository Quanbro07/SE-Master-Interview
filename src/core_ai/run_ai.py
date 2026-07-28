import os
import sys
import json
import httpx
import tempfile
import asyncio

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from core_ai.agents.cv_parsing_agent import parse_cv
from core_ai.agents.cv_layout_agent import score_cv_layout
from core_ai.agents.cv_scoring_agent import score_cv_content

async def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments. Usage: python run_ai.py <position_name> <cv_url>"}))
        sys.exit(1)
        
    position_name = sys.argv[1]
    cv_url = sys.argv[2]

    temp_pdf_path = None
    is_temp_file = False
    
    try:
        # 2. Xử lý đường dẫn file: Phân biệt Link Web và File Local
        if cv_url.startswith("http://") or cv_url.startswith("https://"):
            async with httpx.AsyncClient(follow_redirects=True) as client:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
                response = await client.get(cv_url, headers=headers)
                
                if response.status_code != 200:
                    print(json.dumps({"error": f"Cannot download CV. Server returned status: {response.status_code}"}))
                    sys.exit(1)
                
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
                    tmp_file.write(response.content)
                    temp_pdf_path = tmp_file.name
                    is_temp_file = True
        else:
            # Xử lý file local
            if not os.path.exists(cv_url):
                print(json.dumps({"error": f"Local file not found at path: {cv_url}"}))
                sys.exit(1)
            temp_pdf_path = cv_url

        # 3. Chạy qua các Agent
        parsed_data = parse_cv(temp_pdf_path)
        layout_result = score_cv_layout(temp_pdf_path) 
        content_result = score_cv_content(parsed_data, position_name)

        # 4. Tính toán Overall Score
        layout_score = layout_result.get("layout_score", 0)
        match_score = content_result.get("match_score", 0)
        overall_score = round((layout_score * 0.2) + (match_score * 0.8), 2)

        # 5. Xây dựng kết quả (Payload)
        final_result = {
            "cv_url": cv_url,
            "overall_score": overall_score,
            "match_score": match_score,
            "match_comment": content_result.get("match_comment", ""),
            "layout_comment": layout_result.get("layout_comment", "Layout is clean and professional."),
            "improvement_suggestion": content_result.get("improvement_suggestion", ""),
            "section_feedbacks": content_result.get("section_feedbacks", [])
        }
        with open("cv_assessment_output.json", "w", encoding="utf-8") as f:
            json.dump(final_result, f, ensure_ascii=False, indent=4)
        # In ra cục JSON cuối cùng
        print(json.dumps(final_result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
        
    finally:
        # Chỉ xóa file nếu nó là file tạm tải từ trên mạng về
        if is_temp_file and temp_pdf_path and os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)

if __name__ == "__main__":
    asyncio.run(main())