import React, { useState, useEffect } from 'react';
import { Box, Container, Paper, Typography, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent, Slider, DialogActions, IconButton, MenuItem, Menu } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Goal, GoalLog } from '../types';
import { EditGoalDialog } from './EditGoalDialog';
import { GoalForm } from './GoalForm';
import { API_URL } from '../config';


interface GoalTrackingPageProps {
  userId: string;
}

export const GoalTrackingPage: React.FC<GoalTrackingPageProps> = ({ userId }): JSX.Element => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [logs, setLogs] = useState<{ [goalId: string]: GoalLog }>({});
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedGoalForMenu, setSelectedGoalForMenu] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);


  // Fetch goals for the user
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await fetch(`${API_URL}/api//goals?userId=${userId}`);
        const data = await response.json();
        setGoals(data);
      } catch (error) {
        console.error('Error fetching goals:', error);
      }
    };
    fetchGoals();
  }, [userId]);

  // Fetch today's logs
  useEffect(() => {
    const fetchTodayLogs = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_URL}/api/logs?userId=${userId}&date=${today}`);
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
    fetchTodayLogs();
  }, [userId]);

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
      const response = await fetch(`${API_URL}/api/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goalId,
          userId,
          date: today,
          status,
          rating,
        }),
      });
      const newLog = await response.json();
      setLogs(prev => ({
        ...prev,
        [goalId]: newLog,
      }));
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
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
    handleMenuClose();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Today's Goals
      </Typography>
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
            <Box>
              <Typography variant="h6">{goal.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {goal.floor} - {goal.ceiling} {goal.unit}
              </Typography>
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
              const response = await fetch(`${API_URL}/api/goals`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...newGoal, userId }),
              });
              const savedGoal = await response.json();
              setGoals([...goals, savedGoal]);
              setAddGoalDialogOpen(false);
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
