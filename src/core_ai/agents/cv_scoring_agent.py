import os
from pydantic import BaseModel, Field
from typing import List
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. Định nghĩa cấu trúc chuẩn khớp 100% với Database của Spring Boot
class SectionFeedback(BaseModel):
    section_name: str = Field(
        description="MUST be exactly one of these strings: 'SCORE', 'SKILLS', 'EXPERIENCE'"    )
    score: float = Field(description="Score for this specific section on a scale of 0 to 100")
    comment: str = Field(description="Detailed evaluation and explanation in ENGLISH for this section")

class CVAssessmentResult(BaseModel):
    match_score: float = Field(description="Overall match score (0-100) based on gpa, skill, and experience")
    match_comment: str = Field(description="Overall assessment of the candidate's professional fit in ENGLISH")
    improvement_suggestion: str = Field(description="Suggestions for improvement, recommended courses or certifications in ENGLISH")
    section_feedbacks: List[SectionFeedback] = Field(
    description="Exactly 3 feedback objects corresponding to 'SCORE', 'SKILLS', and 'EXPERIENCE'"   
)

# 2. Định nghĩa Prompt ép tiếng Anh và logic chấm điểm theo dự án
scoring_prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "You are a strict Tech Lead and Senior HR Manager. Your job is to compare the structured CV data "
        "with the Position (Job Description) to accurately evaluate the candidate.\n"
        "CRITICAL REQUIREMENT 1: You MUST provide all your textual analysis entirely in ENGLISH.\n"
        "CRITICAL REQUIREMENT 2: For the 'SKILLS' section feedback, explicitly extract skills from the candidate's projects. "        "Projects with more functionalities matching the position should yield a higher score.\n"
        "CRITICAL REQUIREMENT 3: For the 'improvement_suggestion' section, recommend specific courses or certifications to fill any skill gaps.\n"
        "CRITICAL REQUIREMENT 4: KEEP ALL COMMENTS EXTREMELY CONCISE. Maximum 1-2 sentences per comment field. Do not over-explain."
        "Ensure the final JSON object matches the required schema fields exactly."
    )),
    ("human", "Position/Job Description:\n{job_description}\n\nParsed CV Data:\n{parsed_cv_data}")
])

def score_cv_content(parsed_cv_data: dict, job_description: str) -> dict:
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    ).with_structured_output(CVAssessmentResult, method="json_schema")
    
    prompt = scoring_prompt.invoke({
        "job_description": job_description,
        "parsed_cv_data": str(parsed_cv_data)  
    })
    
    response = model.invoke(prompt)
    return response.model_dump()