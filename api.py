import os
import sqlite3
import hashlib
import hmac
import secrets
import re
import time
import json
import requests
from datetime import datetime, timezone, timedelta
from io import BytesIO
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, Query, Response, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv

# Try importing Google GenAI SDK
try:
    from google import genai
except ImportError:
    genai = None

# 1. Load Environment Variables (Explicitly targeting 'k.env' or '.env')
load_dotenv("k.env")
load_dotenv(".env")

# 2. Database Setup & Initialization
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            date TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            impact_score REAL NOT NULL,
            ai_consult TEXT NOT NULL
        )
    """)
    try:
        c.execute("ALTER TABLE history ADD COLUMN features_json TEXT")
    except sqlite3.OperationalError:
        pass  # Column already exists
    conn.commit()
    c.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            username TEXT NOT NULL,
            goal_text TEXT NOT NULL,
            completed INTEGER DEFAULT 0,
            date TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS live_tracking (
            username TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            platform TEXT NOT NULL,
            status TEXT NOT NULL,
            duration REAL NOT NULL,
            alert_sent INTEGER DEFAULT 0
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS screen_time_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_used_at TIMESTAMP NULL,
            active INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_screentime_tokens_user ON screen_time_tokens(user_id, active)")
    c.execute("""
        CREATE TABLE IF NOT EXISTS screen_time_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            domain TEXT NOT NULL,
            seconds INTEGER NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, date, domain),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_screentime_records_user_date ON screen_time_records(user_id, date)")
    conn.commit()
    conn.close()

init_db()

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed

# 3. FastAPI App Initialization with CORS
app = FastAPI(
    title="Social Media Impact & Mental Health AI Platform",
    description="Full-stack AI & ML API for Digital Well-Being and Social Media Habits Diagnosis",
    version="2.0.0"
)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(http://127\.0\.0\.1:\d+|http://localhost:\d+|chrome-extension://.*|moz-extension://.*)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# 4. Load Scikit-Learn Model & Feature Specs
BASE_DIR = os.path.dirname(__file__)
model_path = os.path.join(BASE_DIR, "best_mental_health_model.pkl")
features_path = os.path.join(BASE_DIR, "model_features.pkl")

model = None
model_features = None

try:
    if os.path.exists(model_path) and os.path.exists(features_path):
        model = joblib.load(model_path)
        model_features = joblib.load(features_path)
        print(" Model and features loaded successfully.")
    else:
        print(" Model files not found in root directory.")
except Exception as e:
    print(f" Warning loading model: {str(e)}")

# 5. Configure AI Clients (OpenRouter + Gemini)
openrouter_api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
openrouter_model = os.getenv("OPENROUTER_MODEL", "liquid/lfm-3-1.7b:free").strip()

if openrouter_api_key and "your api key" not in openrouter_api_key.lower():
    print(f" OpenRouter configured with model '{openrouter_model}'.")
else:
    print(" OpenRouter API key not configured.")

api_key = os.getenv("GEMINI_API_KEY")
client = None
if api_key and api_key.strip() != "" and "your api key" not in api_key.lower():
    try:
        if genai:
            client = genai.Client(api_key=api_key.strip())
            print(" Gemini Client initialized.")
        else:
            print(" google-genai module not installed.")
    except Exception as e:
        print(f" Gemini Client initialization error: {e}")
else:
    print(" Valid GEMINI_API_KEY not configured in k.env; intelligent fallbacks will be active.")

def call_llm(prompt: str, system_prompt: Optional[str] = None) -> Optional[str]:
    """
    Unified LLM call supporting OpenRouter (primary when configured) and Gemini SDK,
    with built-in retry logic for free-tier rate limits.
    """
    # 1. Try OpenRouter
    if openrouter_api_key and "your api key" not in openrouter_api_key.lower():
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://127.0.0.1:5173",
            "X-Title": "MindPulse"
        }
        data = {
            "model": openrouter_model,
            "messages": messages
        }

        for attempt in range(3):
            try:
                res = requests.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=data,
                    timeout=35
                )
                if res.status_code == 200:
                    res_json = res.json()
                    choices = res_json.get("choices", [])
                    if choices and "message" in choices[0]:
                        content = choices[0]["message"].get("content", "").strip()
                        if content:
                            return content
                elif res.status_code == 429:
                    print(f" OpenRouter 429 rate limit on attempt {attempt + 1}, retrying in 1.5s...")
                    time.sleep(1.5)
                    continue
                else:
                    print(f" OpenRouter error {res.status_code}: {res.text[:200]}")
                    break
            except Exception as e:
                print(f" OpenRouter call exception on attempt {attempt + 1}: {e}")
                time.sleep(1.0)

    # 2. Try Gemini Client as secondary fallback
    if client:
        try:
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_prompt
            )
            if response and response.text:
                return response.text.strip()
        except Exception as gemini_err:
            print(f" Gemini API warning: {gemini_err}")

    return None

