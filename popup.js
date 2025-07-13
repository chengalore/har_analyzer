
document.getElementById('harFile').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const har = JSON.parse(e.target.result);
        const entries = har.log.entries;
        const tableBody = document.querySelector('#resultsTable tbody');
        tableBody.innerHTML = '';

        const kpiEvents = [
            'user-saw-product',
            'user-saw-widget-button',
            'inpage-mounted',
            'user-saw-measurements-view',
            'user-selected-size',
            'user-got-size-recommendation',
            'user-opened-widget',
            'user-opened-panel-tryiton',
            'user-opened-panel-compare',
            'user-opened-panel-rec'
        ];

        const kpiSet = new Set();

        entries.forEach(entry => {
            const { request, startedDateTime } = entry;
            if (request.method === 'POST' && request.url.includes("events.virtusize.jp")) {
                try {
                    const payload = JSON.parse(request.postData.text);
                    const { name, source, storeId } = payload;
                    const timeStamp = new Date(startedDateTime).toLocaleString();
                    const row = document.createElement('tr');

                    const presence = kpiEvents.includes(name) ? 'Present' : '';
                    if (presence === 'Present') kpiSet.add(name);

                    [name, source || '', storeId || '', timeStamp, presence].forEach(val => {
                        const td = document.createElement('td');
                        td.textContent = val;
                        row.appendChild(td);
                    });
                    tableBody.appendChild(row);
                } catch (err) {
                    console.error('Failed to parse POST data:', err);
                }
            }
        });

        // Add missing KPI events
        kpiEvents.forEach(kpi => {
            if (!kpiSet.has(kpi)) {
                const row = document.createElement('tr');
                [kpi, '', '', '', 'Missing'].forEach(val => {
                    const td = document.createElement('td');
                    td.textContent = val;
                    row.appendChild(td);
                });
                tableBody.appendChild(row);
            }
        });
    };
    reader.readAsText(file);
});
