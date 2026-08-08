# đường dẫn: src/backend/core_ai/tools/practice_tools.py
import json
import random
import os

# Tính toán đường dẫn tương đối từ file tool này ngược ra thư mục src/data
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
DATA_FILE = os.path.join(BASE_DIR, "data", "interview_questions.json")

def get_practice_question_tool(field: str, difficulty: str) -> str:
    """Truy xuất một câu hỏi phỏng vấn ngẫu nhiên từ kho dữ liệu."""
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            questions = data.get("questions", [])
            
        matching_questions = [
            q for q in questions 
            if q["field"].lower() == field.lower() and q["difficulty"].lower() == difficulty.lower()
        ]
        
        if not matching_questions:
            return f"Không tìm thấy câu hỏi nào cho lĩnh vực {field} mức độ {difficulty}."
            
        selected = random.choice(matching_questions)
        # Trả về chuỗi JSON string để AI dễ đọc
        return json.dumps({
            "question": selected["question"],
            "model_answer": selected["answer"]
        }, ensure_ascii=False)
        
    except FileNotFoundError:
        return "Lỗi: Không thể truy cập kho dữ liệu câu hỏi."