# ==============================================================================
# PYDANTIC SCHEMAS
# ==============================================================================
class UserAuth(BaseModel):
    username: str
    password: str

class UserData(BaseModel):
    age: int = Field(22, ge=10, le=100)
    gender: int = Field(1, ge=0, le=2)              # 0: Female, 1: Male, 2: Other
    relationship: int = Field(0, ge=0, le=2)        # 0: Single, 1: In Relationship, 2: Married
    occupation: int = Field(1, ge=0, le=3)          # 0: Unemployed, 1: Student, 2: Salaried, 3: Self-Employed
    org_type: int = Field(1, ge=0, le=3)            # 0: None, 1: University, 2: Corporate, 3: Government
    platforms: int = Field(3, ge=0, le=20)
    usage_hours: float = Field(4.5, ge=0.0, le=24.0)
    purposeless: int = Field(3, ge=1, le=5)
    distracted: int = Field(4, ge=1, le=5)
    restless: int = Field(2, ge=1, le=5)
    concentration: int = Field(3, ge=1, le=5)
    focus_issue: int = Field(4, ge=1, le=5)
    comparison: int = Field(3, ge=1, le=5)
    comparison_feelings: int = Field(2, ge=1, le=5)
    validation: int = Field(4, ge=1, le=5)
    interest_fluctuation: int = Field(3, ge=1, le=5)
    username: Optional[str] = None
    language: Optional[str] = "English"

class ChatMessage(BaseModel):
    message: str
    language: str = "English"
    username: Optional[str] = None

class GoalCreate(BaseModel):
    username: str
    goal_text: str

class GoalToggle(BaseModel):
    completed: int

class RescoreRequest(BaseModel):
    history_id: int
    measured_hours: float

