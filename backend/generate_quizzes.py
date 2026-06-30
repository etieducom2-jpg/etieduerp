"""
Quiz Question Generator Script
Generates industry-standard MCQ questions for various IT certification topics
"""
import asyncio
import os
import json
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv
import uuid

load_dotenv()

# MongoDB setup
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'institute_management')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Emergent LLM Key
LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Quiz topics with their details
QUIZ_TOPICS = [
    {"name": "CEH - Certified Ethical Hacking", "description": "Industry-standard questions on Ethical Hacking, penetration testing, vulnerability assessment, network security, and hacking techniques for CEH certification preparation."},
    {"name": "Python Programming", "description": "Python programming questions covering syntax, data structures, OOP, file handling, exceptions, modules, and best practices for intermediate to advanced level."},
    {"name": "Linux Administration", "description": "Linux system administration questions on file systems, user management, networking, security, shell scripting, and system maintenance."},
    {"name": "Computer Networking", "description": "Networking fundamentals including OSI model, TCP/IP, routing, switching, protocols, network security, and troubleshooting."},
    {"name": "Full Stack Web Development", "description": "Full stack development covering HTML, CSS, JavaScript, React, Node.js, databases, APIs, and deployment best practices."},
    {"name": "Web Designing", "description": "Web design principles including UI/UX, responsive design, HTML5, CSS3, Bootstrap, and modern design trends."},
    {"name": "CompTIA Security+", "description": "Security+ certification prep covering threats, vulnerabilities, access control, identity management, cryptography, and network security."},
    {"name": "Advanced Excel", "description": "Advanced Excel functions including VLOOKUP, pivot tables, macros, VBA, data analysis, charts, and automation."},
    {"name": "Data Analytics", "description": "Data analytics concepts including data cleaning, visualization, statistical analysis, SQL, and analytical thinking."},
    {"name": "Power BI", "description": "Microsoft Power BI questions on data modeling, DAX, visualizations, reports, dashboards, and data transformation."},
    {"name": "Basics of Computer (MS-Office)", "description": "Computer basics and MS Office (Word, Excel, PowerPoint, Outlook) questions for beginners and intermediate users."},
    {"name": "Tally Prime with GST", "description": "Tally Prime accounting software questions covering GST, inventory, payroll, taxation, and financial reporting."},
    {"name": "Digital Marketing", "description": "Digital marketing questions on SEO, SEM, social media marketing, content marketing, analytics, and campaign management."},
    {"name": "Graphic Designing", "description": "Graphic design questions on Adobe Photoshop, Illustrator, design principles, typography, color theory, and branding."},
    {"name": "UI/UX Designing", "description": "UI/UX design questions on user research, wireframing, prototyping, usability testing, Figma, and design systems."},
]

