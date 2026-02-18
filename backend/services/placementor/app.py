from flask import Flask, render_template, request, jsonify
import os
import json
import random

app = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Function to load questions
def load_questions(subject, difficulty):
    filepath = os.path.join(BASE_DIR, subject, f"{difficulty}.json")
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return json.load(f)
    return []

@app.route('/')
def index():
    # List directories as subjects
    subjects = [d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d)) and d not in ['static', 'templates', '__pycache__', '.git', '.gemini']]
    return render_template('index.html', subjects=subjects)

@app.route('/subject/<subject_name>')
def select_level(subject_name):
    return render_template('level_selection.html', subject=subject_name)

@app.route('/quiz/<subject_name>/<difficulty>')
def quiz(subject_name, difficulty):
    questions = load_questions(subject_name, difficulty)
    # Shuffle or limit if needed, here we serve all 150 or a subset?
    # Requirement says "contain MCQ questions for 150". Usually a quiz doesn't ask 150 at once.
    # But for assessment, let's serve a manageable amount, say 20 random ones, or all if the user wants. 
    # The requirement didn't specify the quiz length, just the file content.
    # I will serve 20 random questions for the quiz to make it usable.
    selected_questions = random.sample(questions, min(len(questions), 20))
    return render_template('quiz.html', subject=subject_name, difficulty=difficulty, questions=selected_questions)

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
    subject = data.get('subject')
    difficulty = data.get('difficulty')
    answers = data.get('answers') # {question_id: selected_option}
    
    questions = load_questions(subject, difficulty)
    score = 0
    total = len(answers)
    
    results = []
    
    # Create a lookup for quick checking
    q_map = {q['id']: q for q in questions}
    
    for q_id, user_answer in answers.items():
        if int(q_id) in q_map:
            correct_answer = q_map[int(q_id)]['answer']
            is_correct = user_answer == correct_answer
            if is_correct:
                score += 1
            results.append({
                'id': q_id,
                'question': q_map[int(q_id)]['question'],
                'user_answer': user_answer,
                'correct_answer': correct_answer,
                'is_correct': is_correct
            })
            
    return jsonify({'score': score, 'total': total, 'results': results})

@app.route('/result')
def result():
    return render_template('result.html')

if __name__ == '__main__':
    app.run(debug=True)