# ==============================================================================
# AUTH ROUTES
# ==============================================================================
@app.post("/api/auth/register")
def register(user: UserAuth):
    username = user.username.strip()
    if not username or not user.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO users(username, password) VALUES (?, ?)", (username, hash_password(user.password)))
        conn.commit()
        return {"status": "success", "username": username, "message": "Account created successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="Username already exists")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login(user: UserAuth):
    username = user.username.strip()
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT password FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()

    if row and verify_password(user.password, row["password"]):
        return {"status": "success", "username": username, "message": "Login successful"}
    raise HTTPException(status_code=401, detail="Invalid username or password")

# ==============================================================================
# ML PREDICTION & AI CONSULTATION
# ==============================================================================
def get_fallback_consultation(risk_label: str, addiction_score: float, overall_score: float, language: str = "English") -> str:
    if language.lower() == "urdu":
        if risk_label == "High":
            return (
                f"آپ کا ڈیجیٹل اسکور ({overall_score}/5) ظاہر کرتا ہے کہ سوشل میڈیا آپ کی ذہنی یکسوئی اور موڈ پر گہرا اثر ڈال رہا ہے۔\n\n"
                "1. **ڈیجیٹل وقفہ (Dopamine Reset):** روزانہ سونے سے 1 گھنٹہ پہلے اور جاگنے کے بعد پہلے 30 منٹ فون کو کسی دوسرے کمرے میں رکھیں۔\n"
                "2. **اطلاعات کی پابندی:** سوشل ایپس کی تمام غیر ضروری نوٹیفیکیشنز بند کر دیں اور ایپ ٹائمر 60-90 منٹ پر مقرر کریں۔\n"
                "3. **حقیقی سرگرمی:** فون کے متبادل کے طور پر روزانہ 20 منٹ چہل قدمی یا دوستوں سے بالمشافہ ملاقات کو ترجیح دیں۔"
            )
        elif risk_label == "Medium":
            return (
                f"آپ کا مجموعی اسکور ({overall_score}/5) اعتدال پر ہے۔ اگرچہ خطرہ درمیانہ ہے، لیکن عادات کو بہتر بنانا مفید ثابت ہوگا۔\n\n"
                "1. **بے مقصد سکرولنگ پر نظر:** جب بھی انسٹاگرام یا ٹِک ٹاک کھولیں، مقصد طے کریں کہ کیا دیکھنا ہے۔\n"
                "2. **موازنہ سے پرہیز:** یاد رکھیں کہ سوشل میڈیا پر لوگ صرف اپنی زندگی کے بہترین لمحات دکھاتے ہیں۔\n"
                "3. **مطالعہ اور ورزش:** روزانہ اپنی کسی پسندیدہ کتاب یا مشغلے کو وقت دیں۔"
            )
        else:
            return (
                f"مبارک ہو! آپ کا مجموعی اسکور ({overall_score}/5) اور خطرے کی سطح کم (Low Risk) ہے۔ آپ کا ڈیجیٹل توازن صحت مند ہے۔\n\n"
                "1. **موجودہ روٹین برقرار رکھیں:** اپنے معمول کو اسی طرح جاری رکھیں اور اسکرین ٹائم کو قابو میں رکھیں۔\n"
                "2. **بامقصد استعمال:** سوشل میڈیا کو نئی مہارتیں سیکھنے اور مثبت رابطوں کے لیے استعمال کریں۔\n"
                "3. **مکمل نیند:** رات کو آرام دہ نیند کے لیے نائٹ شفٹ / بلیو لائٹ فلٹر کا استعمال کریں۔"
            )
    else:
        if risk_label == "High":
            return (
                f"Your digital impact score ({overall_score}/5) indicates elevated digital fatigue and distraction patterns. "
                "Here is an actionable 3-step restorative blueprint:\n\n"
                "1. **Establish Sacred Screen-Free Zones:** Relocate your charger away from your bed. Commit to a 45-minute zero-screen buffer before sleeping and upon waking.\n"
                "2. **Aggressive Friction & Notification Diet:** Turn off badges for Instagram, TikTok, and YouTube. Set a strict 45-minute daily app timer to interrupt compulsive doom-scrolling loops.\n"
                "3. **Grounding Physical Anchor:** Replace evening passive scrolling with a restorative offline micro-habit: 15 minutes of light stretching, journaling, or conversational walking."
            )
        elif risk_label == "Medium":
            return (
                f"Your assessment score ({overall_score}/5) shows moderate social media dependency with manageable impact. "
                "Proactive adjustments will prevent habit escalation:\n\n"
                "1. **Conscious Trigger Mapping:** Notice what triggers your phone checks—boredom, academic frustration, or loneliness? Pause for 10 seconds before unlocking.\n"
                "2. **De-emphasize Social Validation:** Avoid tracking likes or comments post-upload. Curate your feed aggressively: unfollow accounts that trigger comparison.\n"
                "3. **Focused Study Blocks:** Utilize 25-minute Pomodoro intervals with your device placed face-down in another room."
            )
        else:
            return (
                f"Great baseline! Your overall impact score is {overall_score}/5 with a Low Risk classification. Your digital equilibrium is well-maintained.\n\n"
                "1. **Maintain Habit Boundaries:** Continue your healthy screen-time balance during high-stress exam or work periods.\n"
                "2. **Curate for Upliftment:** Ensure your content streams enrich your curiosity and genuine relationships rather than passive consumption.\n"
                "3. **Protect Sleep Architecture:** Maintain dark mode and amber night shift past 9:00 PM to protect melatonin production."
            )

def compute_scores(data: UserData) -> tuple[float, float, float, float]:
    """Returns (addiction_score, behavior_score, mental_score, overall_score).
    Must exactly match the existing math in predict_and_consult."""
    addiction_score = round((data.purposeless + data.distracted + data.restless + data.validation) / 4, 2)
    behavior_score = round((data.comparison + data.comparison_feelings) / 2, 2)
    mental_score = round((data.concentration + data.interest_fluctuation) / 2, 2)
    overall_score = round((addiction_score + behavior_score + mental_score) / 3, 2)
    return addiction_score, behavior_score, mental_score, overall_score

def compute_overall_score(data: UserData) -> float:
    """Convenience wrapper returning just the overall_score."""
    _, _, _, overall_score = compute_scores(data)
    return overall_score

def compute_features(data: UserData) -> np.ndarray:
    """Builds the feature vector for model inference.
    Re-uses compute_scores so the engineered scores match."""
    addiction_score, behavior_score, mental_score, overall_score = compute_scores(data)
    input_dict = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
    input_dict.update({
        'addiction_score': addiction_score,
        'behavior_score': behavior_score,
        'mental_score': mental_score,
        'overall_score': overall_score,
        'kmeans_cluster': 0,
        'hier_cluster': 0
    })
    if model_features is not None:
        row = [input_dict.get(col, 0) for col in model_features]
    else:
        row = [
            data.age, data.gender, data.relationship, data.occupation, data.org_type,
            data.platforms, data.usage_hours, data.purposeless, data.distracted,
            data.restless, data.concentration, data.focus_issue, data.comparison,
            data.comparison_feelings, data.validation, data.interest_fluctuation,
            addiction_score, behavior_score, mental_score, overall_score, 0, 0
        ]
    return np.array(row, dtype=float)

@app.post("/predict_and_consult")
@app.post("/api/predict_and_consult")
def predict_and_consult(data: UserData):
    try:
        # Feature Engineering (Exact formulas from project spec via pure functions)
        addiction_score, behavior_score, mental_score, overall_score = compute_scores(data)

        # Calculate rule-based risk level as primary ground truth
        if overall_score >= 3.5:
            risk_label = "High"
        elif overall_score >= 2.5:
            risk_label = "Medium"
        else:
            risk_label = "Low"

        # Model Prediction if model loaded
        prob_dict = {"Low": 0.33, "Medium": 0.33, "High": 0.34}
        if model is not None and model_features is not None:
            try:
                feat_vec = compute_features(data)
                input_df = pd.DataFrame([feat_vec], columns=model_features)
                pred_raw = model.predict(input_df)[0]
                probabilities = model.predict_proba(input_df)[0]

                # Map model classes if 0, 1, 2 to Low, Medium, High
                class_mapping = {0: "Low", 1: "Medium", 2: "High"}
                prob_dict = {}
                for idx, c in enumerate(model.classes_):
                    label = class_mapping.get(c, str(c))
                    prob_dict[label] = round(float(probabilities[idx]), 3)

                # If model predicted label is known, use it or keep aligned with score
                if pred_raw in class_mapping:
                    ml_predicted_label = class_mapping[pred_raw]
                else:
                    ml_predicted_label = str(pred_raw)
            except Exception as ml_err:
                print(f"ML inference warning: {ml_err}")
                ml_predicted_label = risk_label
        else:
            ml_predicted_label = risk_label

        # AI Consultation Generation
        ai_response = None
        lang = data.language or "English"

        prompt_lang_note = "Respond in Urdu script" if lang.lower() == "urdu" else "Respond in empathetic, clear English"
        ai_prompt = f"""
        You are an empathetic digital well-being assistant.
        Provide a warm, empathetic, structured 3-step practical action plan for a student with:
        - ML Predicted Risk Level: {risk_label}
        - Social Media Addiction Score: {addiction_score}/5
        - Behavioral Comparison Score: {behavior_score}/5
        - Focus & Concentration Score: {mental_score}/5
        - Overall Impact Score: {overall_score}/5
        - Active Daily Usage: {data.usage_hours} hours across {data.platforms} platforms.

        Language Instruction: {prompt_lang_note}.
        Format with clear bold step titles and actionable advice.
        """
        ai_response = call_llm(ai_prompt)

        if not ai_response:
            ai_response = get_fallback_consultation(risk_label, addiction_score, overall_score, lang)

        # Save to database if username is provided
        if data.username:
            try:
                conn = get_db()
                c = conn.cursor()
                now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                raw_dict = data.model_dump() if hasattr(data, 'model_dump') else data.dict()
                features_json = json.dumps(raw_dict)
                c.execute(
                    "INSERT INTO history(username, date, risk_level, impact_score, ai_consult, features_json) VALUES (?,?,?,?,?,?)",
                    (data.username, now_str, risk_label, overall_score, ai_response, features_json)
                )
                conn.commit()
                conn.close()
            except Exception as db_err:
                print(f"Error persisting history: {db_err}")

        return {
            "status": "success",
            "scores": {
                "addiction_score": addiction_score,
                "behavior_score": behavior_score,
                "mental_score": mental_score,
                "overall_score": overall_score
            },
            "ml_results": {
                "predicted_risk": risk_label,
                "overall_score": overall_score,
                "probabilities": prob_dict
            },
            "ai_consultation": ai_response
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ==============================================================================
# SMART BILINGUAL CHATBOT BUDDY
# ==============================================================================
@app.post("/chat")
@app.post("/api/chat")
def chat_with_buddy(chat_data: ChatMessage):
    user_msg = chat_data.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    system_msg = """
    You are 'MindPulse assistant', an empathetic, friendly, and psychologically perceptive digital well-being assistant.
    You help university students cope with social media addiction, screen fatigue, FOMO, and study anxiety.

    CRITICAL LANGUAGE DETECTION & MATCHING INSTRUCTION:
    - Analyze the user's input language style.
    - If the user writes in Roman Urdu / Hinglish (Urdu words in English alphabet like 'kya hal hai', 'mein bohot pareshan hoon', 'scroll nahi ruk raha', 'kuch tips do'), you MUST reply in comforting, relatable, natural Roman Urdu in Latin script. Never use Arabic script unless asked.
    - If the user writes in standard Urdu script, reply in standard Urdu script.
    - If the user writes in English, reply in warm, supportive English.
    - Keep replies concise (2-3 brief paragraphs or bullet points), practical, non-judgmental, and encouraging.
    """

    llm_reply = call_llm(prompt=f'User message: "{user_msg}"', system_prompt=system_msg)
    if llm_reply:
        return {"status": "success", "response": llm_reply.strip()}

    # Empathetic Fallback Buddy Logic
    lower = user_msg.lower()
    is_roman_urdu = any(word in lower for word in [
        "mein", "main", "kya", "hai", "nahi", "raha", "rahi", "hoon", "bohot", 
        "pareshan", "parhai", "phone", "chhor", "chhorna", "time", "kaise", "batao", "yaar", "theek"
    ])

    if is_roman_urdu:
        if any(w in lower for w in ["pareshan", "anxiety", "depression", "tang", "sad"]):
            reply = "Main samajh sakta hoon, dost. Kabhi kabhi screen aur constant notifications dimaagh ko bohot thaka dete hain. Sab se pehle ek lamba saans lo aur 15 minute ke liye phone ko doosre kamray mein rakh do. Main yahin hoon, batao kis cheez ki sab se zyada tension ho rahi hai?"
        elif any(w in lower for w in ["scroll", "reel", "tiktok", "instagram", "band"]):
            reply = "Yeh doom-scrolling ka chakar bohot aam hai! Ek chhota sa rule try karo: '5-Minute Rule'. Jab bhi lagay ke bas be-maqsad scroll chal raha hai, foran phone ulti taraf rakh do aur uth kar ek glass paani piyo. Is se dimaagh ka automated loop break ho jata hai."
        elif any(w in lower for w in ["parhai", "study", "concentrate", "focus"]):
            reply = "Parhai ke waqt phone samne hona sab se bara dushman hai. 25-minute ka Pomodoro timer lagao, phone ko 'Do Not Disturb' par daalo. Jab 25 minute khatam hon tabhi check karna. Choti shuruat se bara farq parta hai!"
        else:
            reply = "Main tumhari baat sun raha hoon. Social media aur screen pressure ko handle karna aasan nahi hota, lekin tum akele nahi ho. Chhoti chhoti tabdeeliyan hi bara sakoon lati hain. Batao aj kaisa mehsus ho raha hai?"
    else:
        if any(w in lower for w in ["scroll", "doomscroll", "addicted", "quit", "stop"]):
            reply = "I completely hear you. Infinite scroll feeds are engineered to hijack our dopamine receptors. Try the 'Out of Sight' protocol: place your phone in another room or out of arm's reach during your primary focus hours. Even a physical barrier creates cognitive breathing room."
        elif any(w in lower for w in ["study", "focus", "concentrate", "exam"]):
            reply = "Studying with notifications popping up causes severe attention residue. I recommend running 25-minute sprints: phone completely flipped face down on silent, zero exceptions until the timer rings. You'll regain flow in no time."
        else:
            reply = "I'm right here with you. Digital overwhelm is completely valid, especially when balancing studies, relationships, and screens. Take a gentle breath—what feels like the heaviest burden right now: mindless scrolling, comparison, or concentration?"

    return {"status": "success", "response": reply}

# ==============================================================================
# HISTORY & ANALYTICS ROUTES
# ==============================================================================
@app.get("/api/history")
def get_history(username: str = Query(..., description="Username to filter history")):
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "SELECT id, username, date, risk_level, impact_score, ai_consult, features_json FROM history WHERE username = ? ORDER BY date DESC",
        (username,)
    )
    rows = c.fetchall()
    conn.close()

    result = []
    for r in rows:
        fj = json.loads(r["features_json"]) if r["features_json"] else None
        usage_h = float(fj.get("usage_hours")) if (fj and "usage_hours" in fj) else None
        result.append({
            "id": r["id"],
            "username": r["username"],
            "date": r["date"],
            "risk_level": r["risk_level"],
            "impact_score": r["impact_score"],
            "ai_consult": r["ai_consult"],
            "can_rescore": r["features_json"] is not None,
            "usage_hours": usage_h
        })
    return {"status": "success", "data": result}

# ==============================================================================
# DAILY GOAL TRACKER ROUTES
# ==============================================================================
@app.get("/api/goals")
def get_goals(username: str = Query(..., description="Username to retrieve goals for")):
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT rowid, username, goal_text, completed, date FROM goals WHERE username = ? ORDER BY rowid DESC", (username,))
    rows = c.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["rowid"],
            "username": r["username"],
            "goal_text": r["goal_text"],
            "completed": bool(r["completed"]),
            "date": r["date"]
        })
    return {"status": "success", "data": result}

