import os
import base64
import fitz
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Cập nhật Schema cho gọn gàng và khớp với API
class CVLayoutScore(BaseModel):
    layout_score: float = Field(description="Score for the CV's layout and design aesthetics (0 to 100).")
    layout_comment: str = Field(description="A comprehensive evaluation of the CV's layout, UI/UX, formatting, pros, cons, and professionalism in ENGLISH.")

def _convert_pdf_to_base64_image(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    page = doc.load_page(0) 
    pix = page.get_pixmap(dpi=150)
    img_bytes = pix.tobytes("png")
    return base64.b64encode(img_bytes).decode("utf-8")

def score_cv_layout(pdf_path: str) -> dict:
    img_b64 = _convert_pdf_to_base64_image(pdf_path)
    
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
    ).with_structured_output(CVLayoutScore, method="json_schema")
    
    message = HumanMessage(
        content=[
            {
                "type": "text", 
                "text": (
                   "You are a professional design expert and HR Tech Recruiter. Analyze this CV image "
                    "and evaluate its aesthetic appeal. Focus entirely on: Layout, Whitespace, Typography.\n"
                    "CRITICAL REQUIREMENT 1: You MUST write your evaluation (layout_comment) entirely in ENGLISH.\n"
                    "CRITICAL REQUIREMENT 2: Keep your comment EXTREMELY SHORT and CONCISE. Maximum 2 sentences. Be direct and straight to the point. DO NOT write long paragraphs."
                )
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img_b64}"}
            }
        ]
    )
    
    response = model.invoke([message])
    return response.model_dump()