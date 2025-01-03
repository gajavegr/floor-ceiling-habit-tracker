// src/components/GoalProgressPreview.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { format } from 'date-fns';

interface GoalProgressPreviewProps {
    goalId: string;
    selectedDate: Date;
    logsVersion?: number;  // Add this prop to trigger re-renders when logs change
}

const debug = (message: string, ...args: any[]) => {
    if (process.env.DEBUG) {
      console.debug(`[GoalProgressPreview] ${message}`, ...args);
    }
  };

export const GoalProgressPreview: React.FC<GoalProgressPreviewProps> = ({ goalId, selectedDate, logsVersion = 0 }) => {
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        setLoading(true);
        // Add timezone offset to ensure correct date
        const dateStr = format(selectedDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
        debug('Client: Sending date to server:', dateStr);
        const response = await fetch(
            `http://localhost:3001/api/goals/${goalId}/progress?date=${encodeURIComponent(dateStr)}`
        );
        const data = await response.json();
        setProgress(data);
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [goalId, selectedDate, logsVersion]);

  if (loading) {
    return <CircularProgress size={20} />;
  }

  switch (progress?.type) {
    case 'period':
      if (progress.periodUnit === 'week' && progress.dailyStatus) {
        debug('Client: Received dailyStatus:', progress.dailyStatus);
        debug(`Client: Selected date is ${format(selectedDate, 'EEEE')} (${format(selectedDate, 'yyyy-MM-dd')})`);
        return (
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {progress.dailyStatus.map((day: any, index: number) => {
                // Instead of creating a new Date object, just compare the date strings directly
                const isCurrentDay = day.date === format(selectedDate, 'yyyy-MM-dd');
                
                debug(`Client: Rendering day at index ${index} (${day.date}), isCurrentDay: ${isCurrentDay}`);
            
                return (
                    <Box
                        key={index}
                        sx={{
                            position: 'relative',
                            color: day.isAchieved ? 'success.main' : 
                                    day.isRequired ? 'warning.main' : 'action.disabled',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            '&::after': isCurrentDay ? {
                                content: '""',
                                position: 'absolute',
                                top: -2,
                                left: -2,
                                right: -2,
                                bottom: -2,
                                border: '1px solid rgba(0, 0, 0, 0.23)',
                                borderRadius: '50%',
                                zIndex: 0,
                                } : {},
                                zIndex: isCurrentDay ? 1 : 0,
                            }}
                        >
                        {day.isAchieved ? (
                        <CheckCircleIcon sx={{ 
                        fontSize: 20,
                        position: 'relative',
                        zIndex: 1,
                        }} />
                        ) : (
                            <RadioButtonUncheckedIcon sx={{ 
                                fontSize: 20,
                                position: 'relative',
                                zIndex: 1,
                              }} />
                        )}
                        {day.isRequired && !day.isAchieved && (
                        <PriorityHighIcon 
                            sx={{ 
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            fontSize: 14,
                            color: 'warning.main'
                            }} 
                        />
                        )}
                    </Box>
                );
            })}
          </Box>
        );
      } else {
        return (
          <Typography variant="body2" color="text.secondary">
            {progress.achieved}/{progress.required} this {progress.periodUnit}
          </Typography>
        );
      }

    case 'daily':
        debug(`Client: Daily goal status for ${format(selectedDate, 'yyyy-MM-dd')}: ${progress.isAchieved}`);
        return (
        <Box sx={{ color: progress.isAchieved ? 'success.main' : 'action.disabled' }}>
            {progress.isAchieved ? (
            <CheckCircleIcon sx={{ fontSize: 20 }} />
            ) : (
            <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
            )}
        </Box>
        );

    case 'specific_days':
        debug(`Client: Specific days goal status for ${format(selectedDate, 'yyyy-MM-dd')}: required=${progress.isRequired}, achieved=${progress.isAchieved}`);
        return progress.isRequired ? (
            <Box sx={{ color: progress.isAchieved ? 'success.main' : 'action.disabled' }}>
            {progress.isAchieved ? (
                <CheckCircleIcon sx={{ fontSize: 20 }} />
            ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 20 }} />
            )}
            </Box>
        ) : null;

    case 'repeating':
        debug(`Client: Repeating goal status: required=${progress.isRequired}, daysSince=${progress.daysSinceLastAchievement}`);
        return progress.isRequired ? (
            <Box sx={{ color: 'warning.main' }}>
            <Typography variant="body2">
                Due today ({progress.daysSinceLastAchievement} days since last)
            </Typography>
            </Box>
        ) : (
            <Typography variant="body2" color="text.secondary">
            Due in {progress.repeatEveryNDays - progress.daysSinceLastAchievement} days
            </Typography>
        );

    default:
      return null;
  }
};
