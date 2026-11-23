const salesCanvas = document.getElementById('salesChart');


if (salesCanvas) {

  const salesData = [0, 0, 0, 0, 0, 0, 0];

  const lastWeekData = [0, 0, 0, 0, 0, 0, 0];

  const salesChart = new Chart(salesCanvas, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        data: salesData,
        backgroundColor: '#1a56db'   
      }]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return '₱' + context.parsed.y.toLocaleString('en-Ph', { minimumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 100,   
        },
        x: {
          grid: { display: false }  
        }
      }
    }
  });

  
  function updateMessage(data) {
    const hasSales = data.some(function (value) {
      return value > 0;
    });

    if (hasSales) {
      document.querySelector('.empty-message').style.display = 'none';
    } else {
      document.querySelector('.empty-message').style.display = 'block';
    }
  }

  updateMessage(salesData);

  document.getElementById('salesRange').addEventListener('change', function () {
    let data = salesData;

    if (this.value === 'Last Week') {
      data = lastWeekData;
    }

    salesChart.data.datasets[0].data = data;
    salesChart.update();
    updateMessage(data);
  });

  window.updateSalesChart = function (thisWeek, lastWeek) {
    for (let i = 0; i < 7; i++) {
      salesData[i] = thisWeek[i];
      lastWeekData[i] = lastWeek[i];
    }

    const showing = document.getElementById('salesRange').value === 'Last Week'
      ? lastWeekData
      : salesData;
    
    salesChart.data.datasets[0].data = showing;
    salesChart.update();
    updateMessage(showing);
  };
}


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
        borderWidth: 0        
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
