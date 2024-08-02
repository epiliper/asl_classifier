// const apiUrl = CHANGE THIS
const $alert = $('.alert');
const alertMessage = document.getElementById('alert-message');

const chartColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#5DADE2', '#F1948A', '#7DCEA0'
];

const chart = new Chart(document.getElementById("chart"), {
  type: 'polarArea',
  data: {
    labels: [],
    datasets: [{
      backgroundColor: chartColors.map(color => `${color}99`) // Add transparency
    }]
  },
  options: {
    legend: { position: 'bottom' },
    scale: { ticks: { beginAtZero: true } }
  }
});

async function handleImageSelection() {
  const selectedFile = fileSelect.files[0];
  try {
    if (selectedFile) {
      $alert.hide();
      const dataUri = await getDataUriFromFile(selectedFile);
      const imageElement = new Image();
      imageElement.onload = () => {
        const resizedDataUri = resizeImage(imageElement, 380);
        document.querySelector('#img-preview').src = resizedDataUri;
        const base64String = resizedDataUri.split(',')[1];
        uploadImage(base64String);
      };
      imageElement.src = dataUri;
    }
  } catch (err) {
    alertMessage.innerHTML = err.message;
    $alert.show();
  }
}

function getDataUriFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resizeImage(image, newWidth) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const aspectRatio = image.width / image.height;

  canvas.width = newWidth;
  canvas.height = newWidth / aspectRatio;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL();
}

async function uploadImage(base64String) {
  clearResults();
  const formData = new FormData();
  formData.append("filedata", base64String);

  try {
    const response = await fetch(`${apiUrl}/image`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload image');

    const data = await response.json();
    document.getElementById('result').innerHTML = data.category;
    updateChartAndTable(data.confs);
  } catch (error) {
    console.error(error);
    alertMessage.innerHTML = error.message;
    $alert.show();
  }
}

function clearResults() {
  $("#table tbody").empty();
  document.getElementById('result').innerHTML = 'Loading results...';
}

function updateChartAndTable(confidences) {
  const tableBody = document.getElementById("table").getElementsByTagName('tbody')[0];
  const labels = [];
  const data = [];

  confidences.forEach((item, index) => {
    const row = tableBody.insertRow();
    row.insertCell(0).innerHTML = index + 1;
    row.insertCell(1).innerHTML = item.name;
    row.insertCell(2).innerHTML = `${item.conf}%`;

    if (item.conf >= 5) {
      labels.push(item.name);
      data.push(item.conf);
    }
  });

  chart.data.datasets[0].data = data;
  chart.data.labels = labels;
  chart.update();
}

