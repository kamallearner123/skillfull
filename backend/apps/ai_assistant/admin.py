from django.contrib import admin
from .models import SmartTip, SmartChallenge

@admin.register(SmartTip)
class SmartTipAdmin(admin.ModelAdmin):
    list_display = ('text', 'color', 'is_active', 'created_at')
    list_filter = ('is_active', 'color')
    search_fields = ('text',)

@admin.register(SmartChallenge)
class SmartChallengeAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'is_active', 'created_at')
    list_filter = ('is_active', 'difficulty')
    search_fields = ('title', 'description')
