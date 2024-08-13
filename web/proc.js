const apiUrl = '';
const $alert = $('.alert');
const alertMessage = document.getElementById('alert-message');

const chart = new Chart(document.getElementById("chart"), {
  type: 'polarArea',
  data: {
    labels: [],
    datasets: [{
      backgroundColor: [
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
      ]
    }]
  },
  options: {
    legend: { position: 'bottom' },
  }
});

const chart1 = new Chart(document.getElementById("chart1"), {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
	    label: "% Confidence",
      backgroundColor: [
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
      ]
    }]
  },
  options: {
    legend: { position: 'bottom' },
  }
});

const chart2 = new Chart(document.getElementById("chart2"), {
  type: 'doughnut',
  data: {
    labels: [],
    datasets: [{
	    label: "% Confidence",
      backgroundColor: [
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
        "rgba(51,122,183,0.6)",
        "rgba(92,184,92,0.6)",
        "rgba(217,83,79,0.6)",
        "rgba(91,192,222,0.6)",
        "rgba(240,173,78,0.6)",
      ]
    }]
  },
  options: {
    legend: { position: 'bottom' },
  }
});


async function handleImageSelection() {
  const selectedFile = document.getElementById('fileSelect').files[0];
  try {
    if (selectedFile) {
      $alert.hide();
      const dataUri = await convertFileToDataUri(selectedFile);
    
      const imageElement = new Image();
      imageElement.onload = () => {
        const resizedDataUri = resizeImage(imageElement, 380);
        document.querySelector('#img-preview').src = resizedDataUri;
        const base64String = resizedDataUri.split(',')[1]; // More reliable way to get base64 string
        uploadImage(base64String);
      };
      imageElement.src = dataUri;
    }
  } catch (err) {
    alertMessage.innerHTML = err.message;
    $alert.show();
  }
}

function convertFileToDataUri(file) {
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
  const formData = new URLSearchParams();
  formData.append("filedata", base64String);

  try {
    const response = await fetch(`${apiUrl}/image`, {
      method: 'POST',
      mode: 'cors', // Explicitly set CORS mode
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload image: ${response.status} ${response.statusText}. ${errorText}`);
    }

    const data = await response.json();
    document.getElementById('result').innerHTML = `Letter predicted: ${data.category}`;
    updateChartAndTable(data.confs);
  } catch (error) {
    console.error('Error details:', error);
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

  chart1.data.datasets[0].data = data;
  chart1.data.labels = labels;
  chart1.update();

  chart2.data.datasets[0].data = data;
  chart2.data.labels = labels;
  chart2.update();
}

