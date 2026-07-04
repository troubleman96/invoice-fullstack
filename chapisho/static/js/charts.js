(function() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark ? '#F0F0F0' : '#0A0A0A';
  const mutedColor = isDark ? '#999999' : '#555555';
  const gridColor = isDark ? '#333333' : '#E5E5E5';
  const barColor = isDark ? '#666666' : '#888888';
  const barColor2 = isDark ? '#999999' : '#555555';

  Chart.defaults.color = textColor;
  Chart.defaults.borderColor = gridColor;

  function fetchAndRender(url, chartId, configCallback) {
    const canvas = document.getElementById(chartId);
    if (!canvas) return;

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        new Chart(canvas, configCallback(data));
      });
  }

  // Revenue by month
  fetchAndRender('/takwimu/data/mapato/?months=' + (document.getElementById('monthsFilter')?.value || 12), 'revenueChart', function(data) {
    return {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Mapato',
          data: data.values,
          backgroundColor: barColor,
          borderColor: textColor,
          borderWidth: 1,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function(v) { return 'TZS ' + v.toLocaleString(); } },
          }
        }
      }
    };
  });

  // Paid vs Outstanding
  fetchAndRender('/takwimu/data/hali/', 'statusChart', function(data) {
    return {
      type: 'doughnut',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: [barColor, barColor2],
          borderColor: textColor,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: textColor },
          }
        }
      }
    };
  });

  // Top customers
  fetchAndRender('/takwimu/data/wateja-bora/', 'topCustomersChart', function(data) {
    return {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Jumla ya Ankara',
          data: data.values,
          backgroundColor: barColor,
          borderColor: textColor,
          borderWidth: 1,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { callback: function(v) { return 'TZS ' + v.toLocaleString(); } },
          }
        }
      }
    };
  });

  // SMS stats
  fetch('/takwimu/data/sms/')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      document.getElementById('smsTotal').textContent = data.total;
      document.getElementById('smssent').textContent = data.sent;
      document.getElementById('smsFailed').textContent = data.failed;
      document.getElementById('smsSuccessRate').textContent = data.success_rate + '%';
      document.getElementById('smsCost').textContent = 'TZS ' + (data.total_cost || 0);
    });

  // Date range filter
  const monthsFilter = document.getElementById('monthsFilter');
  if (monthsFilter) {
    monthsFilter.addEventListener('change', function() {
      location.reload();
    });
  }
})();
