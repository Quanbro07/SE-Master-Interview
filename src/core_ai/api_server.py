import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from core_ai.agents.interview_agent import generate_follow_up_question

# Load biến môi trường chứa GOOGLE_API_KEY
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../../.env'))

# Import 3 hàm xịn sò từ 3 file của ông
from core_ai.agents.cv_parsing_agent import parse_cv
from core_ai.agents.cv_layout_agent import score_cv_layout
from core_ai.agents.cv_scoring_agent import score_cv_content

app = FastAPI(title="AI CV Assessment API")

# Cấu trúc JSON nhận từ Java Backend
class CvAssessmentRequest(BaseModel):
    job_description: str
    cv_file_path: str

class FollowUpRequest(BaseModel):
    position: str
    main_question: str
    user_answer: str

@app.post("/api/ai/cv-assessment")
async def api_cv_assessment(req: CvAssessmentRequest):
    try:
        # 1. Bóc tách dữ liệu từ file PDF
        parsed_cv_data = parse_cv(req.cv_file_path)
        
        # 2. Chấm điểm Layout (UI/UX) của CV
        layout_result = score_cv_layout(req.cv_file_path)
        
        # 3. Chấm điểm Nội dung (Match với JD) dựa trên dữ liệu đã parse
        scoring_result = score_cv_content(parsed_cv_data, req.job_description)
        
        # 4. Tính điểm tổng (overall_score) 
        # Giả sử: Match Score chiếm 70% trọng số, Layout Score chiếm 30%
        match_score = scoring_result.get("match_score", 0)
        layout_score = layout_result.get("layout_score", 0)
        overall_score = (match_score * 0.7) + (layout_score * 0.3)

        # 5. Gom thành 1 cục JSON khớp 100% với Database của ông
        final_response = {
            "overall_score": round(overall_score, 1),
            "match_score": match_score,
            "layout_score": layout_score,
            "match_comment": scoring_result.get("match_comment", ""),
            "layout_comment": layout_result.get("layout_comment", ""),
            "improvement_suggestion": scoring_result.get("improvement_suggestion", ""),
            "section_feedbacks": scoring_result.get("section_feedbacks", []),
        }
        
        return final_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@app.post("/api/ai/interview/generate-follow-up")
async def api_generate_follow_up(req: FollowUpRequest):
    try:
        # Gọi hàm AI Agent vừa viết
        result = generate_follow_up_question(
            position=req.position,
            main_question=req.main_question,
            user_answer=req.user_answer
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))