# AdaptLearn

AdaptLearn is an AI-powered adaptive learning platform for school students. It personalizes assessments, dynamically adjusts question difficulty, and identifies learning gaps to maximize student performance.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [License](#license)

## Features

- **Adaptive Assessments**: Questions dynamically adjust difficulty based on user performance.
- **Personalized Learning**: Identifies learning gaps in key fundamentals: listening, grasping, retention, and application.
- **Interactive Platform**: Provides intuitive interfaces for students to practice and track progress.
- **Analytics Dashboard**: Offers insights on student performance and areas of improvement.

## Tech Stack

- **Frontend**: React, Tailwind CSS
- **Backend**: Flask (Python)
- **Database**: MongoDB
- **Authentication**: JWT, Bcrypt
- **API Communication**: RESTful APIs

## Installation

### Prerequisites

- Python 3.10+
- Node.js & npm
- MongoDB

### Steps

1. Clone the repository:

```bash
git clone https://github.com/srushtisoni08/AdaptLearn.git
cd AdaptLearn
```

2. Backend Setup:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Create a .env file in the backend folder and set your environment variables:

```bash
MONGO_URI=<your_mongodb_connection_string>
SECRET_KEY=<your_jwt_secret>
```

4. Start the backend server:

```bash
python app.py
```

5. Frontend setup:

```bash
cd frontend
npm install
npm run dev
```

6. Access the application in your browser:

```bash
http://localhost:5173
```

## Usage
- Register and log in as a student.
- Take adaptive assessments.
- Track progress and identify weak areas.
- Teachers/admins can manage questions and view analytics.

## License
- This project is licensed under the MIT License.