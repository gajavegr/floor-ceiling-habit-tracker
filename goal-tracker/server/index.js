process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;  // Changed from 3001 to 3000

const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'data')
  : path.join(__dirname, 'data');

// Middleware
// Update CORS configuration to use environment variables
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gajavegr-mvp-functionality--floor-ceiling-goal-tracker.netlify.app',
  'https://floor-ceiling-goal-tracker.netlify.app'
];

if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use(express.json());

const dataPath = path.join(DATA_DIR, 'goals.json');
const usersPath = path.join(DATA_DIR, 'users.json');
const logsPath = path.join(DATA_DIR, 'logs.json');
// At the top of index.js, add these imports
const { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  isWithinInterval, 
  eachDayOfInterval,
  differenceInDays 
} = require('date-fns');

const debug = (message, ...args) => {
  if (process.env.DEBUG) {
    console.debug(`[Server] ${message}`, ...args);
  }
};



// Initialize function
async function initializeFiles() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  const files = {
    users: path.join(DATA_DIR, 'users.json'),
    goals: path.join(DATA_DIR, 'goals.json'),
    logs: path.join(DATA_DIR, 'logs.json')
  };

  for (const [name, filePath] of Object.entries(files)) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '[]', 'utf8');
      console.log(`Created ${name} file`);
    }
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
    const goals = JSON.parse(data);
    console.log('Read goals from file:', goals.length, 'goals found');
    return goals;
  } catch (error) {
    console.error('Error reading goals:', error);
    return [];
  }
};

