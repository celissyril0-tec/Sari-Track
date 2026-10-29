
const budgetCanvas = document.getElementById('budgetChart');

if (budgetCanvas) {

  const budget = 0;
  const spent = 0;

  let values = [spent, budget - spent];
  let colors = ['orange', '#1a56db'];

  if (budget === 0) {
    values = [1];
    colors = ['#1a56db'];
  }

  new Chart(budgetCanvas, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 0           // removes the thin white line on the ring
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        tooltip: { enabled: false }
      }
    }
  });
}