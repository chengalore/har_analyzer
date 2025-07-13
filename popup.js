
document.getElementById('harFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const har = JSON.parse(e.target.result);
        const entries = har.log.entries;
        const tableBody = document.querySelector('#resultsTable tbody');
        tableBody.innerHTML = '';

        entries.forEach(entry => {
            const { request, startedDateTime } = entry;
            if (request.method === 'POST' && request.url.includes("events.virtusize.jp")) {
                try {
                    const payload = JSON.parse(request.postData.text);
                    const row = document.createElement('tr');
                    ['name', 'source', 'storeId'].forEach(field => {
                        const cell = document.createElement('td');
                        cell.textContent = payload[field] || '';
                        row.appendChild(cell);
                    });
                    const timeCell = document.createElement('td');
                    timeCell.textContent = new Date(startedDateTime).toLocaleString();
                    row.appendChild(timeCell);
                    tableBody.appendChild(row);
                } catch (err) {
                    console.error('Failed to parse POST data:', err);
                }
            }
        });
    };
    reader.readAsText(file);
});
