const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: false, // development muhitida false, production da true bo'lishi kerak
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 soat
  }
}));

// Database setup
const db = new sqlite3.Database('test_system.db', (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to SQLite database');
    createTables();
  }
});

// Create tables
function createTables() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      surname TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT,
      answer_a TEXT,
      answer_b TEXT,
      answer_c TEXT,
      answer_d TEXT,
      correct_answer TEXT,
      is_sent BOOLEAN DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      test_id INTEGER,
      answer TEXT,
      is_correct BOOLEAN,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id),
      FOREIGN KEY(test_id) REFERENCES tests(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS test_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_completed BOOLEAN DEFAULT 0,
      FOREIGN KEY(student_id) REFERENCES students(id)
    )`);
  });
}

// Authentication middleware
function authenticateUser(req, res, next) {
    const userId = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = userId;
    next();
}

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === 'admin' && password === 'admin123') {
    req.session.isAdmin = true;
    req.session.userId = 'admin';
    return res.json({ success: true, role: 'admin', userId: 'admin' });
  }

  db.get('SELECT * FROM students WHERE username = ? AND password = ?', [username, password], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (row) {
      req.session.userId = row.id;
      res.json({ success: true, role: 'student', userId: row.id });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});

app.post('/api/students', (req, res) => {
  const { username, password, name, surname } = req.body;
  
  db.run('INSERT INTO students (username, password, name, surname) VALUES (?, ?, ?, ?)',
    [username, password, name, surname],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    });
});

app.post('/api/tests', (req, res) => {
  const { question, answers, correctAnswer } = req.body;
  
  db.run('INSERT INTO tests (question, answer_a, answer_b, answer_c, answer_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?)',
    [question, answers.A, answers.B, answers.C, answers.D, correctAnswer],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID });
    });
});

app.get('/api/tests', (req, res) => {
  db.all('SELECT * FROM tests', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.delete('/api/tests/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM tests WHERE id = ?', id, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Test deleted successfully' });
  });
});

app.post('/api/send-tests', (req, res) => {
  db.serialize(() => {
    // 1. Barcha o'quvchilarning eski natijalarini o'chirib tashlash
    db.run('DELETE FROM results', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // 2. Barcha eski test sessiyalarini o'chirish
      db.run('DELETE FROM test_sessions', (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        
        // 3. Yangi testlarni yuborish (is_sent ni 1 ga o'zgartirish)
        db.run('UPDATE tests SET is_sent = 1 WHERE is_sent = 0', (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          
          // 4. Barcha o'quvchilar uchun yangi test sessiyasi yaratish
          db.all('SELECT id FROM students', [], (err, students) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            
            const insertSessionStmt = db.prepare('INSERT INTO test_sessions (student_id) VALUES (?)');
            
            students.forEach(student => {
              insertSessionStmt.run(student.id);
            });
            
            insertSessionStmt.finalize();
            
            res.json({ message: 'Tests sent successfully, old results cleared, and new sessions created' });
          });
        });
      });
    });
  });
});

app.get('/api/student-tests', authenticateUser, (req, res) => {
  const studentId = req.userId;
  
  // Avval tugallanmagan sessiya borligini tekshiramiz
  db.get('SELECT id FROM test_sessions WHERE student_id = ? AND is_completed = 0', [studentId], (err, session) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!session) {
      return res.json({ message: 'No available tests' });
    }
    // Agar tugallanmagan sessiya bo'lsa, testlarni qaytaramiz
    db.all('SELECT t.* FROM tests t LEFT JOIN results r ON t.id = r.test_id AND r.student_id = ? WHERE t.is_sent = 1 AND r.id IS NULL', [studentId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });
});

app.post('/api/submit-test', authenticateUser, (req, res) => {
  const { questionId, answer } = req.body;
  const studentId = req.userId;

  db.get('SELECT correct_answer FROM tests WHERE id = ?', [questionId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const isCorrect = row.correct_answer === answer;
    db.run('INSERT INTO results (student_id, test_id, answer, is_correct) VALUES (?, ?, ?, ?)',
      [studentId, questionId, answer, isCorrect],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        // Barcha testlar yechilganligini tekshiramiz
        db.get('SELECT COUNT(*) as count FROM tests WHERE is_sent = 1', [], (err, totalTests) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          db.get('SELECT COUNT(*) as count FROM results WHERE student_id = ?', [studentId], (err, answeredTests) => {
            if (err) {
              return res.status(500).json({ error: err.message });
            }
            if (totalTests.count === answeredTests.count) {
              // Agar barcha testlar yechilgan bo'lsa, sessiyani tugatamiz
              db.run('UPDATE test_sessions SET is_completed = 1 WHERE student_id = ? AND is_completed = 0', [studentId]);
            }
            res.json({ success: true, message: 'Test result submitted successfully' });
          });
        });
      });
  });
});

app.get('/api/results', authenticateUser, (req, res) => {
  const studentId = req.userId;

  db.all('SELECT * FROM results WHERE student_id = ?', [studentId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/students-list', (req, res) => {
  const query = `
    SELECT 
      s.id, s.name, s.surname,s.username,s.password,
      COUNT(CASE WHEN r.is_correct = 1 THEN 1 END) as correct_answers,
      COUNT(CASE WHEN r.is_correct = 0 THEN 1 END) as wrong_answers,
      COUNT(DISTINCT r.test_id) as total_tests
    FROM students s
    LEFT JOIN results r ON s.id = r.student_id
    GROUP BY s.id
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.get('/api/student-profile/:userId', authenticateUser, (req, res) => {
  const studentId = req.params.userId;
  
  db.get('SELECT id, username, name, surname FROM students WHERE id = ?', [studentId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row) {
      res.json({
        ...row,
        avatar: `https://api.dicebear.com/6.x/initials/svg?seed=${row.name}%20${row.surname}`
      });
    } else {
      res.status(404).json({ error: 'Student not found' });
    }
  });
});

app.post('/api/clear-tests', (req, res) => {
  db.serialize(() => {
    db.run('DELETE FROM tests', (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.run('DELETE FROM results', (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.run('DELETE FROM test_sessions', (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'All tests, results, and sessions cleared successfully' });
        });
      });
    });
  });
});

app.delete('/api/students/:id', (req, res) => {
  const studentId = req.params.id;
  db.serialize(() => {
    db.run('DELETE FROM students WHERE id = ?', [studentId], (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      db.run('DELETE FROM results WHERE student_id = ?', [studentId], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        db.run('DELETE FROM test_sessions WHERE student_id = ?', [studentId], (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ message: 'Student and associated data deleted successfully' });
        });
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});