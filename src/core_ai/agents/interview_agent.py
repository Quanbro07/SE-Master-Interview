from pydantic import BaseModel, Field
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# ==========================================
# Cấu trúc JSON bắt buộc Gemini phải trả về
# ==========================================
class FollowUpResponse(BaseModel):
    is_pass: bool = Field(
        description="True if the candidate's answer is generally correct or shows understanding. False if entirely wrong, irrelevant, or they say 'I don't know'."
    )
    evaluation: str = Field(
        description="A short, clear evaluation (in Vietnamese) of the candidate's answer. Why is it right or wrong?"
    )
    next_question: Optional[str] = Field(
        description="The follow-up probing question in Vietnamese. MUST be null if is_pass is False."
    )
    action: str = Field(
        description="Must be exactly 'CONTINUE_FOLLOW_UP' if is_pass is True, or 'SKIP_TO_NEXT_MAIN_QUESTION' if is_pass is False."
    )

# ==========================================
# Hàm xử lý cốt lõi
# ==========================================
def generate_follow_up_question(position: str, main_question: str, user_answer: str) -> dict:
    # 1. Khởi tạo model và ép kiểu output
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash").with_structured_output(FollowUpResponse, method="json_schema")
    
    # 2. Xây dựng Prompt (Trái tim của tính năng)
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """Bạn là một chuyên gia phỏng vấn kỹ thuật cấp cao (Technical Interviewer) cực kỳ sắc sảo.
        Bạn đang phỏng vấn ứng viên cho vị trí: {position}.
        
        Nhiệm vụ của bạn là đánh giá câu trả lời của ứng viên và quyết định bước tiếp theo:
        1. XÁC ĐỊNH ĐÚNG/SAI: Đọc kỹ câu hỏi và câu trả lời. 
           - Nếu ứng viên trả lời sai hoàn toàn, lạc đề, hoặc nói không biết -> Đánh rớt câu này (is_pass = false).
           - Nếu ứng viên trả lời đúng, hoặc có ý đúng -> Cho qua (is_pass = true).
           
        2. HÀNH ĐỘNG TƯƠNG ỨNG:
           - Nếu (is_pass == false): next_question phải là null. action là 'SKIP_TO_NEXT_MAIN_QUESTION'.
           - Nếu (is_pass == true): Dựa vào câu trả lời của họ, hãy tạo ra 01 câu hỏi xoáy (next_question) cực kỳ hóc búa, đi sâu vào bản chất kỹ thuật, hoặc đưa ra một tình huống (case study) ép họ phải áp dụng kiến thức vừa nói để giải quyết. action là 'CONTINUE_FOLLOW_UP'.
           
        LƯU Ý: Phản hồi (evaluation và next_question) phải viết bằng tiếng Việt chuyên ngành, tự nhiên và chuyên nghiệp."""),
        
        ("user", """
        - Câu hỏi đang hỏi: {main_question}
        - Câu trả lời của ứng viên: {user_answer}
        
        Hãy đánh giá và đưa ra hành động.
        """)
    ])
    
    # 3. Nối chuỗi và thực thi
    chain = prompt_template | llm
    
    # Gọi AI và lấy kết quả
    result = chain.invoke({
        "position": position,
        "main_question": main_question,
        "user_answer": user_answer
    })
    
    # Trả về dạng dictionary để API FastAPI dễ đọc
    return result.model_dump()