@app.post("/api/goals")
def add_goal(goal: GoalCreate):
    text = goal.goal_text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Goal text cannot be empty")
    
    conn = get_db()
    c = conn.cursor()
    now_date = datetime.now().strftime("%Y-%m-%d")
    c.execute("INSERT INTO goals(username, goal_text, completed, date) VALUES (?, ?, 0, ?)", (goal.username, text, now_date))
    new_id = c.lastrowid
    conn.commit()
    conn.close()
    return {"status": "success", "id": new_id, "message": "Goal added successfully"}

@app.patch("/api/goals/{rowid}/toggle")
def toggle_goal(rowid: int, toggle: GoalToggle):
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE goals SET completed = ? WHERE rowid = ?", (toggle.completed, rowid))
    conn.commit()
    conn.close()
    return {"status": "success", "rowid": rowid, "completed": toggle.completed}

@app.delete("/api/goals/{rowid}")
def delete_goal(rowid: int):
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM goals WHERE rowid = ?", (rowid,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Goal deleted"}

# ==============================================================================
# MODEL INSIGHTS & BENCHMARKS
# ==============================================================================
@app.get("/api/model_insights")
def get_model_insights():
    return {
        "status": "success",
        "benchmark_models": [
            {"model": "Logistic Regression", "accuracy": 0.7952, "cv_mean": 0.7518, "is_best": True},
            {"model": "Random Forest", "accuracy": 0.7831, "cv_mean": 0.7325, "is_best": False},
            {"model": "XGBoost", "accuracy": 0.7711, "cv_mean": 0.7084, "is_best": False},
            {"model": "Gradient Boosting", "accuracy": 0.7590, "cv_mean": 0.7301, "is_best": False},
            {"model": "Decision Tree", "accuracy": 0.7108, "cv_mean": 0.6867, "is_best": False},
            {"model": "Support Vector Machine", "accuracy": 0.6265, "cv_mean": 0.6169, "is_best": False}
        ],
        "feature_weights": [
            {"feature": "Purposeless Scrolling", "importance": 0.185},
            {"feature": "Notification Distraction", "importance": 0.162},
            {"feature": "Focus Issues", "importance": 0.148},
            {"feature": "Comparison to Others", "importance": 0.134},
            {"feature": "Seeking Validation", "importance": 0.121},
            {"feature": "Restlessness Without Phone", "importance": 0.105},
            {"feature": "Concentration Degradation", "importance": 0.085},
            {"feature": "Interest Fluctuation", "importance": 0.060}
        ]
    }