async def generate_questions_for_topic(topic_name: str, topic_description: str, num_questions: int = 100):
    """Generate MCQ questions for a specific topic using AI"""
    print(f"\n{'='*60}")
    print(f"Generating {num_questions} questions for: {topic_name}")
    print(f"{'='*60}")
    
    all_questions = []
    batch_size = 25  # Generate in batches to avoid token limits
    
    for batch_num in range(num_questions // batch_size):
        start_num = batch_num * batch_size + 1
        end_num = start_num + batch_size - 1
        
        print(f"  Generating questions {start_num}-{end_num}...")
        
        chat = LlmChat(
            api_key=LLM_KEY,
            session_id=f"quiz-gen-{topic_name.replace(' ', '-')}-{batch_num}",
            system_message="""You are an expert exam question creator for IT certification exams. 
Create high-quality multiple choice questions that test real understanding, not just memorization.
Each question should have exactly 4 options (A, B, C, D) with only one correct answer.
Questions should range from easy to difficult and cover different aspects of the topic.
Return ONLY valid JSON array, no other text."""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Create {batch_size} unique multiple choice questions for: {topic_name}

Topic Description: {topic_description}

Requirements:
1. Questions should be industry-standard, suitable for certification exams
2. Mix difficulty levels: 40% easy, 40% medium, 20% hard
3. Each question must have exactly 4 options
4. Only ONE option should be correct
5. Questions {start_num}-{end_num} should be unique and different from previous batches

Return ONLY a valid JSON array in this exact format:
[
  {{
    "question": "What is...",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correct_answer": 0,
    "difficulty": "easy"
  }}
]

Note: correct_answer is the INDEX (0-3) of the correct option.
Generate exactly {batch_size} questions."""

        try:
            response = await chat.send_message(UserMessage(text=prompt))
            
            # Clean the response - remove markdown code blocks if present
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            questions = json.loads(response_text)
            
            # Validate and clean questions
            for q in questions:
                if isinstance(q.get('correct_answer'), str):
                    # Convert letter to index
                    letter = q['correct_answer'].upper().replace(')', '').strip()
                    q['correct_answer'] = {'A': 0, 'B': 1, 'C': 2, 'D': 3}.get(letter, 0)
                
                # Ensure options don't have A), B) prefix duplication
                cleaned_options = []
                for i, opt in enumerate(q.get('options', [])):
                    opt_str = str(opt)
                    # Remove leading letter prefix if present
                    if opt_str and len(opt_str) > 2 and opt_str[0] in 'ABCD' and opt_str[1] in ').:':
                        opt_str = opt_str[2:].strip()
                    cleaned_options.append(opt_str)
                q['options'] = cleaned_options
                
            all_questions.extend(questions)
            print(f"    ✓ Generated {len(questions)} questions")
            
        except json.JSONDecodeError as e:
            print(f"    ✗ JSON Error: {e}")
            print(f"    Response: {response_text[:500]}...")
        except Exception as e:
            print(f"    ✗ Error: {e}")
        
        # Small delay between batches
        await asyncio.sleep(1)
    
    print(f"  Total generated: {len(all_questions)} questions")
    return all_questions

async def create_quiz_exam(topic: dict, questions: list):
    """Create a quiz exam in the database"""
    exam_id = str(uuid.uuid4())
    
    # Format questions for database
    formatted_questions = []
    for q in questions:
        formatted_questions.append({
            "id": str(uuid.uuid4()),
            "question": q.get('question', ''),
            "options": q.get('options', []),
            "correct_answer": q.get('correct_answer', 0),
            "difficulty": q.get('difficulty', 'medium')
        })
    
    exam = {
        "id": exam_id,
        "title": topic['name'],
        "description": topic['description'],
        "duration": 90,  # 90 minutes
        "passing_score": 70,  # 70%
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "questions": formatted_questions
    }
    
    await db.quiz_exams.insert_one(exam)
    print(f"  ✓ Quiz exam created: {topic['name']} ({len(questions)} questions)")
    return exam_id

async def main():
    """Main function to generate all quizzes"""
    print("\n" + "="*60)
    print("QUIZ GENERATION SCRIPT")
    print("="*60)
    print(f"Topics to generate: {len(QUIZ_TOPICS)}")
    print(f"Questions per topic: 100")
    print(f"Total questions: {len(QUIZ_TOPICS) * 100}")
    print("="*60)
    
    # Check if LLM key is available
    if not LLM_KEY:
        print("ERROR: EMERGENT_LLM_KEY not found in environment!")
        return
    
    for i, topic in enumerate(QUIZ_TOPICS):
        print(f"\n[{i+1}/{len(QUIZ_TOPICS)}] Processing: {topic['name']}")
        
        # Check if quiz already exists
        existing = await db.quiz_exams.find_one({"title": topic['name']})
        if existing:
            print(f"  ⚠ Quiz already exists, skipping...")
            continue
        
        # Generate questions
        questions = await generate_questions_for_topic(
            topic['name'], 
            topic['description'],
            100  # 100 questions per topic
        )
        
        if len(questions) >= 50:  # Minimum threshold
            await create_quiz_exam(topic, questions)
        else:
            print(f"  ⚠ Not enough questions generated ({len(questions)}), skipping...")
    
    print("\n" + "="*60)
    print("QUIZ GENERATION COMPLETE!")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
