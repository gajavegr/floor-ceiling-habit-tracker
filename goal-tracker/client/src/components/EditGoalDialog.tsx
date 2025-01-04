import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Goal } from '../types';
import { GoalForm } from './GoalForm';

interface EditGoalDialogProps {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: (updatedGoal: Goal) => void;
}

export const EditGoalDialog: React.FC<EditGoalDialogProps> = ({
  open,
  goal,
  onClose,
  onSave,
}) => {
  if (!goal) return null;
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Goal</DialogTitle>
      <DialogContent>
        {goal && <GoalForm onSubmit={onSave} initialGoal={goal} onClose={onClose} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};
