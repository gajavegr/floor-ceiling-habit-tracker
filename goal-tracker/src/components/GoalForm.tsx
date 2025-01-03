import { Box,TextField,Button,FormControl,InputLabel,Select,MenuItem,FormGroup,FormControlLabel,Checkbox,Typography,Radio,RadioGroup,FormLabel } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Goal, FrequencyType, PeriodUnit } from '../types';

interface GoalFormProps {
  onSubmit: (goal: Goal) => void;
  initialGoal?: Goal;
  onClose?: () => void;  // Add this
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const GoalForm: React.FC<GoalFormProps> = ({ onSubmit, initialGoal, onClose }) => {  // Add onClose here
  const [goal, setGoal] = useState<Goal>(() => {
    if (initialGoal) {
      return {
        ...initialGoal,
        // Convert date strings to Date objects
        startDate: initialGoal.startDate ? new Date(initialGoal.startDate) : new Date(),
        targetDate: initialGoal.targetDate ? new Date(initialGoal.targetDate) : undefined
      };
    }
    return {
      id: Math.random().toString(),
      userId: '',
      category: '',
      title: '',
      floor: '',
      ceiling: '',
      unit: '',
      startDate: new Date(),
      frequencyType: 'daily'
    }
});

  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  useEffect(() => {
    // Calculate targetSuccesses or targetDate based on which one is entered
    if (goal.targetDate && !goal.targetSuccesses) {
      calculateTargetSuccesses();
    } else if (goal.targetSuccesses && !goal.targetDate) {
      calculateTargetDate();
    }
  }, [goal.targetDate, goal.targetSuccesses, goal.frequencyType]);

  const calculateTargetSuccesses = () => {
    if (!goal.targetDate) return;
    const daysUntilTarget = Math.ceil(
      (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    let successes = 0;
    switch (goal.frequencyType) {
      case 'daily':
        successes = daysUntilTarget;
        break;
      case 'specific_days':
        successes = Math.floor(daysUntilTarget * (selectedDays.length / 7));
        break;
      case 'days_per_period':
        if (goal.periodUnit === 'week') {
          successes = Math.ceil(daysUntilTarget / 7) * (goal.daysPerPeriod || 0);
        } else if (goal.periodUnit === 'month') {
          successes = Math.ceil(daysUntilTarget / 30) * (goal.daysPerPeriod || 0);
        } else if (goal.periodUnit === 'year') {
          successes = Math.ceil(daysUntilTarget / 365) * (goal.daysPerPeriod || 0);
        }
        break;
      case 'repeating_n_days':
        successes = Math.ceil(daysUntilTarget / (goal.repeatEveryNDays || 1));
        break;
    }

    setGoal(prev => ({ ...prev, targetSuccesses: successes }));
  };

  const calculateTargetDate = () => {
    if (!goal.targetSuccesses) return;

    let daysNeeded = 0;
    switch (goal.frequencyType) {
      case 'daily':
        daysNeeded = goal.targetSuccesses;
        break;
      case 'specific_days':
        daysNeeded = Math.ceil(goal.targetSuccesses / (selectedDays.length / 7) * 7);
        break;
      case 'days_per_period':
        if (goal.periodUnit === 'week') {
          daysNeeded = Math.ceil(goal.targetSuccesses / (goal.daysPerPeriod || 1)) * 7;
        } else if (goal.periodUnit === 'month') {
          daysNeeded = Math.ceil(goal.targetSuccesses / (goal.daysPerPeriod || 1)) * 30;
        } else if (goal.periodUnit === 'year') {
          daysNeeded = Math.ceil(goal.targetSuccesses / (goal.daysPerPeriod || 1)) * 365;
        }
        break;
      case 'repeating_n_days':
        daysNeeded = goal.targetSuccesses * (goal.repeatEveryNDays || 1);
        break;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysNeeded);
    setGoal(prev => ({ ...prev, targetDate }));
  };
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalGoal = {
      ...goal,
      specificDays: goal.frequencyType === 'specific_days' ? selectedDays : undefined,
    };
    onSubmit(finalGoal);
    if (onClose) {
      onClose();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Title"
            value={goal.title}
            onChange={(e) => setGoal({...goal, title: e.target.value})}
            required
          />
          <TextField
            label="Category"
            value={goal.category}
            onChange={(e) => setGoal({...goal, category: e.target.value})}
            required
          />
          <TextField
            label="Floor"
            value={goal.floor}
            onChange={(e) => setGoal({...goal, floor: e.target.value})}
            required
          />
          <TextField
            label="Ceiling"
            value={goal.ceiling}
            onChange={(e) => setGoal({...goal, ceiling: e.target.value})}
            required
          />
          <TextField
            label="Unit"
            value={goal.unit}
            onChange={(e) => setGoal({...goal, unit: e.target.value})}
          />

          <FormControl>
            <FormLabel>Frequency Type</FormLabel>
            <RadioGroup
              value={goal.frequencyType}
              onChange={(e) => setGoal({...goal, frequencyType: e.target.value as FrequencyType})}
            >
              <FormControlLabel value="daily" control={<Radio />} label="Every Day" />
              <FormControlLabel value="specific_days" control={<Radio />} label="Only some days of the week" />
              <FormControlLabel value="days_per_period" control={<Radio />} label="Number of days per period" />
              <FormControlLabel value="repeating_n_days" control={<Radio />} label="Repeating every N days" />
            </RadioGroup>
          </FormControl>

          {goal.frequencyType === 'specific_days' && (
            <FormGroup>
              <Typography variant="subtitle1">Select Days:</Typography>
              {DAYS_OF_WEEK.map((day) => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={selectedDays.includes(day.toLowerCase())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDays([...selectedDays, day.toLowerCase()]);
                        } else {
                          setSelectedDays(selectedDays.filter(d => d !== day.toLowerCase()));
                        }
                      }}
                    />
                  }
                  label={day}
                />
              ))}
            </FormGroup>
          )}

          {goal.frequencyType === 'days_per_period' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="number"
                label="Number of Days"
                value={goal.daysPerPeriod || ''}
                onChange={(e) => setGoal({...goal, daysPerPeriod: Number(e.target.value)})}
                required
              />
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select
                  value={goal.periodUnit || ''}
                  label="Period"
                  onChange={(e) => setGoal({...goal, periodUnit: e.target.value as PeriodUnit})}
                  required
                >
                  <MenuItem value="week">Per Week</MenuItem>
                  <MenuItem value="month">Per Month</MenuItem>
                  <MenuItem value="year">Per Year</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}

          {goal.frequencyType === 'repeating_n_days' && (
            <TextField
              type="number"
              label="Maximum days between completions"
              value={goal.repeatEveryNDays || ''}
              onChange={(e) => setGoal({...goal, repeatEveryNDays: Number(e.target.value)})}
              required
            />
          )}

          <Typography variant="subtitle1">Target (fill one):</Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <DatePicker
              label="Target Date"
              value={goal.targetDate || null}
              onChange={(date) => setGoal({...goal, targetDate: date || undefined})}
            />
            <TextField
              type="number"
              label="Target Successes"
              value={goal.targetSuccesses || ''}
              onChange={(e) => setGoal({...goal, targetSuccesses: Number(e.target.value)})}
            />
          </Box>

          <Button type="submit" variant="contained">
            {initialGoal ? 'Save Changes' : 'Add Goal'}
          </Button>
        </Box>
      </form>
    </LocalizationProvider>
  );
};
