import os
import sys
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

def generate_next_question(cv_text: str, jd_text: str, chat_history: list) -> dict:
    model = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=os.getenv("GOOGLE_API_KEY")
    )
    
    system_prompt = """You are a strict, highly technical Senior IT Interviewer.
    Context:
    - Target Role: {jd_text}
    - Candidate Info (Skills & Projects): {cv_text}
    
    RULES:
    1. If chat history is empty, ask the FIRST question based on a significant project or core skill in the Candidate Info.
    2. If there is chat history, deeply analyze the candidate's LAST ANSWER. 
    3. Ask a follow-up (deep dive) question to test their actual understanding (e.g., "Why?", "How did you handle the edge case?", or "What are the trade-offs?").
    4. Do not drill down more than 2-3 questions on a single concept. If reached, move to a new technical topic or ask a soft skill/teamwork question.
    5. KEEP IT NATURAL. Act like a real conversation.
    6. CRITICAL: Output ONLY the exact question text in ENGLISH. No greetings, no explanations.
    """
    
    # Khởi tạo bộ nhớ (giả lập) bằng danh sách messages
    messages = [("system", system_prompt)]
    
    # Đổ lịch sử chat do Spring Boot truyền vào
    for turn in chat_history:
        if turn["role"] == "interviewer":
            messages.append(("ai", turn["content"]))
        elif turn["role"] == "candidate":
            messages.append(("human", turn["content"]))
            
    # Lệnh chốt hạ
    messages.append(("human", "Based on the context and conversation above, generate ONLY your next question."))
    
    prompt = ChatPromptTemplate.from_messages(messages)
    formatted_prompt = prompt.invoke({"jd_text": jd_text, "cv_text": cv_text})
    
    response = model.invoke(formatted_prompt)
    
    return {"next_question": response.content.strip()}

# =====================================================================
# Khối lệnh này để Spring Boot gọi file qua Command Line (ProcessBuilder)
# =====================================================================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing JSON input payload."}))
        sys.exit(1)
        
    try:
        payload = json.loads(sys.argv[1])
        
        cv_text = payload.get("cv_text", "")
        jd_text = payload.get("jd_text", "IT Candidate")
        chat_history = payload.get("chat_history", [])
        
        result = generate_next_question(cv_text, jd_text, chat_history)
        
        print(json.dumps(result, ensure_ascii=False))
        
    except json.JSONDecodeError:
        print(json.dumps({"error": "Invalid JSON format in arguments."}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))