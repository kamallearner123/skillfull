from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from ninja import NinjaAPI
from apps.users.api import router as users_router
from apps.teams.api import router as teams_router
from apps.courses.api import router as courses_router
from apps.assessments.api import router as assessments_router
from apps.smartguide_proxy.api import router as smartguide_router
from apps.chat.api import router as chat_router
from apps.ai_assistant.api import router as ai_assistant_router

api = NinjaAPI(title="EduCollab API", version="1.0.0")

# Register routers from apps
api.add_router("/users/", users_router)
api.add_router("/teams/", teams_router)
api.add_router("/courses/", courses_router)
api.add_router("/assessments/", assessments_router)
api.add_router("/smartguide/", smartguide_router)
api.add_router("/chat/", chat_router)
api.add_router("/ai-assistant/", ai_assistant_router)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api.urls),
    path('accounts/', include('allauth.urls')),
    # Health check for deployment
    path('health/', lambda request: HttpResponse("OK")),
]
