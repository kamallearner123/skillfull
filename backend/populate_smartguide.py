import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.ai_assistant.models import SmartTip, SmartChallenge

def populate():
    # Tips
    tips = [
        ("Solve one 'Medium' LeetCode problem daily to build muscle memory.", "indigo"),
        ("Your mock interview performance score improved by 14% this week!", "emerald"),
        ("Data Engineering hiring is peaking in Bangalore. Check Placements tab.", "amber"),
        ("Optimize your LinkedIn profile with keywords relevant to Data Engineering.", "indigo")
    ]
    for text, color in tips:
        SmartTip.objects.get_or_create(text=text, color=color)

    # Challenges
    challenges = [
        {
            "title": "Distributed SQL Queries",
            "description": "Optimize a nested join across 3 shards.",
            "difficulty": "EXPERT",
            "deadline_info": "2d left",
            "failure_rate_label": "67% Users failed",
            "progress_percent": 65
        },
        {
            "title": "Spark Memory Optimization",
            "description": "Handle skewness in a large dataset joins.",
            "difficulty": "MEDIUM",
            "deadline_info": "5d left",
            "failure_rate_label": "42% Users failed",
            "progress_percent": 30
        }
    ]
    for c in challenges:
        SmartChallenge.objects.get_or_create(
            title=c["title"],
            defaults={
                "description": c["description"],
                "difficulty": c["difficulty"],
                "deadline_info": c["deadline_info"],
                "failure_rate_label": c["failure_rate_label"],
                "progress_percent": c["progress_percent"]
            }
        )
    print("Populated SmartGuide Dashboard data.")

if __name__ == "__main__":
    populate()
