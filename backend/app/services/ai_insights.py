# AI Insights Service using GPT-4o
import os
import json
import logging
from datetime import datetime, timezone, timedelta
from ..config import db, EMERGENT_LLM_KEY

logger = logging.getLogger(__name__)

# Try to import LLM library
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logger.warning("emergentintegrations not available - AI insights will use rule-based fallback")


async def generate_ai_insights(leads: list, user_id: str) -> dict:
    """Generate AI-powered insights from lead data using GPT-4o"""
    
    # Calculate basic stats
    total_leads = len(leads)
    if total_leads == 0:
        return {"insights": [], "recommendations": [], "ai_powered": False}
    
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Count by status
    status_counts = {}
    source_counts = {}
    program_counts = {}
    leads_this_week = 0
    leads_this_month = 0
    
    for lead in leads:
        status = lead.get('status', 'New')
        status_counts[status] = status_counts.get(status, 0) + 1
        
        source = lead.get('source', 'Unknown')
        source_counts[source] = source_counts.get(source, 0) + 1
        
        program = lead.get('program_name', 'Unknown')
        program_counts[program] = program_counts.get(program, 0) + 1
        
        created_at = lead.get('created_at')
        if created_at:
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            if created_at >= week_ago:
                leads_this_week += 1
            if created_at >= month_ago:
                leads_this_month += 1
    
    # Calculate conversion metrics
    converted = status_counts.get('Converted', 0)
    conversion_rate = round((converted / total_leads) * 100, 1) if total_leads > 0 else 0
    
    # Find best performing source and program
    best_source = max(source_counts.items(), key=lambda x: x[1])[0] if source_counts else "N/A"
    popular_program = max(program_counts.items(), key=lambda x: x[1])[0] if program_counts else "N/A"
    
    # Count followups
    pending_followups = 0
    overdue_followups = 0
    
    followups = await db.followups.find({"status": "Pending"}, {"_id": 0}).to_list(10000)
    today = now.strftime('%Y-%m-%d')
    
    for fu in followups:
        pending_followups += 1
        fu_date = fu.get('follow_up_date', '')
        if fu_date and fu_date < today:
            overdue_followups += 1
    
    # Calculate health score
    new_leads = status_counts.get('New', 0)
    health_score = min(100, max(0, 
        50 + 
        (conversion_rate - 20) * 2 +
        (10 if overdue_followups == 0 else -10) +
        (10 if new_leads < total_leads * 0.3 else -5)
    ))
    
    # Try to get AI-powered insights
    ai_insights = None
    ai_recommendations = None
    
    if LLM_AVAILABLE and EMERGENT_LLM_KEY:
        try:
            # Prepare data summary for LLM
            lead_data_summary = f"""
Lead Management Data Summary:
- Total Leads: {total_leads}
- Leads This Week: {leads_this_week}
- Leads This Month: {leads_this_month}
- Overall Conversion Rate: {conversion_rate}%
- Pending Follow-ups: {pending_followups}
- Overdue Follow-ups: {overdue_followups}
- Best Performing Source: {best_source}
- Most Popular Program: {popular_program}

Status Breakdown: {json.dumps(status_counts)}
Lead Sources: {json.dumps(source_counts)}

New Leads: {new_leads} ({round(new_leads/total_leads*100) if total_leads > 0 else 0}% of total)
"""
            
            # Initialize LLM Chat
            chat = LlmChat(
                api_key=EMERGENT_LLM_KEY,
                session_id=f"ai-insights-{user_id}-{datetime.now().strftime('%Y%m%d')}",
                system_message="""You are an expert CRM analyst. Analyze the lead data and provide actionable insights.

Your response MUST be valid JSON with this exact structure:
{
  "insights": [
    {"type": "warning|success|alert|info", "title": "Short Title", "message": "Detailed insight", "priority": "high|medium|low"}
  ],
  "recommendations": ["Recommendation 1", "Recommendation 2", "Recommendation 3"]
}

Provide 3-5 insights and 3-4 recommendations focusing on:
1. Conversion rate analysis
2. Follow-up effectiveness
3. Lead source ROI
4. Actionable improvements"""
            ).with_model("openai", "gpt-4o")
            
            # Send message to LLM
            user_message = UserMessage(text=f"Analyze this lead data:\n\n{lead_data_summary}")
            response = await chat.send_message(user_message)
            
            # Parse LLM response
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            ai_response = json.loads(response_text.strip())
            ai_insights = ai_response.get('insights', [])
            ai_recommendations = ai_response.get('recommendations', [])
            logger.info(f"AI Insights generated successfully for user {user_id}")
            
        except Exception as e:
            logger.error(f"LLM API error: {e}")
            ai_insights = None
            ai_recommendations = None
    
    # Generate rule-based insights as fallback
    rule_based_insights = []
    rule_based_recommendations = []
    
    if conversion_rate < 10:
        rule_based_insights.append({
            "type": "alert",
            "title": "Low Conversion Rate",
            "message": f"Your conversion rate is {conversion_rate}%. Industry average is 15-20%.",
            "priority": "high"
        })
        rule_based_recommendations.append("Review your follow-up process and lead qualification criteria")
    elif conversion_rate >= 25:
        rule_based_insights.append({
            "type": "success",
            "title": "Excellent Conversion Rate",
            "message": f"Your {conversion_rate}% conversion rate is above industry average!",
            "priority": "medium"
        })
    
    if overdue_followups > 0:
        rule_based_insights.append({
            "type": "warning",
            "title": "Overdue Follow-ups",
            "message": f"You have {overdue_followups} overdue follow-ups that need attention.",
            "priority": "high"
        })
        rule_based_recommendations.append("Clear overdue follow-ups immediately to prevent lead loss")
    
    if leads_this_week == 0:
        rule_based_insights.append({
            "type": "alert",
            "title": "No New Leads This Week",
            "message": "No new leads acquired in the past 7 days. Review your marketing efforts.",
            "priority": "high"
        })
        rule_based_recommendations.append("Increase marketing activities or review lead sources")
    
    # Use AI insights if available, otherwise use rule-based
    final_insights = ai_insights if ai_insights else rule_based_insights
    final_recommendations = ai_recommendations if ai_recommendations else rule_based_recommendations
    
    return {
        "summary": {
            "total_leads": total_leads,
            "leads_this_week": leads_this_week,
            "leads_this_month": leads_this_month,
            "conversion_rate": conversion_rate,
            "pending_followups": pending_followups,
            "overdue_followups": overdue_followups,
            "best_source": best_source,
            "popular_program": popular_program
        },
        "status_breakdown": status_counts,
        "source_breakdown": source_counts,
        "program_breakdown": program_counts,
        "insights": final_insights,
        "recommendations": final_recommendations,
        "health_score": health_score,
        "ai_powered": ai_insights is not None
    }
