const salesCanvas = document.getElementById('salesChart');


if (salesCanvas) {

  const salesData = [0, 0, 0, 0, 0, 0, 0];

  const lastWeekData = [0, 0, 0, 0, 0, 0, 0];

  const salesChart = new Chart(salesCanvas, {
    type: 'bar',   // 'bar' = bar graph
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
        legend: { display: false }   
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 3000,
          ticks: { stepSize: 500 }   
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
}
