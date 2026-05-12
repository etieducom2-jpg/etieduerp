"""
Academic session helper functions.
"""
from datetime import datetime
from typing import Optional, Tuple


def get_current_academic_session() -> str:
    """Get current academic session based on today's date.
    Session runs from April 1 to March 31.
    E.g., if today is Jan 2025, session is "2024" (April 2024 - March 2025)
    """
    today = datetime.now()
    if today.month >= 4:  # April onwards
        return str(today.year)
    else:  # Jan-March
        return str(today.year - 1)


def get_session_date_range(session: str) -> Tuple[Optional[datetime], Optional[datetime]]:
    """Get start and end dates for an academic session.
    Session "2024" = April 1, 2024 to March 31, 2025
    Returns (start_date, end_date) as datetime objects
    """
    if session == "all":
        return None, None
    year = int(session)
    start_date = datetime(year, 4, 1, 0, 0, 0)
    end_date = datetime(year + 1, 3, 31, 23, 59, 59)
    return start_date, end_date


def get_available_sessions() -> list:
    """Get list of available academic sessions from 2016 to current."""
    current_session = int(get_current_academic_session())
    sessions = []
    for year in range(2016, current_session + 2):  # +2 to include next year
        sessions.append({
            "value": str(year),
            "label": f"{year}-{year+1}"  # e.g., "2024-2025"
        })
    return sessions


def get_session_filter(session: Optional[str], date_field: str = "created_at") -> dict:
    """Generate MongoDB date filter for academic session.
    Returns a dict that can be merged into a query.
    """
    if not session or session == "all":
        return {}
    
    start_date, end_date = get_session_date_range(session)
    if start_date and end_date:
        return {
            date_field: {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }
    return {}
