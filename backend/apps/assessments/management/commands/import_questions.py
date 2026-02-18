from django.core.management.base import BaseCommand
import os
import json
from django.conf import settings
from apps.assessments.models import Subject, Question

class Command(BaseCommand):
    help = 'Imports questions from services/placementor JSON files'

    def handle(self, *args, **options):
        # We need to target the backend root specifically
        # BASE_DIR is .../backend/config/settings/base.py -> parent -> backend? No set in settings.
        # settings.BASE_DIR points to backend usually (where manage.py is).
        base_dir = settings.BASE_DIR
        placementor_dir = os.path.join(base_dir, 'services', 'placementor')
        
        self.stdout.write(f"Looking for data in: {placementor_dir}")
        
        if not os.path.exists(placementor_dir):
            self.stdout.write(self.style.ERROR(f"Directory not found: {placementor_dir}"))
            return

        # List directories (subjects)
        subjects = [d for d in os.listdir(placementor_dir) if os.path.isdir(os.path.join(placementor_dir, d)) and d not in ['static', 'templates', '__pycache__', '.git', '.gemini', 'venv', '.idea', '.vscode']]

        for subject_name in subjects:
            self.stdout.write(f"Processing subject: {subject_name}")
            subject, created = Subject.objects.get_or_create(name=subject_name)
            
            subject_dir = os.path.join(placementor_dir, subject_name)
            
            # Helper for difficulty mapping
            difficulty_map = {
                'easy.json': 'easy',
                'moderate.json': 'moderate',
                'difficult.json': 'difficult', 
                # Handling variations if any
                'hard.json': 'difficult',
                'medium.json': 'moderate'
            }
            
            for filename in os.listdir(subject_dir):
                if filename in difficulty_map:
                    difficulty = difficulty_map[filename]
                    file_path = os.path.join(subject_dir, filename)
                    
                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            # Expecting list of dicts: {"id": 1, "question": "...", "options": [...], "answer": "..."}
                            count = 0
                            for item in data:
                                # Ensure options list is list of strings
                                options_list = item.get('options', [])
                                if not isinstance(options_list, list):
                                    continue # Skip malformed options
                                
                                # Sometimes "answer" key might be "correct_answer"
                                correct_ans = item.get('answer') or item.get('correct_answer')
                                
                                if not correct_ans:
                                    continue # skip if no answer

                                question_text = item.get('question')
                                if not question_text:
                                    continue
                                    
                                # Check if question already exists to prevent duplicates on rerun (simple check)
                                if not Question.objects.filter(subject=subject, text=question_text).exists():
                                    Question.objects.create(
                                        subject=subject,
                                        text=question_text,
                                        options=options_list,
                                        correct_answer=correct_ans,
                                        difficulty=difficulty
                                    )
                                    count += 1
                            
                            self.stdout.write(f"  Imported {count} questions from {filename}")
                            
                    except json.JSONDecodeError:
                        self.stdout.write(self.style.ERROR(f"  Failed to parse JSON: {filename}"))
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"  Error processing {filename}: {str(e)}"))
        
        self.stdout.write(self.style.SUCCESS("Import completed!"))
