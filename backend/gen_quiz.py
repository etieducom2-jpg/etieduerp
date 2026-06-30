"""Simple quiz generator - run one topic at a time"""
import asyncio
import os
import json
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import sys

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'institute_management')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

ALL_TOPICS = [
    ("CEH - Certified Ethical Hacking", "Ethical Hacking, penetration testing, vulnerability assessment, network security"),
    ("Python Programming", "Python syntax, data structures, OOP, file handling, modules, best practices"),
    ("Linux Administration", "Linux file systems, user management, networking, shell scripting"),
    ("Computer Networking", "OSI model, TCP/IP, routing, switching, protocols, network security"),
    ("Full Stack Web Development", "HTML, CSS, JavaScript, React, Node.js, databases, APIs"),
    ("Web Designing", "UI/UX, responsive design, HTML5, CSS3, Bootstrap"),
    ("CompTIA Security+", "Threats, vulnerabilities, access control, cryptography, network security"),
    ("Advanced Excel", "VLOOKUP, pivot tables, macros, VBA, data analysis"),
    ("Data Analytics", "Data cleaning, visualization, statistical analysis, SQL"),
    ("Power BI", "Data modeling, DAX, visualizations, reports, dashboards"),
    ("Basics of Computer (MS-Office)", "Word, Excel, PowerPoint, Outlook basics"),
    ("Tally Prime with GST", "Accounting, GST, inventory, payroll, taxation"),
    ("Digital Marketing", "SEO, SEM, social media, content marketing, analytics"),
    ("Graphic Designing", "Photoshop, Illustrator, design principles, typography"),
    ("UI/UX Designing", "User research, wireframing, prototyping, Figma"),
]

async def generate_quiz(topic_index):
    name, desc = ALL_TOPICS[topic_index]
    print(f"\n{'='*60}")
    print(f"Generating quiz for: {name}")
    print(f"{'='*60}")
    
    # Check if exists
    existing = await db.quiz_exams.find_one({"title": name})
    if existing:
        print(f"Quiz already exists! Skipping...")
        return True
    
    all_questions = []
    
    for batch in range(4):  # 4 batches of 25 = 100 questions
        print(f"Batch {batch+1}/4...")
        
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"quiz-gen-{topic_index}-{batch}",
            system_message="You are an expert exam creator. Return ONLY valid JSON array."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create 25 unique multiple choice questions for: {name}
Topic: {desc}

Return a JSON array with this format:
[{{"question": "What is...", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": 0, "difficulty": "easy"}}]

correct_answer is the INDEX (0-3) of the correct option.
Mix difficulties: easy, medium, hard.
Batch {batch+1} of 4 - make these unique."""

        try:
            response = await chat.send_message(UserMessage(text=prompt))
            response = response.strip()
            
            # Clean markdown
            if "```" in response:
                parts = response.split("```")
                for part in parts:
                    if part.strip().startswith("["):
                        response = part.strip()
                        break
                    elif "json" in part[:10]:
                        response = part.replace("json", "").strip()
                        break
            
            questions = json.loads(response)
            all_questions.extend(questions)
            print(f"  Got {len(questions)} questions")
            
        except Exception as e:
            print(f"  Error: {e}")
        
        await asyncio.sleep(2)
    
    if len(all_questions) >= 50:
        exam = {
            "id": str(uuid.uuid4()),
            "title": name,
            "description": desc,
            "duration": 90,
            "passing_score": 70,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "questions": [{
                "id": str(uuid.uuid4()),
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correct_answer": q.get("correct_answer", 0),
                "difficulty": q.get("difficulty", "medium")
            } for q in all_questions]
        }
        await db.quiz_exams.insert_one(exam)
        print(f"\nSUCCESS: Created {name} with {len(all_questions)} questions!")
        return True
    else:
        print(f"\nFAILED: Only {len(all_questions)} questions generated")
        return False

async def main():
    if len(sys.argv) > 1:
        idx = int(sys.argv[1])
        await generate_quiz(idx)
    else:
        # Generate all
        for i in range(len(ALL_TOPICS)):
            await generate_quiz(i)
            print(f"\nCompleted {i+1}/{len(ALL_TOPICS)} topics")

if __name__ == "__main__":
    asyncio.run(main())