const writeGoals = async (goals) => {
  try {
    console.log('Writing goals to file:', goals.length, 'goals');
    await fs.writeFile(dataPath, JSON.stringify(goals, null, 2));
    console.log('Goals successfully written to file');
  } catch (error) {
    console.error('Error writing goals:', error);
  }
};

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});


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
    console.log('GET /api/goals/:id - Requested ID:', requestedId);
    console.log('Available goals:', goals.map(g => ({ id: g.id, title: g.title })));
    // console.debug('Requested ID:', requestedId);
    // console.debug('Available goals:', goals.map(g => ({ id: g.id, title: g.title })));
    // debug('Requested ID:', requestedId);
    // debug('Available goals:', goals.map(g => ({ id: g.id, title: g.title })));
    
    const goal = goals.find(g => String(g.id) === String(requestedId));
    if (!goal) {
      console.log('Goal not found for ID:', requestedId);
      // console.debug('Goal not found');
      // debug('Goal not found');
      return res.status(404).json({ 
        message: 'Goal not found',
        requestedId,
        availableIds: goals.map(g => g.id)
      });
    }
    console.log('Found goal:', goal);
    // console.debug('Found goal:', goal);
    // debug('Found goal:', goal);
    res.json(goal);
  } catch (error) {
    console.error('Error in /api/goals/:id:', error);
    res.status(500).json({ 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

// Get goal progress for the current period
app.get('/api/goals/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Current date to calculate progress from

    debug('Server: Received date string:', date);
    const currentDate = date ? new Date(date) : new Date();
    debug('Server: Parsed date:', format(currentDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));
    
    const goals = await readGoals();
    const logs = await readLogs();
    const goal = goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    switch (goal.frequencyType) {
      case 'days_per_period': {
        const currentDate = date ? new Date(date) : new Date();
        debug(`Server: Selected date is ${format(currentDate, 'EEEE')} (${format(currentDate, 'yyyy-MM-dd')})`);

         // Ensure we're working with proper Date objects and Sunday as start of week
        const periodStart = goal.periodUnit === 'week' 
          ? startOfWeek(currentDate, { weekStartsOn: 0 }) // 0 = Sunday
          : goal.periodUnit === 'month'
            ? startOfMonth(currentDate)
            : startOfYear(currentDate);

        debug(`Server: Week starts on ${format(periodStart, 'EEEE')} (${format(periodStart, 'yyyy-MM-dd')})`);
        
          const periodEnd = goal.periodUnit === 'week'
            ? endOfWeek(currentDate, { weekStartsOn: 0 }) // 0 = Sunday
          : goal.periodUnit === 'month'
            ? endOfMonth(currentDate)
            : endOfYear(currentDate);

        // Get achievements in current period
        const periodLogs = logs.filter(log => {
          const logDate = new Date(log.date);
          return log.goalId === id &&
            log.status === 'achieved' &&
            isWithinInterval(logDate, { 
              start: periodStart, 
              end: periodEnd 
            });
        });

        // For weekly goals, get day-by-day status
        const dailyStatus = goal.periodUnit === 'week' ? 
          eachDayOfInterval({ start: periodStart, end: periodEnd }, { weekStartsOn: 0 })
            .map((day, index) => {
              debug(`Server: Day ${format(day, 'EEEE')} at index ${index}`);
              const dayStr = format(day, 'yyyy-MM-dd');
              const achieved = periodLogs.some(log => {
                debug(`Comparing log date ${log.date} with day ${dayStr}`);
                return log.date === dayStr;
              });
              
              return {
                date: dayStr,
                dayOfWeek: format(day, 'EEEE'),
                isAchieved: achieved,
                isRequired: periodLogs.length < (goal.daysPerPeriod || 0)
              };
            }) : null;
        debug('Server: Final dailyStatus:', dailyStatus?.map(d => ({
          dayOfWeek: d.dayOfWeek,
          date: d.date,
          isAchieved: d.isAchieved
        })));
        res.json({
          type: 'period',
          achieved: periodLogs.length,
          required: goal.daysPerPeriod || 0,
          periodUnit: goal.periodUnit,
          dailyStatus,
          periodStart: format(periodStart, 'yyyy-MM-dd'),
          periodEnd: format(periodEnd, 'yyyy-MM-dd')
        });
        break;
      }

      case 'daily': {
        const dayStr = format(currentDate, 'yyyy-MM-dd');
        const todayLog = logs.find(log => 
          log.goalId === id && 
          log.date === dayStr
        );
        
        res.json({
          type: 'daily',
          isAchieved: todayLog?.status === 'achieved'
        });
        break;
      }

      case 'specific_days': {
        const dayStr = format(currentDate, 'yyyy-MM-dd');
        const today = format(currentDate, 'EEEE').toLowerCase();
        res.json({
          type: 'specific_days',
          isRequired: goal.specificDays.includes(today),
          isAchieved: logs.some(log => 
            log.goalId === id &&
            log.date === dayStr &&
            log.status === 'achieved'
          )
        });
        break;
      }

      case 'repeating_n_days': {
        // Find the last achievement
        const lastAchievement = [...logs]
          .filter(log => log.goalId === id && log.status === 'achieved')
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateB.getTime() - dateA.getTime();
          })[0];

          const daysSinceLastAchievement = lastAchievement
          ? differenceInDays(
              new Date(format(currentDate, 'yyyy-MM-dd')),
              new Date(lastAchievement.date)
            )
          : goal.repeatEveryNDays;

        res.json({
          type: 'repeating',
          isRequired: daysSinceLastAchievement >= goal.repeatEveryNDays,
          daysSinceLastAchievement,
          repeatEveryNDays: goal.repeatEveryNDays
        });
        break;
      }
    }
  } catch (error) {
    console.error('Error in progress endpoint:', error);
    res.status(500).json({ 
      message: error.message,
      stack: error.stack // This helps with debugging
    });
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

app.get('/api/logs/month', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    debug('Server: Received date string:', date);
    const currentDate = date ? new Date(date) : new Date();
    debug('Server: Parsed date:', format(currentDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"));

    const { userId, year, month } = req.query;
    const logs = await readLogs();
    
    // Convert to numbers
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Get previous and next month/year
    const prevMonth = monthNum === 0 ? 11 : monthNum - 1;
    const prevYear = monthNum === 0 ? yearNum - 1 : yearNum;
    const nextMonth = monthNum === 11 ? 0 : monthNum + 1;
    const nextYear = monthNum === 11 ? yearNum + 1 : yearNum;
    
    // Filter logs for the current month and adjacent months
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      const logYear = logDate.getFullYear();
      const logMonth = logDate.getMonth();
      
      // Check if log is in current month, previous month, or next month
      const isCurrentMonth = logYear === yearNum && logMonth === monthNum;
      const isPrevMonth = logYear === prevYear && logMonth === prevMonth;
      const isNextMonth = logYear === nextYear && logMonth === nextMonth;
      
      return (
        log.userId === userId && 
        (isCurrentMonth || isPrevMonth || isNextMonth) &&
        (log.status === 'achieved' || log.status === 'failed')
      );
    });

    // Group logs by date
    const logsByDate = filteredLogs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {});

    res.json(logsByDate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/logs/month', async (req, res) => {
  try {
    const { userId, year, month } = req.query;
    const logs = await readLogs();
    
    // Convert to numbers
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    // Get previous and next month/year
    const prevMonth = monthNum === 0 ? 11 : monthNum - 1;
    const prevYear = monthNum === 0 ? yearNum - 1 : yearNum;
    const nextMonth = monthNum === 11 ? 0 : monthNum + 1;
    const nextYear = monthNum === 11 ? yearNum + 1 : yearNum;
    
    // Filter logs for the current month and adjacent months
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      const logYear = logDate.getFullYear();
      const logMonth = logDate.getMonth();
      
      // Check if log is in current month, previous month, or next month
      const isCurrentMonth = logYear === yearNum && logMonth === monthNum;
      const isPrevMonth = logYear === prevYear && logMonth === prevMonth;
      const isNextMonth = logYear === nextYear && logMonth === nextMonth;
      
      return (
        log.userId === userId && 
        (isCurrentMonth || isPrevMonth || isNextMonth) &&
        (log.status === 'achieved' || log.status === 'failed')
      );
    });

    // Group logs by date
    const logsByDate = filteredLogs.reduce((acc, log) => {
      const date = log.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(log);
      return acc;
    }, {});

    res.json(logsByDate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// error handling
// Update your error handler
app.use((err, req, res, next) => {
  console.error('Error details:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Update server initialization
// Update your server initialization
const initializeServer = async () => {
  try {
    await initializeFiles();
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });

    // Graceful shutdown
    ['SIGTERM', 'SIGINT'].forEach(signal => {
      process.on(signal, () => {
        console.log(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
          console.log('Server closed');
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

initializeServer();