from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import json
import sqlite3
from datetime import datetime
import logging
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from functools import wraps

app = Flask(__name__, static_folder='../frontend/dist', template_folder='../frontend/dist')
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'aria-enhanced-secret-key-2024')
app.config['DATABASE'] = 'aria_enhanced.db'

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database initialization
def init_db():
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE
        )
    ''')
    
    # Tasks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'pending',
            priority TEXT DEFAULT 'medium',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Knowledge base table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            tags TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Integrations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS integrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            config TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    conn.commit()
    conn.close()

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'ARIA Enhanced',
        'version': '2.0.0',
        'timestamp': datetime.now().isoformat()
    })

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        conn = sqlite3.connect(app.config['DATABASE'])
        cursor = conn.cursor()
        
        # Check if user exists
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if cursor.fetchone():
            return jsonify({'error': 'User already exists'}), 409
        
        # Create user
        password_hash = generate_password_hash(password)
        cursor.execute(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            (username, email, password_hash)
        )
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Generate token
        token = jwt.encode({
            'user_id': user_id,
            'username': username,
            'exp': datetime.utcnow().timestamp() + 86400  # 24 hours
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'message': 'User created successfully',
            'token': token,
            'user': {'id': user_id, 'username': username, 'email': email}
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'error': 'Missing credentials'}), 400
        
        conn = sqlite3.connect(app.config['DATABASE'])
        cursor = conn.cursor()
        
        cursor.execute(
            'SELECT id, username, email, password_hash FROM users WHERE username = ? OR email = ?',
            (username, username)
        )
        user = cursor.fetchone()
        conn.close()
        
        if not user or not check_password_hash(user[3], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate token
        token = jwt.encode({
            'user_id': user[0],
            'username': user[1],
            'exp': datetime.utcnow().timestamp() + 86400  # 24 hours
        }, app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': {'id': user[0], 'username': user[1], 'email': user[2]}
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

# AI Engine routes
@app.route('/api/ai/analyze', methods=['POST'])
@token_required
def ai_analyze(current_user_id):
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Simulate AI analysis
        analysis = {
            'sentiment': 'positive' if 'good' in text.lower() else 'neutral',
            'keywords': text.split()[:5],
            'summary': f"Analysis of {len(text.split())} words",
            'confidence': 0.85,
            'recommendations': [
                'Consider automation opportunities',
                'Optimize workflow efficiency',
                'Implement knowledge base integration'
            ]
        }
        
        return jsonify({
            'status': 'success',
            'analysis': analysis,
            'processed_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"AI analysis error: {str(e)}")
        return jsonify({'error': 'Analysis failed'}), 500

@app.route('/api/ai/generate', methods=['POST'])
@token_required
def ai_generate(current_user_id):
    try:
        data = request.get_json()
        prompt = data.get('prompt', '')
        task_type = data.get('type', 'general')
        
        # Simulate AI generation
        generated_content = {
            'email': f"Subject: Automated Response\n\nDear Recipient,\n\nBased on your request: {prompt}\n\nBest regards,\nARIA Enhanced",
            'report': f"# Automated Report\n\n## Summary\n{prompt}\n\n## Analysis\nGenerated insights and recommendations.",
            'task': f"Task: {prompt}\nPriority: Medium\nEstimated Time: 30 minutes",
            'general': f"Generated response for: {prompt}"
        }
        
        return jsonify({
            'status': 'success',
            'content': generated_content.get(task_type, generated_content['general']),
            'type': task_type,
            'generated_at': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"AI generation error: {str(e)}")
        return jsonify({'error': 'Generation failed'}), 500

# Task management routes
@app.route('/api/tasks', methods=['GET', 'POST'])
@token_required
def tasks(current_user_id):
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute(
            'SELECT id, title, description, status, priority, created_at FROM tasks WHERE user_id = ? ORDER BY created_at DESC',
            (current_user_id,)
        )
        tasks = []
        for row in cursor.fetchall():
            tasks.append({
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'status': row[3],
                'priority': row[4],
                'created_at': row[5]
            })
        conn.close()
        return jsonify({'tasks': tasks})
    
    elif request.method == 'POST':
        data = request.get_json()
        title = data.get('title')
        description = data.get('description', '')
        priority = data.get('priority', 'medium')
        
        cursor.execute(
            'INSERT INTO tasks (user_id, title, description, priority) VALUES (?, ?, ?, ?)',
            (current_user_id, title, description, priority)
        )
        task_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Task created successfully',
            'task_id': task_id
        }), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
@token_required
def task_detail(current_user_id, task_id):
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    if request.method == 'PUT':
        data = request.get_json()
        status = data.get('status')
        
        cursor.execute(
            'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            (status, task_id, current_user_id)
        )
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Task updated successfully'})
    
    elif request.method == 'DELETE':
        cursor.execute('DELETE FROM tasks WHERE id = ? AND user_id = ?', (task_id, current_user_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Task deleted successfully'})

# Knowledge base routes
@app.route('/api/knowledge', methods=['GET', 'POST'])
@token_required
def knowledge_base(current_user_id):
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute(
            'SELECT id, title, content, category, tags, created_at FROM knowledge_base WHERE user_id = ? ORDER BY created_at DESC',
            (current_user_id,)
        )
        knowledge = []
        for row in cursor.fetchall():
            knowledge.append({
                'id': row[0],
                'title': row[1],
                'content': row[2],
                'category': row[3],
                'tags': row[4].split(',') if row[4] else [],
                'created_at': row[5]
            })
        conn.close()
        return jsonify({'knowledge': knowledge})
    
    elif request.method == 'POST':
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        category = data.get('category', 'general')
        tags = ','.join(data.get('tags', []))
        
        cursor.execute(
            'INSERT INTO knowledge_base (user_id, title, content, category, tags) VALUES (?, ?, ?, ?, ?)',
            (current_user_id, title, content, category, tags)
        )
        knowledge_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Knowledge entry created successfully',
            'knowledge_id': knowledge_id
        }), 201

# Integration routes
@app.route('/api/integrations', methods=['GET', 'POST'])
@token_required
def integrations(current_user_id):
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    if request.method == 'GET':
        cursor.execute(
            'SELECT id, name, type, is_active, created_at FROM integrations WHERE user_id = ?',
            (current_user_id,)
        )
        integrations = []
        for row in cursor.fetchall():
            integrations.append({
                'id': row[0],
                'name': row[1],
                'type': row[2],
                'is_active': bool(row[3]),
                'created_at': row[4]
            })
        conn.close()
        return jsonify({'integrations': integrations})
    
    elif request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        integration_type = data.get('type')
        config = json.dumps(data.get('config', {}))
        
        cursor.execute(
            'INSERT INTO integrations (user_id, name, type, config) VALUES (?, ?, ?, ?)',
            (current_user_id, name, integration_type, config)
        )
        integration_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return jsonify({
            'message': 'Integration created successfully',
            'integration_id': integration_id
        }), 201

# Dashboard data
@app.route('/api/dashboard')
@token_required
def dashboard(current_user_id):
    conn = sqlite3.connect(app.config['DATABASE'])
    cursor = conn.cursor()
    
    # Get task counts
    cursor.execute('SELECT status, COUNT(*) FROM tasks WHERE user_id = ? GROUP BY status', (current_user_id,))
    task_stats = dict(cursor.fetchall())
    
    # Get knowledge count
    cursor.execute('SELECT COUNT(*) FROM knowledge_base WHERE user_id = ?', (current_user_id,))
    knowledge_count = cursor.fetchone()[0]
    
    # Get integration count
    cursor.execute('SELECT COUNT(*) FROM integrations WHERE user_id = ? AND is_active = 1', (current_user_id,))
    active_integrations = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'stats': {
            'total_tasks': sum(task_stats.values()),
            'pending_tasks': task_stats.get('pending', 0),
            'completed_tasks': task_stats.get('completed', 0),
            'knowledge_entries': knowledge_count,
            'active_integrations': active_integrations
        },
        'recent_activity': [
            {'type': 'task', 'message': 'New task created', 'timestamp': datetime.now().isoformat()},
            {'type': 'ai', 'message': 'AI analysis completed', 'timestamp': datetime.now().isoformat()},
            {'type': 'integration', 'message': 'Integration synchronized', 'timestamp': datetime.now().isoformat()}
        ]
    })

# Static file serving
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    init_db()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
