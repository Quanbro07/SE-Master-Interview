import json
from pydantic import BaseModel, Field
from typing import List
from firecrawl import Firecrawl

# 1. Initialize Firecrawl
app = Firecrawl(api_key="fc-f31f4c2923784e41898bdb7f9770e77b")

# 2. Define your exact JSON) schema using Pydantic
class InterviewQuestion(BaseModel):
    question: str = Field(description="The interview question. Must be conceptual only, absolutely no coding or algorithms.")
    answer: str = Field(description="A clear, concise explanation of the concept.")
    field: str = Field(description="Classify as exactly one of: 'quality assurance', 'software engineer', 'cloud computing'.")
    difficulty: str = Field(description="Classify as exactly one of: 'Fresher', 'Experienced'.")

class ExtractionSchema(BaseModel):
    questions: List[InterviewQuestion]

# 3. The target URLs
data_url = [
    "https://www.interviewbit.com/qa-interview-questions/",
    "https://www.interviewbit.com/cloud-computing-interview-questions/",
    "https://www.interviewbit.com/software-engineering-interview-questions/"
]

extracted_questions = []
# 4. Run the scrape in a loop
for url in data_url:
    print(f"\n--- Scraping {url} ---")
    try:
        result = app.scrape(
            url,
            formats=[{
                "type":"json",
                "prompt": "Find and extract conceptual, problem handle interview questions from this page. Ignore any questions that require writing code or solving algorithms. "
                          "Focus on high-level architecture, protocols, and definitions (e.g., 'What is an API?', 'Differentiate A and B').",
                "schema": ExtractionSchema.model_json_schema()}]
        )

        # 5. Output the result
        extracted_data = result.json
        # Add the questions from this page to our master list
        if extracted_data and "questions" in extracted_data:
            extracted_questions.extend(extracted_data["questions"])
            print(f"Successfully grabbed {len(extracted_data['questions'])} questions.")

    except Exception as e:
        print(f"An error occurred while scraping {url}: {e}")

# 5. Save everything to a JSON file
output_filename = "interview_questions.json"

with open(output_filename, "w", encoding="utf-8") as file:
    # We wrap the master list back into a dictionary so it matches your schema
    json.dump({"questions": extracted_questions}, file, indent=2, ensure_ascii=False)