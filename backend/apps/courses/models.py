from django.db import models
from apps.core.models import BaseModel

class Course(BaseModel):
    title = models.CharField(max_length=255)
    description = models.TextField()
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title

class Chapter(BaseModel):
    course = models.ForeignKey(Course, related_name='chapters', on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    sequence_order = models.PositiveIntegerField(default=0)
    
    def __str__(self):
        return self.title

class ContentBlock(BaseModel):
    TYPE_CHOICES = [
        ('TEXT', 'Text'),
        ('VIDEO', 'Video'),
        ('QUIZ', 'Quiz'),
    ]
    chapter = models.ForeignKey(Chapter, related_name='contents', on_delete=models.CASCADE)
    content_type = models.CharField(choices=TYPE_CHOICES, max_length=10)
    body = models.TextField(help_text="Markdown content or Video URL")
    
    # Metadata for offline caching priority
    is_downloadable = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.content_type} - {self.chapter.title}"
