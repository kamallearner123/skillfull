import os
import json
import random

subjects = [
    "ML_AI", "Cyber_Security", "DSA", "Embedded_Systems", "Cloud",
    "DevOps", "Electronics", "Full_Stack", "Networking", "Data_Science", "Data_Engineering"
]

difficulties = ["easy", "moderate", "difficult"]

# Templates for generating questions to reach 150 count
templates = {
    "ML_AI": [
        {"q": "What is the primary goal of {topic}?", "a": "To learn from data", "o": ["To learn from data", "To compile code", "To route packets", "To manage databases"]},
        {"q": "Which algorithm is used for {topic}?", "a": "Regression", "o": ["Regression", "Sorting", "Hashing", "Paging"]},
        {"q": "In ML, what does {term} mean?", "a": "A type of variable", "o": ["A type of variable", "A network protocol", "A hardware component", "A cloud service"]},
    ],
    "Cyber_Security": [
        {"q": "What is a common threat in {topic}?", "a": "Phishing", "o": ["Phishing", "Overclocking", "Data mining", "Load balancing"]},
        {"q": "Which protocol secures {topic}?", "a": "HTTPS", "o": ["HTTPS", "HTTP", "FTP", "Telnet"]},
    ],
    "DSA": [
        {"q": "What is the time complexity of {topic}?", "a": "O(n log n)", "o": ["O(n log n)", "O(n^2)", "O(1)", "O(n)"]},
        {"q": "Which data structure is best for {topic}?", "a": "Hash Map", "o": ["Hash Map", "Array", "Linked List", "Stack"]},
    ],
    "Embedded_Systems": [
        {"q": "Which microcontroller is used in {topic}?", "a": "ARM Cortex", "o": ["ARM Cortex", "Intel i9", "AMD Ryzen", "Nvidia RTX"]},
        {"q": "What is a key constraint in {topic}?", "a": "Power consumption", "o": ["Power consumption", "Screen size", "Network bandwidth", "Disk space"]},
    ],
    "Cloud": [
        {"q": "What is a benefit of {topic}?", "a": "Scalability", "o": ["Scalability", "Fixed cost", "Physical access", "Local storage"]},
        {"q": "Which service provides {topic}?", "a": "AWS EC2", "o": ["AWS EC2", "Localhost", "USB Drive", "CD-ROM"]},
    ],
    "DevOps": [
        {"q": "What tool is used for {topic}?", "a": "Jenkins", "o": ["Jenkins", "Photoshop", "Word", "Excel"]},
        {"q": "What is the goal of {topic}?", "a": "Continuous Integration", "o": ["Continuous Integration", "Manual Testing", "Waterfall development", "Siloed teams"]},
    ],
    "Electronics": [
        {"q": "What component is essential for {topic}?", "a": "Transistor", "o": ["Transistor", "Software", "Cloud", "Algorithm"]},
        {"q": "What is the unit of {topic}?", "a": "Ohm", "o": ["Ohm", "Byte", "Pixel", "Hz"]},
    ],
    "Full_Stack": [
        {"q": "Which language is used for {topic}?", "a": "JavaScript", "o": ["JavaScript", "C++", "Assembly", "Fortran"]},
        {"q": "What is a framework for {topic}?", "a": "React", "o": ["React", "Excel", "Notepad", "Paint"]},
    ],
    "Networking": [
        {"q": "Which device is used in {topic}?", "a": "Router", "o": ["Router", "Monitor", "Keyboard", "Mouse"]},
        {"q": "What protocol handles {topic}?", "a": "TCP/IP", "o": ["TCP/IP", "USB", "HDMI", "VGA"]},
    ],
    "Data_Science": [
        {"q": "What library is used for {topic}?", "a": "Pandas", "o": ["Pandas", "React", "Spring", "Hibernate"]},
        {"q": "Step one in {topic} is?", "a": "Data Cleaning", "o": ["Data Cleaning", "Deployment", "Marketing", "Sales"]},
    ],
    "Data_Engineering": [
        {"q": "Tool for {topic} pipelines?", "a": "Apache Airflow", "o": ["Apache Airflow", "Microsoft Paint", "VLC Player", "Notepad++"]},
        {"q": "Database type for {topic}?", "a": "NoSQL", "o": ["NoSQL", "Flat file", "Paper records", "Mental notes"]},
    ]
}

topics = {
    "ML_AI": ["Supervised Learning", "Unsupervised Learning", "Neural Networks", "Deep Learning", "Reinforcement Learning"],
    "Cyber_Security": ["Network Security", "Cryptography", "Ethical Hacking", "Malware Analysis", "Incident Response"],
    "DSA": ["Sorting", "Searching", "Graph Algorithms", "Dynamic Programming", "Trees"],
    "Embedded_Systems": ["Microcontrollers", "RTOS", "IoT", "Sensors", "Actuators"],
    "Cloud": ["IaaS", "PaaS", "SaaS", "Serverless", "Virtualization"],
    "DevOps": ["CI/CD", "Containerization", "Orchestration", "Monitoring", "Infrastructure as Code"],
    "Electronics": ["Analog Circuits", "Digital Circuits", "Microprocessors", "Signal Processing", "VLSI"],
    "Full_Stack": ["Frontend", "Backend", "Database", "API", "Deployment"],
    "Networking": ["OSI Model", "TCP/IP", "Routing", "Switching", "Network Security"],
    "Data_Science": ["Data Analysis", "Visualization", "Statistics", "Machine Learning", "Big Data"],
    "Data_Engineering": ["ETL", "Data Warehousing", "Big Data Processing", "Data Pipelines", "Database Management"]
}

def generate_questions(subject, difficulty, count=150):
    questions = []
    subject_templates = templates.get(subject, templates["ML_AI"]) # Fallback
    subject_topics = topics.get(subject, ["General"])
    
    for i in range(count):
        template = random.choice(subject_templates)
        topic = random.choice(subject_topics)
        
        q_text = template["q"].format(topic=topic, term="Parameter")
        
        # Shuffle options
        options = template["o"].copy()
        random.shuffle(options)
        
        question = {
            "id": i + 1,
            "question": f"[{subject} {difficulty.capitalize()}] " + q_text,
            "options": options,
            "answer": template["a"]
        }
        questions.append(question)
    return questions

def main():
    base_path = "/home/kamal/Documents/CareerBrook/placementor"
    
    for subject in subjects:
        subject_path = os.path.join(base_path, subject)
        if not os.path.exists(subject_path):
            os.makedirs(subject_path)
            
        for difficulty in difficulties:
            questions = generate_questions(subject, difficulty)
            file_path = os.path.join(subject_path, f"{difficulty}.json")
            
            with open(file_path, "w") as f:
                json.dump(questions, f, indent=2)
            
            print(f"Generated {len(questions)} questions for {subject}/{difficulty}.json")

if __name__ == "__main__":
    main()
