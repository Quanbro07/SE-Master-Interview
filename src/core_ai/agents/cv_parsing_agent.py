import os
from pathlib import Path
from dotenv import load_dotenv

from pydantic import BaseModel, Field
from typing import List, Optional

from langchain_core.prompts import PromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from langchain_google_genai import ChatGoogleGenerativeAI

# Xác định đường dẫn file .env dựa trên vị trí file hiện tại
base_dir = Path(__file__).resolve().parent.parent.parent.parent
load_dotenv(dotenv_path=base_dir / '.env')

# --- ĐỊNH NGHĨA CẤU TRÚC PYDANTIC ---
class Education(BaseModel):
    university_name: str = Field(..., description='Name of the university')
    degree: str = Field(..., description='Degree Obtained')
    gpa: Optional[float] = Field(None, ge=0, le=10.0, description='GPA (0-10 scale)')

class Experience(BaseModel):
    company_name: Optional[str] = Field(None, description='Name of the company')
    n_years: Optional[int] = Field(None, ge=0, description='Number of years of experience in the company')
    project_name: Optional[str] = Field(None, description='Name of the Main Project')
    project_description: Optional[str] = Field(None, description='Role and achievements described in the project')
    tech_stack: Optional[str] = Field(None, description='Technologies and Tools used in the project')

class Resume(BaseModel):
    name: str = Field(..., description='Full name of the candidate')
    age: Optional[int] = Field(None, ge=0, description='Age of the candidate')
    email: str = Field(..., description='Email Address')
    phone_number: str = Field(..., description='Phone Number')
    experience: Optional[List[Experience]] = Field(None, description='List of professional Experience')
    education: Optional[List[Education]] = Field(None, description='Educational Background')
    languages: Optional[str] = Field(None, description='Languages Known')

# --- CẤU HÌNH PROMPT ---
resume_template = """
You are an AI assistant tasked with extracting structured information from a technical resume.

Only Extract the information that's present in the Resume class.

Resume Context:
{resume_text}
"""

prompt_template = PromptTemplate(
    template=resume_template,
    input_variables=['resume_text']
)

# --- HÀM CHÍNH ĐỂ AGENT BÊN NGOÀI GỌI ---
def parse_cv(file_path: str) -> dict:
    """
    Đọc file PDF CV và bóc tách thành dữ liệu cấu trúc JSON thông qua Gemini 2.5 Flash.
    """
    # 1. Khởi tạo model Gemini 2.5 Flash với cấu trúc đầu ra Resume
    # Đảm bảo lấy đúng GOOGLE_API_KEY từ file .env
    google_key = os.getenv("GOOGLE_API_KEY")
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash", 
        google_api_key=google_key
    ).with_structured_output(Resume, method="json_schema")

    # 2. Đọc và nạp nội dung từ file PDF
    loader = PyPDFLoader(file_path)
    docs = loader.load()
    resume_text = "\n".join([doc.page_content for doc in docs])

    # 3. Thực thi gọi Gemini phân tích dữ liệu
    prompt = prompt_template.invoke({'resume_text': resume_text})
    response = model.invoke(prompt)
    
    # 4. Trả về kết quả dưới dạng dictionary (JSON) sạch
    return response.model_dump()

# Khối này giúp bạn vẫn có thể ấn chạy trực tiếp file này bằng F5 để test độc lập nếu muốn
if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    test_pdf = os.path.join(current_dir, 'johndoe_resume.pdf')
    
    print("--- Đang chạy thử nghiệm độc lập Parsing Agent ---")
    if os.path.exists(test_pdf):
        result = parse_cv(test_pdf)
        print("Kết quả bóc tách thử nghiệm:\n", result)
    else:
        print(f"Không tìm thấy file test tại: {test_pdf}")