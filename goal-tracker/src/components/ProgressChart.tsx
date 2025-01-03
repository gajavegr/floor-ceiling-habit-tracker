import { Box, TextField, IconButton, Paper, Collapse, Button, Typography } from '@mui/material';
import { format, startOfWeek, endOfWeek, isWithinInterval, addWeeks, isSameDay } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

interface ProgressChartProps {
  goalId: string;
  goalTitle: string;  // Add this prop to display the goal title
  defaultExpanded?: boolean;  // Optional prop to control initial expansion state
}

interface LogData {
  date: string;
  status: string;
  rating: number;
}

interface ChartData {
  date: string;
  value: number;
  floor: number;
  ceiling: number;
}

interface StreakData {
  date: string;
  streak: number;
}

interface SuccessData {
  date: string;
  success: number;
}

interface Goal {
  id: string;
  frequencyType: string;
  daysPerPeriod?: number;
  periodUnit?: string;
  specificDays?: string[];
  repeatEveryNDays?: number;
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ goalId, goalTitle, defaultExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [streakData, setStreakData] = useState<StreakData[]>([]);
  const [successData, setSuccessData] = useState<SuccessData[]>([]);
  const [floorLabel, setFloorLabel] = useState<string>('');
  const [ceilingLabel, setCeilingLabel] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const calculateSuccessData = (logs: LogData[], goal: Goal): SuccessData[] => {
    const successData: SuccessData[] = [];
    
    if (!logs.length) return [];

    // Sort logs by date
    const sortedLogs = logs.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const startDate = new Date(sortedLogs[0].date);
    const endDate = new Date(sortedLogs[sortedLogs.length - 1].date);

    switch (goal.frequencyType) {
      case 'daily':
        // For daily goals, success is achieved if the goal was achieved that day
        sortedLogs.forEach(log => {
          successData.push({
            date: format(new Date(log.date), 'MMM dd'),
            success: log.status === 'achieved' ? 1 : 0
          });
        });
        break;

      case 'days_per_period':
        if (goal.periodUnit === 'week') {
          let currentWeekStart = startOfWeek(startDate);
          let currentWeekEnd = endOfWeek(currentWeekStart);

          while (currentWeekStart <= endDate) {
            // Count achievements in current week
            const weekLogs = sortedLogs.filter(log => 
              isWithinInterval(new Date(log.date), {
                start: currentWeekStart,
                end: currentWeekEnd
              }) && log.status === 'achieved'
            );

            // If we hit the target number of achievements for the week,
            // mark the last achievement of the week as a success
            if (weekLogs.length >= (goal.daysPerPeriod || 0) && weekLogs.length > 0) {
              successData.push({
                date: format(new Date(weekLogs[weekLogs.length - 1].date), 'MMM dd'),
                success: 1
              });
            }

            currentWeekStart = addWeeks(currentWeekStart, 1);
            currentWeekEnd = endOfWeek(currentWeekStart);
          }
        }
        // Add similar logic for month and year if needed
        break;

      case 'specific_days':
        if (goal.specificDays) {
          sortedLogs.forEach(log => {
            const logDate = new Date(log.date);
            const dayName = format(logDate, 'EEEE').toLowerCase();
            if (goal.specificDays && goal.specificDays.includes(dayName)) {
              successData.push({
                date: format(logDate, 'MMM dd'),
                success: log.status === 'achieved' ? 1 : 0
              });
            }
          });
        }
        break;

      case 'repeating_n_days':
        if (goal.repeatEveryNDays) {
          let lastSuccess = new Date(sortedLogs[0].date);
          
          sortedLogs.forEach(log => {
            const logDate = new Date(log.date);
            const daysSinceLastSuccess = Math.floor(
              (logDate.getTime() - lastSuccess.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (goal.repeatEveryNDays && daysSinceLastSuccess >= goal.repeatEveryNDays && log.status === 'achieved') {
              successData.push({
                date: format(logDate, 'MMM dd'),
                success: 1
              });
              lastSuccess = logDate;
            }
          });
        }
        break;
    }

    return successData;
  };

  // Calculate streak data
  const calculateStreakData = (logs: LogData[]): StreakData[] => {
    let currentStreak = 0;
    const streakData: StreakData[] = [];
    
    // Sort logs by date
    const sortedLogs = [...logs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (let i = 0; i < sortedLogs.length; i++) {
      const currentLog = sortedLogs[i];
      const currentDate = new Date(currentLog.date);
      const previousDate = i > 0 ? new Date(sortedLogs[i - 1].date) : null;
      
      if (currentLog.status === 'achieved') {
        if (previousDate) {
          // Check if this log is consecutive with the previous one
          const dayDifference = Math.floor(
            (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (dayDifference === 1 && sortedLogs[i - 1].status === 'achieved') {
            // Consecutive day achievement
            currentStreak += 1;
          } else {
            // Gap in days or previous failure - reset streak
            currentStreak = 1;
          }
        } else {
          // First achievement
          currentStreak = 1;
        }
      } else {
        // Failed or skipped - reset streak
        currentStreak = 0;
      }

      streakData.push({
        date: format(currentDate, 'MMM dd'),
        streak: currentStreak
      });
    }

    return streakData;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch goal details
        const goalResponse = await fetch(`http://localhost:3001/api/goals/${goalId}`);
        if (!goalResponse.ok) {
          throw new Error(`Goal fetch failed with status: ${goalResponse.status}`);
        }
        const goal = await goalResponse.json();

        // Store the text labels
        setFloorLabel(goal.floor);
        setCeilingLabel(goal.ceiling);

        // Fetch logs for this goal
        const logsResponse = await fetch(`http://localhost:3001/api/logs?goalId=${goalId}`);
        if (!logsResponse.ok) {
          throw new Error(`Logs fetch failed with status: ${logsResponse.status}`);
        }
        const logs: LogData[] = await logsResponse.json();

        // Sort logs by date
        const sortedLogs = logs.sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Transform the data
        const transformedData = logs
          .filter(log => log.status === 'achieved') // Only include achieved goals
          .map(log => ({
            date: log.date,
            value: log.rating,
            floor: 1,
            ceiling: 10
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate streak data
        const streakData = calculateStreakData(sortedLogs);
        
        // Calculate success data
        const successData = calculateSuccessData(logs, goal);

        setChartData(transformedData);
        setStreakData(streakData);
        setSuccessData(successData);
        setError(null);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
      }
    };

    if (goalId) {
      fetchData();
    }
  }, [goalId]);

  if (error) {
    return <Box sx={{ textAlign: 'center', py: 2, color: 'error.main' }}>Error loading progress data</Box>;
  }

  if (chartData.length === 0) {
    return <Box sx={{ textAlign: 'center', py: 2 }}>No progress data available yet</Box>;
  }

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        width: '100%', 
        mb: 3,
        p: 2,
        backgroundColor: '#f5f5f5'  // Light grey background to distinguish different goals
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 2
      }}>
        <Typography 
          variant="h4" 
          component="h2" 
          sx={{ 
            fontWeight: 'bold',
            color: '#333'
          }}
        >
          {goalTitle}
        </Typography>
        <IconButton 
          onClick={() => setIsExpanded(!isExpanded)}
          aria-label={isExpanded ? "collapse" : "expand"}
        >
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        <Box sx={{ 
          mt: 2,
          backgroundColor: 'white',
          borderRadius: 1,
          p: 2,
          mb: 2
        }}>
          <Typography variant="h6" gutterBottom color="primary">
            Achievement Ratings
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="date" />
              <YAxis 
                domain={[0, 10]} 
                ticks={[0, 1, 10]} 
                tickFormatter={(value) => {
                  if (value === 1) return floorLabel;
                  if (value === 10) return ceilingLabel;
                  return '';
                }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'Floor') return floorLabel;
                  if (name === 'Ceiling') return ceilingLabel;
                  return value;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" name="Achievement" />
              <Line type="monotone" dataKey="floor" stroke="#82ca9d" name="Floor" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="ceiling" stroke="#ff7300" name="Ceiling" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }} color="primary">
            Daily Streak
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={streakData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="stepAfter" 
                dataKey="streak" 
                stroke="#2196f3" 
                name="Streak" 
                dot={{ stroke: '#2196f3', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <Typography variant="h6" gutterBottom sx={{ mt: 4 }} color="primary">
            Goal Success
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={successData}>
              <XAxis dataKey="date" />
              <YAxis domain={[0, 1]} ticks={[0, 1]} />
              <Tooltip />
              <Legend />
              <Line 
                type="step" 
                dataKey="success" 
                stroke="#4caf50" 
                name="Success" 
                dot={{ stroke: '#4caf50', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Collapse>
    </Paper>
  );
};