# ==============================================================================
# REPORTLAB PDF EXPORT
# ==============================================================================
@app.get("/api/report/pdf")
def export_pdf_report(
    username: str = Query("User"),
    risk: str = Query("Medium"),
    score: float = Query(3.0),
    consultation: str = Query("Consultation notes")
):
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=40
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=14
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor("#64748b"),
            spaceAfter=20
        )
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=15,
            textColor=colors.HexColor("#334155")
        )

        elements = []
        elements.append(Paragraph("<b>MindPulse: Social Media Impact & Well-Being Diagnostic Report</b>", title_style))
        elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} | Evaluated User: <b>{username}</b>", subtitle_style))
        elements.append(Spacer(1, 10))

        # Metrics Table
        table_data = [
            ["Metric Parameter", "Diagnostic Assessment", "Status Context"],
            ["Predicted Risk Stratum", risk.upper(), "Clinical Machine Learning Stratification"],
            ["Overall Digital Impact Score", f"{score:.2f} / 5.00", "Composite Scale (Addiction, Behavior, Mental)"]
        ]
        t = Table(table_data, colWidths=[200, 150, 180])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#f1f5f9")),
            ('TEXTCOLOR', (0,0), (-1,0), colors.HexColor("#0f172a")),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 25))

        elements.append(Paragraph("<b>Personalized Well-Being Consultation Blueprint:</b>", styles['Heading2']))
        elements.append(Spacer(1, 8))
        elements.append(Paragraph(consultation.replace("\n", "<br/>"), body_style))
        elements.append(Spacer(1, 30))
        elements.append(Paragraph("<i>Note: This assessment utilizes AI behavioral indicators and statistical modeling. It is designed for habit optimization and digital well-being guidance.</i>", subtitle_style))

        doc.build(elements)
        buffer.seek(0)

        filename = f"MindPulse_Report_{username}_{datetime.now().strftime('%Y%m%d')}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

