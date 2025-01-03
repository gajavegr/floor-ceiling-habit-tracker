const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;  // Define port at the top

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001',
    'https://gajavegr-mvp-functionality--floor-ceiling-goal-tracker.netlify.app', // Add your Netlify domain
    process.env.FRONTEND_URL // Add this for flexibility
  ],
  credentials: true
}));
app.use(express.json());

const dataPath = path.join(__dirname, 'data', 'goals.json');
const usersPath = path.join(__dirname, 'data', 'users.json');
const logsPath = path.join(__dirname, 'data', 'logs.json');


// Initialize function
async function initializeFiles() {
  try {
    await fs.access(path.join(__dirname, 'data'));
  } catch {
    await fs.mkdir(path.join(__dirname, 'data'));
  }

  try {
    await fs.access(usersPath);
  } catch {
    await fs.writeFile(usersPath, '[]');
  }

  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, '[]');
  }

  try {
    await fs.access(logsPath);
  } catch {
    await fs.writeFile(logsPath, '[]');
  }
}


const readLogs = async () => {
  try {
    const data = await fs.readFile(logsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

const writeLogs = async (logs) => {
  try {
    await fs.writeFile(logsPath, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing logs:', error);
  }
};

// Helper functions to read/write JSON file
const readGoals = async () => {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading goals:', error);
    return [];
  }
};

const writeGoals = async (goals) => {
  try {
    await fs.writeFile(dataPath, JSON.stringify(goals, null, 2));
  } catch (error) {
    console.error('Error writing goals:', error);
  }
};

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const data = await fs.readFile(usersPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const users = JSON.parse(await fs.readFile(usersPath, 'utf8'));
    const newUser = {
      id: Date.now().toString(),
      name: req.body.name,
    };
    users.push(newUser);
    await fs.writeFile(usersPath, JSON.stringify(users, null, 2));
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Routes

app.get('/api/goals', async (req, res) => {
  try {
    const { userId } = req.query;
    const goals = await readGoals();
    const filteredGoals = userId ? goals.filter(goal => goal.userId === userId) : goals;
    res.json(filteredGoals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/goals/:id', async (req, res) => {
  try {
    const goals = await readGoals();
    const requestedId = req.params.id;
    // console.debug('Requested ID:', requestedId);
    // console.debug('Available goals:', goals.map(g => ({ id: g.id, title: g.title })));
    
    const goal = goals.find(g => String(g.id) === String(requestedId));
    if (!goal) {
      // console.debug('Goal not found');
      return res.status(404).json({ message: 'Goal not found' });
    }
    // console.debug('Found goal:', goal);
    res.json(goal);
  } catch (error) {
    console.error('Error in /api/goals/:id:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { userId, date, goalId } = req.query;
    const logs = await readLogs();
    const filteredLogs = logs.filter(log => {
      if (goalId) return log.goalId === goalId;
      if (userId && date) return log.userId === userId && log.date === date;
      return true;
    });
    res.json(filteredLogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const logs = await readLogs();
    const newLog = {
      id: Date.now().toString(),
      ...req.body,
    };
    
    // Remove any existing log for this goal/user/date combination
    const filteredLogs = logs.filter(
      log => !(log.goalId === newLog.goalId && 
               log.userId === newLog.userId && 
               log.date === newLog.date)
    );
    
    filteredLogs.push(newLog);
    await writeLogs(filteredLogs);
    res.status(201).json(newLog);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const goals = await readGoals();
    const newGoal = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    goals.push(newGoal);
    await writeGoals(goals);
    res.status(201).json(newGoal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.put('/api/goals/:id', async (req, res) => {
  try {
    const goals = await readGoals();
    const index = goals.findIndex(g => g.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Preserve the id and creation date
    const updatedGoal = {
      ...goals[index],
      ...req.body,
      id: goals[index].id,
      createdAt: goals[index].createdAt,
    };
    
    goals[index] = updatedGoal;
    await writeGoals(goals);
    res.json(updatedGoal);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


app.delete('/api/goals/:id', async (req, res) => {
  try {
    const goals = await readGoals();
    const filteredGoals = goals.filter(g => g.id !== req.params.id);
    await writeGoals(filteredGoals);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Initialize files and start server
initializeFiles().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(error => {
  console.error('Failed to initialize:', error);
});
