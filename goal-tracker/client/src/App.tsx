import React, { useEffect, useState } from 'react';
import { Box, Container, Paper, Typography, AppBar, Toolbar, Button, Dialog, DialogTitle, DialogContent } from '@mui/material';
import { GoalForm } from './components/GoalForm';
import { ProgressChart } from './components/ProgressChart';
import { LoginPage } from './components/LoginPage';
import { GoalTrackingPage } from './components/GoalTrackingPage';
import { Goal } from './types'; // Import Goal from types file
import { API_URL } from './config';

const App: React.FC = () => {
  // Initialize with mock data
//   const [goals, setGoals] = useState<Goal[]>(MOCK_GOALS);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);
    const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<'tracking' | 'form' | 'progress'>('tracking');
    const [addGoalDialogOpen, setAddGoalDialogOpen] = useState(false);

    // Add a function to fetch goals
    const fetchGoals = async (userId: string) => {
      try {
        const response = await fetch(`${API_URL}/api/goals?userId=${userId}`);
        const data = await response.json();
        setGoals(data);
      } catch (error) {
        console.error('Error fetching goals:', error);
      }
    };

    useEffect(() => {
      if (userId) {
        fetchGoals(userId);
      }
    }, [userId]);

    // Add a refresh handler
    const handleGoalUpdate = async () => {
      if (userId) {
        await fetchGoals(userId);
        setChartRefreshTrigger(prev => prev + 1);
      }
    };

    const handleGoalSubmit = async (newGoal: Goal) => {
        try {
          const response = await fetch(`${API_URL}/api/goals`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...newGoal, userId }),
          });
          const savedGoal = await response.json();
          await fetchGoals(userId!); // Refresh the goals list
          setChartRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.error('Error saving goal:', error);
        }
    };
    
    const handleLogout = () => {
        setUserId(null);
        setGoals([]);
    };

    if (!userId) {
        return <LoginPage onLogin={setUserId} />;
    }

  return (
    <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Goal Tracker
                </Typography>
                <Button 
                    color="inherit" 
                    onClick={() => setCurrentPage('tracking')}
                    >
                    Track
                </Button>
                <Button 
                color="inherit" 
                onClick={() => setCurrentPage('form')}
                >
                Add Goal
                </Button>
                <Button 
                color="inherit" 
                onClick={() => setCurrentPage('progress')}
                >
                    Progress
                </Button>
                <Button color="inherit" onClick={handleLogout}>
                    Logout
                </Button>
            </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            {currentPage === 'tracking' && (
              <GoalTrackingPage 
                userId={userId} 
                onGoalUpdate={handleGoalUpdate}
              />
            )}
            {currentPage === 'form' && (
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                <Typography variant="h6" gutterBottom>
                    Add New Goal
                </Typography>
                <GoalForm
                  onSubmit={async (newGoal) => {
                    await handleGoalSubmit(newGoal);
                    setAddGoalDialogOpen(false);
                    setChartRefreshTrigger(prev => prev + 1); // Add this
                  }}
                  onClose={() => setAddGoalDialogOpen(false)}
                />
                </Paper>
            )}
            {currentPage === 'progress' && (
              <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Goal Progress
              </Typography>
              <Box>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ p: 3 }}>
                    {goals.length > 0 ? (
                      goals.map((goal) => (
                        <ProgressChart 
                          key={goal.id} 
                          goalId={goal.id} 
                          goalTitle={goal.title}
                          defaultExpanded={true}
                          refreshTrigger={chartRefreshTrigger} // Add this
                        />
                      ))
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 3 }}>
                        <Typography color="textSecondary" gutterBottom>
                          No goals added yet. Add a goal to start tracking!
                        </Typography>
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => setAddGoalDialogOpen(true)}
                          sx={{ mt: 2 }}
                        >
                          Add New Goal
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Box>
            </Paper>
            )}
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
                    await handleGoalSubmit(newGoal);
                    setAddGoalDialogOpen(false);
                    handleGoalUpdate();
                  }}
                  onClose={() => setAddGoalDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
        </Container>
    </Box>
  );
};

export default App;
