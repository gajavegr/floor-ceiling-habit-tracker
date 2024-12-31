const habitForm = document.getElementById('habit-form');
const habitList = document.getElementById('habit-list');
const habitChart = document.getElementById('habit-chart');
let habits = JSON.parse(localStorage.getItem('habits')) || [];

// Add Habit
habitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('habit-name').value;
    const floor = parseInt(document.getElementById('habit-floor').value);
    const ceiling = parseInt(document.getElementById('habit-ceiling').value);

    habits.push({ name, floor, ceiling, progress: [] });
    localStorage.setItem('habits', JSON.stringify(habits));
    renderHabits();
});

// Render Habits
function renderHabits() {
    habitList.innerHTML = '';
    habits.forEach((habit, index) => {
        const div = document.createElement('div');
        div.textContent = `${habit.name} (Floor: ${habit.floor}, Ceiling: ${habit.ceiling})`;
        div.addEventListener('click', () => logProgress(index));
        habitList.appendChild(div);
    });
    updateChart();
}

// Log Progress
function logProgress(index) {
    const value = prompt(`Log progress for ${habits[index].name}:`);
    if (value) {
        habits[index].progress.push(parseInt(value));
        localStorage.setItem('habits', JSON.stringify(habits));
        updateChart();
    }
}

// Update Chart
function updateChart() {
    const ctx = habitChart.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: habits.map(h => h.name),
            datasets: habits.map(habit => ({
                label: habit.name,
                data: habit.progress,
                borderColor: getRandomColor(),
                fill: false
            }))
        }
    });
}

// Generate Random Color
function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

renderHabits();
