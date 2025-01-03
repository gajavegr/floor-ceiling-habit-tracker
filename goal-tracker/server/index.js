const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'data', 'goals.json');
const usersPath = path.join(__dirname, 'data', 'users.json');
const logsPath = path.join(__dirname, 'data', 'logs.json');
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
    // debug('Requested ID:', requestedId);
    // debug('Available goals:', goals.map(g => ({ id: g.id, title: g.title })));
    
    const goal = goals.find(g => String(g.id) === String(requestedId));
    if (!goal) {
      // debug('Goal not found');
      return res.status(404).json({ message: 'Goal not found' });
    }
    // debug('Found goal:', goal);
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

// Get goal progress for the current period
app.get('/api/goals/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query; // Current date to calculate progress from
    
    const goals = await readGoals();
    const logs = await readLogs();
    const goal = goals.find(g => g.id === id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }

    const currentDate = date ? new Date(date) : new Date();
    
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


const PORT = process.env.PORT || 3001;

// Initialize files and start server
initializeFiles().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}).catch(error => {
  console.error('Failed to initialize:', error);
});