# ==============================================================================
# SCREEN TIME COMPANION & INGEST (PHASE 2)
# ==============================================================================
PLATFORM_NORMALIZE = {
    # Subdomain → base domain for known social platforms
    "web.whatsapp.com": "whatsapp.com",
    "m.facebook.com": "facebook.com",
    "mobile.facebook.com": "facebook.com",
    "m.twitter.com": "x.com",
    "mobile.twitter.com": "x.com",
    "m.instagram.com": "instagram.com",
    "m.youtube.com": "youtube.com",
    "m.reddit.com": "reddit.com",
    "old.reddit.com": "reddit.com",
    "open.spotify.com": "spotify.com",
}

def normalize_domain(d: str) -> str:
    d = d.strip().lower()
    if d.startswith("www."):
        d = d[4:]
    return PLATFORM_NORMALIZE.get(d, d)

DOMAIN_REGEX = re.compile(r"^[a-z0-9.-]+\.[a-z]{2,}$")

class ScreenTimeRecordItem(BaseModel):
    date: str
    domain: str
    seconds: int

class ScreenTimeIngestPayload(BaseModel):
    records: List[ScreenTimeRecordItem]

def _parse_bearer(auth_header: Optional[str]) -> str:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    raw = auth_header[7:].strip()
    if not raw:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return raw

