from django.contrib import admin
from .models import Team, Department, TeamMembership

class TeamMembershipInline(admin.TabularInline):
    model = TeamMembership
    extra = 1

@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'head')

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'department', 'active')
    list_filter = ('department', 'active')
    inlines = [TeamMembershipInline]
