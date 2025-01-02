import { Box, TextField, Button } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface ProgressChartProps {
  goalId: string;
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

export const ProgressChart: React.FC<ProgressChartProps> = ({ goalId }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // console.log('Fetching goal with ID:', goalId);
        // Fetch goal details
        const goalResponse = await fetch(`http://localhost:3001/api/goals/${goalId}`);
        if (!goalResponse.ok) {
          console.log('Goal response not OK:', await goalResponse.text());
          throw new Error(`Goal fetch failed with status: ${goalResponse.status}`);
        }
        const goal = await goalResponse.json();

        // Fetch logs for this goal
        const logsResponse = await fetch(`http://localhost:3001/api/logs?goalId=${goalId}`);
        if (!logsResponse.ok) {
          throw new Error(`Logs fetch failed with status: ${logsResponse.status}`);
        }
        const logs: LogData[] = await logsResponse.json();

        // Transform the data
        const transformedData = logs
          .filter(log => log.status === 'achieved') // Only include achieved goals
          .map(log => ({
            date: log.date,
            value: log.rating,
            floor: goal.floor,
            ceiling: goal.ceiling
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        setChartData(transformedData);
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
    <LineChart width={600} height={300} data={chartData}>
      <XAxis dataKey="date" />
      <YAxis domain={[0, 10]} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="value" stroke="#8884d8" name="Achievement" />
      <Line type="monotone" dataKey="floor" stroke="#82ca9d" name="Floor" strokeDasharray="5 5" />
      <Line type="monotone" dataKey="ceiling" stroke="#ff7300" name="Ceiling" strokeDasharray="5 5" />
    </LineChart>
  );
};
