import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent, Slider, DialogActions, IconButton, MenuItem, Menu, Badge } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Goal, GoalLog } from '../types';
import { EditGoalDialog } from './EditGoalDialog';
import { GoalForm } from './GoalForm';
import { format, addDays, subDays } from 'date-fns';
import TodayIcon from '@mui/icons-material/Today';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { GoalProgressPreview } from './GoalProgressPreview';
import { API_URL } from '../config';

interface GoalTrackingPageProps {
  userId: string;
  onGoalUpdate?: () => void;
}

export const GoalTrackingPage: React.FC<GoalTrackingPageProps> = ({ userId, onGoalUpdate }): JSX.Element => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [logs, setLogs] = useState<{ [goalId: string]: GoalLog }>({});
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGoalForMenu, setSelectedGoalForMenu] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [monthlyLogs, setMonthlyLogs] = useState<{ [date: string]: GoalLog[] }>({});
  const [currentViewMonth, setCurrentViewMonth] = useState<number>(new Date().getMonth());
  const [logsVersion, setLogsVersion] = useState(0);


  // Effect to fetch monthly logs
  useEffect(() => {
    const fetchMonthLogs = async () => {
      try {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const response = await fetch(
          `http://localhost:3001/api/logs/month?userId=${userId}&year=${year}&month=${month}`
        );
        const data = await response.json();
        setMonthlyLogs(data);
      } catch (error) {
        console.error('Error fetching monthly logs:', error);
      }
    };
  
    // Fetch when month changes or component mounts
    if (selectedDate.getMonth() !== currentViewMonth) {
      setCurrentViewMonth(selectedDate.getMonth());
    }
    fetchMonthLogs();
  }, [userId, selectedDate, currentViewMonth]);

  const getAchievementColor = (achievedCount: number, totalGoals: number): string => {
    if (totalGoals === 0) return 'transparent';
    const percentage = (achievedCount / totalGoals) * 100;
    
    if (percentage >= 75) return '#4caf50'; // success.main - green
    if (percentage >= 25) return '#ff9800'; // warning.main - yellow/orange
    return '#f44336'; // error.main - red
  };

  // Add calendar badge renderer
  const renderDayWithBadge = (props: any) => {
    const dateStr = format(props.day, 'yyyy-MM-dd');
    const dayLogs = monthlyLogs[dateStr] || [];
    const achievedLogs = dayLogs.filter(log => log.status === 'achieved');
    const isSelected = format(props.day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
    const isToday = format(props.day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const achievementColor = getAchievementColor(achievedLogs.length, goals.length);

    return (
      <Box
        onClick={() => {
          setSelectedDate(props.day);
          setCalendarOpen(false);
        }}
        sx={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
          margin: '2px',
          borderRadius: '50%',
          fontWeight: isToday ? 700 : 400, // Bold for current date
          ...props.outsideCurrentMonth && {
            color: 'text.disabled',
          },
          ...(isSelected && dayLogs.length > 0) && {
            backgroundColor: achievementColor,
            color: 'white',
          },
          ...(isSelected && dayLogs.length === 0) && {
            backgroundColor: 'rgba(0, 0, 0, 0.1)', // Light gray background if no logs
          },
          ...(!props.outsideCurrentMonth && !isSelected) && {
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          },
          ...(dayLogs.length > 0 && !isSelected) && {
            '&::after': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: `2px solid ${achievementColor}`,
              borderRadius: '50%',
              pointerEvents: 'none',
            }
          }
        }}
      >
        {props.day.getDate()}
      </Box>
    );
  };

  // Fetch goals for the user
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch(`${API_URL}/api/goals?userId=${userId}`);
        const data = await response.json();
        setGoals(data);
      } catch (error) {
        console.error('Error fetching goals:', error);
      }
    };
    fetchGoals();
  }, [userId]);

  // Fetch logs for selected date
  useEffect(() => {
    const fetchDayLogs = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_URL}/api/logs?userId=${userId}&date=${today}`);
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const data = await response.json();
        const logsMap = data.reduce((acc: any, log: GoalLog) => {
          acc[log.goalId] = log;
          return acc;
        }, {});
        setLogs(logsMap);
      } catch (error) {
        console.error('Error fetching logs:', error);
      }
    };
    fetchDayLogs();
  }, [userId, selectedDate]);

  const handlePreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const getGoalStatus = (goalId: string) => {
    return logs[goalId]?.status || 'not_logged';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'achieved':
        return 'success.main';
      case 'failed':
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  const handleGoalClick = (goal: Goal) => {
    const currentStatus = getGoalStatus(goal.id);
    if (currentStatus === 'not_logged') {
      setSelectedGoal(goal);
      setDialogOpen(true);
    } else if (currentStatus === 'achieved') {
      updateGoalStatus(goal.id, 'failed');
    } else {
      updateGoalStatus(goal.id, 'not_logged');
    }
  };

  const updateGoalStatus = async (goalId: string, status: 'achieved' | 'failed' | 'not_logged', rating?: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          userId,
          date: dateStr,
          status,
          rating,
        }),
      });
      const newLog = await response.json();
      
      // Update the daily logs
      setLogs(prev => ({
        ...prev,
        [goalId]: newLog,
      }));
      if (onGoalUpdate) {
        onGoalUpdate(); // Call the update function after logging
      }

      // Increment the logs version to trigger preview updates
      setLogsVersion(v => v + 1);
  
      // Fetch updated monthly logs
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const monthlyResponse = await fetch(
        `http://localhost:3001/api/logs/month?userId=${userId}&year=${year}&month=${month}`
      );
      const monthlyData = await monthlyResponse.json();
      setMonthlyLogs(monthlyData);
      
    } catch (error) {
      console.error('Error updating goal status:', error);
    }
  };
  

  const handleRatingSubmit = () => {
    if (selectedGoal) {
      updateGoalStatus(selectedGoal.id, 'achieved', rating);
      setDialogOpen(false);
      setSelectedGoal(null);
      setRating(5);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, goal: Goal) => {
    setAnchorEl(event.currentTarget);
    setSelectedGoalForMenu(goal);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedGoalForMenu(null);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
    setAnchorEl(null);  // Just close the menu, don't clear the selected goal
  };

  // Add a new handler for the dialog close
  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedGoalForMenu(null);  // Clear the selected goal when dialog is closed
  };
  
  // Also modify handleEditSave to clear selectedGoalForMenu
  const handleEditSave = async (updatedGoal: Goal) => {
    try {
      const response = await fetch(`${API_URL}/api/goals/${updatedGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGoal),
      });
      const savedGoal = await response.json();
      setGoals(goals.map(g => g.id === savedGoal.id ? savedGoal : g));
      setEditDialogOpen(false);
      setSelectedGoalForMenu(null);  // Clear selected goal after successful save
      if (onGoalUpdate) {
        onGoalUpdate(); // Call the update function after editing
      }
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedGoalForMenu) return;

    try {
      await fetch(`${API_URL}/api/goals/${selectedGoalForMenu.id}`, {
        method: 'DELETE',
      });
      setGoals(goals.filter(g => g.id !== selectedGoalForMenu.id));
      if (onGoalUpdate) {
        onGoalUpdate(); // Call the update function after deletion
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
    handleMenuClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        mb: 3,
        gap: 2
      }}>
        <IconButton onClick={handlePreviousDay}>
          <ArrowBackIosNewIcon />
        </IconButton>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 1
        }}>
          <Typography 
            variant="h5" 
            sx={{ cursor: 'pointer' }}
            onClick={() => setCalendarOpen(true)}
          >
            {format(selectedDate, 'MMMM d, yyyy')}
          </Typography>
          <IconButton 
            onClick={handleTodayClick}
            sx={{ 
              ml: 1,
              bgcolor: format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') 
                ? 'primary.main' 
                : 'transparent',
              color: format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ? 'white'
                : 'primary.main',
              '&:hover': {
                bgcolor: 'primary.light',
              }
            }}
          >
            <TodayIcon />
          </IconButton>
        </Box>
        <IconButton onClick={handleNextDay}>
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>

       {/* Add the Calendar Dialog */}
       <Dialog
          open={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DateCalendar
            value={selectedDate}
            onChange={(newDate) => {
              if (newDate) {
                setSelectedDate(newDate);
                setCalendarOpen(false);
              }
            }}
            onMonthChange={(date) => {
              setCurrentViewMonth(date.getMonth());
            }}
            slots={{
              day: renderDayWithBadge
            }}
            sx={{
              '& .MuiDayCalendar-weekDayLabel': {
                width: 36,
                height: 36,
                margin: '0 2px',
              },
              '& .MuiPickersDay-root': {
                margin: '0 2px',
              }
            }}
          />
          </LocalizationProvider>
        </Dialog>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {goals.map((goal) => (
          <Paper
            key={goal.id}
            sx={{
              p: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography variant="h6">{goal.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {goal.floor} - {goal.ceiling} {goal.unit}
                </Typography>
              </Box>
              <GoalProgressPreview goalId={goal.id} selectedDate={selectedDate} logsVersion={logsVersion}/>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                onClick={() => handleGoalClick(goal)}
                sx={{
                  backgroundColor: getStatusColor(getGoalStatus(goal.id)),
                  '&:hover': {
                    backgroundColor: getStatusColor(getGoalStatus(goal.id)),
                    opacity: 0.9,
                  },
                }}
              >
                {getGoalStatus(goal.id).replace('_', ' ')}
              </Button>
              <IconButton
                aria-label="more"
                onClick={(e) => handleMenuClick(e, goal)}
              >
                <MoreVertIcon />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Goal options menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>Edit</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Edit dialog */}
      <EditGoalDialog
        open={editDialogOpen}
        goal={selectedGoalForMenu}
        onClose={handleEditDialogClose}  // Use new handler
        onSave={handleEditSave}
      />

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        aria-labelledby="rating-dialog-title"
        disableEnforceFocus // Add this line
        keepMounted // Add this line
      >
        <DialogTitle>Rate Your Achievement</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            How would you rate your achievement between the floor ({selectedGoal?.floor}) and ceiling ({selectedGoal?.ceiling})?
          </Typography>
          <Slider
            value={rating}
            onChange={(_, value) => setRating(value as number)}
            min={1}
            max={10}
            marks
            valueLabelDisplay="auto"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRatingSubmit} variant="contained">
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    
    {/* Add Goal Button - place this after the goals list */}
    <Button 
      variant="contained" 
      color="primary" 
      onClick={() => setAddGoalDialogOpen(true)}
      sx={{ mt: 2 }}
    >
      Add New Goal
    </Button>

    {/* Add Goal Dialog */}
    <Dialog 
      open={addGoalDialogOpen} 
      onClose={() => setAddGoalDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>Add New Goal</DialogTitle>
      <DialogContent>
        <GoalForm 
          onSubmit={async (newGoal) => {
            try {
              const goalToSave = {
                ...newGoal,
                userId,
                id: Date.now().toString(), // Ensure ID is set client-side
              };

              const response = await fetch(`${API_URL}/api/goals`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(goalToSave),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const savedGoal = await response.json();
              console.log('Saved goal:', savedGoal); // Debug log
              setGoals(prevGoals => [...prevGoals, savedGoal]);
              setAddGoalDialogOpen(false);
              if (onGoalUpdate) {
                onGoalUpdate(); // Call the update function after adding
              }
            } catch (error) {
              console.error('Error adding goal:', error);
            }
          }} 
        />
      </DialogContent>
    </Dialog>


    </Box>
  );
};