def _auth_user_from_login(auth_header: Optional[str], conn: sqlite3.Connection) -> int:
    val = _parse_bearer(auth_header)
    c = conn.cursor()
    c.execute("SELECT rowid FROM users WHERE username = ?", (val,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return row["rowid"]

def _auth_user_from_pairing(auth_header: Optional[str], conn: sqlite3.Connection) -> int:
    val = _parse_bearer(auth_header)
    computed_hash = hashlib.sha256(val.encode("utf-8")).hexdigest()
    c = conn.cursor()
    c.execute("SELECT id, user_id, token_hash FROM screen_time_tokens WHERE active = 1")
    rows = c.fetchall()
    matched_user_id = None
    matched_id = None
    for r in rows:
        if hmac.compare_digest(computed_hash, r["token_hash"]):
            matched_user_id = r["user_id"]
            matched_id = r["id"]
            break
    if matched_user_id is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    c.execute("UPDATE screen_time_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?", (matched_id,))
    conn.commit()
    return matched_user_id

def _auth_user_from_either(auth_header: Optional[str], conn: sqlite3.Connection) -> int:
    val = _parse_bearer(auth_header)
    c = conn.cursor()
    # 1. Try session username
    c.execute("SELECT rowid FROM users WHERE username = ?", (val,))
    row = c.fetchone()
    if row:
        return row["rowid"]
    
    # 2. Try pairing token
    computed_hash = hashlib.sha256(val.encode("utf-8")).hexdigest()
    c.execute("SELECT id, user_id, token_hash FROM screen_time_tokens WHERE active = 1")
    rows = c.fetchall()
    for r in rows:
        if hmac.compare_digest(computed_hash, r["token_hash"]):
            return r["user_id"]
            
    raise HTTPException(status_code=401, detail="Invalid or expired token")

@app.post("/api/screentime/token")
def generate_screentime_token(authorization: Optional[str] = Header(None)):
    conn = get_db()
    try:
        user_id = _auth_user_from_login(authorization, conn)
        c = conn.cursor()
        # Revoke any existing active token for this user
        c.execute("UPDATE screen_time_tokens SET active = 0 WHERE user_id = ? AND active = 1", (user_id,))
        
        # Generate token
        plain_token = secrets.token_urlsafe(32)
        hashed_token = hashlib.sha256(plain_token.encode("utf-8")).hexdigest()
        
        now_iso = datetime.now(timezone.utc).isoformat()
        c.execute(
            "INSERT INTO screen_time_tokens (user_id, token_hash, created_at, last_used_at, active) VALUES (?, ?, CURRENT_TIMESTAMP, NULL, 1)",
            (user_id, hashed_token)
        )
        conn.commit()
        
        return {
            "token": plain_token,
            "created_at": now_iso,
            "note": "Save this token. It will not be shown again."
        }
    finally:
        conn.close()

@app.post("/api/screentime/ingest")
def ingest_screentime_records(payload: ScreenTimeIngestPayload, authorization: Optional[str] = Header(None)):
    # Rate limit: not required for local dev, but should be added before any public deployment.
    if len(payload.records) > 500:
        raise HTTPException(status_code=400, detail="Maximum 500 records per request")
        
    conn = get_db()
    try:
        user_id = _auth_user_from_pairing(authorization, conn)
        c = conn.cursor()
        
        for rec in payload.records:
            # Validate date format (YYYY-MM-DD)
            try:
                d_obj = datetime.strptime(rec.date, "%Y-%m-%d")
                if d_obj.year < 2000 or d_obj.year > 2100:
                    raise ValueError()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")
                
            # Validate seconds
            if not isinstance(rec.seconds, int) or rec.seconds <= 0 or rec.seconds >= 86400:
                raise HTTPException(status_code=400, detail="Seconds must be an integer between 1 and 86399")
                
            # Validate domain
            raw_d = rec.domain.strip().lower()
            if raw_d.startswith("www."):
                raw_d = raw_d[4:]
            if not DOMAIN_REGEX.match(raw_d):
                raise HTTPException(status_code=400, detail="Invalid domain format")
                
            normalized = normalize_domain(raw_d)
            
            c.execute("""
                INSERT INTO screen_time_records (user_id, date, domain, seconds, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, date, domain) DO UPDATE SET
                    seconds = excluded.seconds,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, rec.date, normalized, rec.seconds))
            
        conn.commit()
        return {
            "synced": len(payload.records),
            "last_sync": datetime.now(timezone.utc).isoformat()
        }
    finally:
        conn.close()

@app.get("/api/screentime/me")
def get_user_screentime(days: int = Query(7, ge=1, le=30), authorization: Optional[str] = Header(None)):
    conn = get_db()
    try:
        user_id = _auth_user_from_either(authorization, conn)
        c = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        c.execute("""
            SELECT date, domain, seconds, updated_at
            FROM screen_time_records
            WHERE user_id = ? AND date >= ?
            ORDER BY date DESC, seconds DESC
        """, (user_id, cutoff_date))
        rows = c.fetchall()
        
        total_seconds = 0
        by_day = {}
        domain_map = {}
        last_ingest_at = None
        
        for r in rows:
            sec = r["seconds"]
            dt = r["date"]
            dom = r["domain"]
            up = r["updated_at"]
            
            total_seconds += sec
            by_day[dt] = by_day.get(dt, 0) + sec
            
            if dom not in domain_map:
                domain_map[dom] = {"seconds": 0, "dates": set()}
            domain_map[dom]["seconds"] += sec
            domain_map[dom]["dates"].add(dt)
            
            if up and (last_ingest_at is None or up > last_ingest_at):
                last_ingest_at = up
                
        by_domain = []
        for dom, info in domain_map.items():
            by_domain.append({
                "domain": dom,
                "seconds": info["seconds"],
                "days_active": len(info["dates"])
            })
        by_domain.sort(key=lambda x: x["seconds"], reverse=True)
        
        c.execute("SELECT created_at FROM screen_time_tokens WHERE user_id = ? AND active = 1 ORDER BY id DESC LIMIT 1", (user_id,))
        token_row = c.fetchone()
        token_active = token_row is not None
        token_created_at = token_row["created_at"] if token_row else None

        def _to_utc_iso(val: Optional[str]) -> Optional[str]:
            if not val:
                return None
            s = str(val).strip()
            if not s.endswith("Z") and "+" not in s:
                s = s.replace(" ", "T") + "Z"
            return s

        return {
            "user_id": user_id,
            "days": days,
            "total_seconds": total_seconds,
            "by_day": by_day,
            "by_domain": by_domain,
            "last_ingest_at": _to_utc_iso(last_ingest_at),
            "token_active": token_active,
            "token_created_at": _to_utc_iso(token_created_at)
        }
    finally:
        conn.close()

@app.delete("/api/screentime/token")
def revoke_screentime_tokens(authorization: Optional[str] = Header(None)):
    conn = get_db()
    try:
        user_id = _auth_user_from_login(authorization, conn)
        c = conn.cursor()
        c.execute("UPDATE screen_time_tokens SET active = 0 WHERE user_id = ?", (user_id,))
        conn.commit()
        return {"revoked": True}
    finally:
        conn.close()

@app.post("/api/screentime/rescore")
def rescore_assessment(req: RescoreRequest, authorization: Optional[str] = Header(None)):
    if req.measured_hours <= 0 or req.measured_hours > 24:
        raise HTTPException(status_code=400, detail="measured_hours must be between 0 and 24")

    conn = get_db()
    try:
        user_id = _auth_user_from_either(authorization, conn)
        c = conn.cursor()
        c.execute("SELECT username FROM users WHERE rowid = ?", (user_id,))
        user_row = c.fetchone()
        auth_username = user_row["username"] if user_row else None

        c.execute(
            "SELECT id, username, risk_level, impact_score, features_json FROM history WHERE id = ?",
            (req.history_id,)
        )
        hist_row = c.fetchone()
        if not hist_row:
            raise HTTPException(status_code=404, detail="History row not found")
        if hist_row["username"] != auth_username:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this assessment")
        if not hist_row["features_json"]:
            raise HTTPException(
                status_code=400,
                detail="This assessment predates feature storage. Run a new assessment to enable re-scoring."
            )

        raw_features = json.loads(hist_row["features_json"])
        original_usage = float(raw_features.get("usage_hours", 0.0))

        raw_features["usage_hours"] = float(req.measured_hours)
        updated_data = UserData(**raw_features)

        _, _, _, corrected_impact = compute_scores(updated_data)
        if corrected_impact >= 3.5:
            corrected_risk = "High"
        elif corrected_impact >= 2.5:
            corrected_risk = "Medium"
        else:
            corrected_risk = "Low"

        corrected_prob_dict = {"Low": 0.33, "Medium": 0.33, "High": 0.34}
        if model is not None and model_features is not None:
            try:
                feat_vec = compute_features(updated_data)
                input_df = pd.DataFrame([feat_vec], columns=model_features)
                probabilities = model.predict_proba(input_df)[0]
                class_mapping = {0: "Low", 1: "Medium", 2: "High"}
                corrected_prob_dict = {}
                for idx, cl in enumerate(model.classes_):
                    label = class_mapping.get(cl, str(cl))
                    corrected_prob_dict[label] = round(float(probabilities[idx]), 3)
            except Exception as ml_err:
                pass

        original_impact = round(float(hist_row["impact_score"]), 2)
        corrected_impact = round(float(corrected_impact), 2)
        meas_hours = round(float(req.measured_hours), 2)
        orig_hours = round(float(original_usage), 2)

        return {
            "original": {
                "history_id": hist_row["id"],
                "usage_hours": orig_hours,
                "risk_level": hist_row["risk_level"],
                "impact_score": original_impact
            },
            "corrected": {
                "usage_hours": meas_hours,
                "risk_level": corrected_risk,
                "impact_score": corrected_impact,
                "probabilities": corrected_prob_dict
            },
            "delta_hours": round(meas_hours - orig_hours, 2),
            "delta_impact": round(corrected_impact - original_impact, 2)
        }
    finally:
        conn.close()

# ==============================================================================
# ROOT / HEALTH
# ==============================================================================
@app.get("/")
def home():
    return {
        "status": "online",
        "service": "Social Media Impact & Mental Health Predictor API",
        "version": "2.0.0",
        "ml_model_loaded": model is not None,
        "gemini_active": client is not None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
