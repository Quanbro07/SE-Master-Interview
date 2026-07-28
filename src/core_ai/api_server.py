import os
import shutil
# Nhớ import thêm UploadFile, File, Form từ fastapi
from fastapi import FastAPI, HTTPException, UploadFile, File, Form 
from dotenv import load_dotenv

# Load biến môi trường
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

# Import 3 hàm xịn sò từ 3 file của ông
from core_ai.agents.cv_parsing_agent import parse_cv
from core_ai.agents.cv_layout_agent import score_cv_layout
from core_ai.agents.cv_scoring_agent import score_cv_content

app = FastAPI(title="AI CV Assessment API")

# Sửa lại API nhận form-data (file + position)
@app.post("/api/ai/cv-assessment")
async def api_cv_assessment(
    file: UploadFile = File(...), 
    position: str = Form(...)
):
    # Tạo một đường dẫn tạm để lưu file PDF vừa upload
    temp_file_path = f"temp_{file.filename}"
    
    try:
        # 1. Lưu file từ request xuống ổ cứng tạm thời
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Bóc tách dữ liệu từ file PDF (truyền file tạm vào)
        parsed_cv_data = parse_cv(temp_file_path)
        
        # 3. Chấm điểm Layout (UI/UX) của CV
        layout_result = score_cv_layout(temp_file_path)
        
        # 4. Chấm điểm Nội dung (Match với vị trí)
        # Truyền biến position vào thay cho job_description cũ
        scoring_result = score_cv_content(parsed_cv_data, position)
        
        # 5. Tính điểm tổng (overall_score)
        match_score = scoring_result.get("match_score", 0)
        layout_score = layout_result.get("layout_score", 0)
        overall_score = (match_score * 0.7) + (layout_score * 0.3)

        # 6. Gom thành 1 cục JSON
        final_response = {
            "overall_score": round(overall_score, 1),
            "match_score": match_score,
            "layout_score": layout_score,
            "match_comment": scoring_result.get("match_comment", ""),
            "layout_comment": layout_result.get("layout_comment", ""),
            "improvement_suggestion": scoring_result.get("improvement_suggestion", ""),
            "section_feedbacks": scoring_result.get("section_feedbacks", []),
            "parsed_data": parsed_cv_data 
        }
        
        return final_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    finally:
        # Quan trọng: Chạy xong thì xóa cái file tạm đi để khỏi rác server
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)