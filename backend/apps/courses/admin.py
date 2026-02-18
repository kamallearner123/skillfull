from django.contrib import admin
from .models import Course, Chapter, ContentBlock

class ContentBlockInline(admin.StackedInline):
    model = ContentBlock
    extra = 0

class ChapterInline(admin.StackedInline):
    model = Chapter
    extra = 0
    show_change_link = True

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('title', 'is_published', 'created_at')
    inlines = [ChapterInline]

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ('title', 'course', 'sequence_order')
    list_filter = ('course',)
    inlines = [ContentBlockInline]
