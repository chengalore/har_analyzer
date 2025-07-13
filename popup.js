document.getElementById("harFile").addEventListener("change", function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const REQUIRED_API_CALLS = [
    {
      name: "user-body-measurements",
      source: "user-api",
      urlMatch: "/user-body-measurements/",
    },
    {
      name: "size-recommendation",
      source: "recommendation",
      urlMatch: "size-recommendation.virtusize.jp/item",
    },
    {
      name: "user-products",
      source: "user-api",
      urlMatch: "/user-products",
    },
  ];

  const ADULT_KPI_EVENTS = [
    "user-saw-product",
    "user-saw-widget-button",
    "inpage-mounted",
    "user-saw-measurements-view",
    "user-selected-size",
    "user-got-size-recommendation",
    "user-opened-widget",
    "user-opened-panel-tryiton",
    "user-opened-panel-compare",
    "user-opened-panel-rec",
  ];

  const KIDS_KPI_EVENTS = [
    "user-saw-product",
    "user-saw-widget-button",
    "user-saw-widget-kids",
    "user-clicked-reset",
    "user-opened-tooltip",
    "user-selected-gender",
    "user-updated-body-measurements",
    "user-created-silhouette",
    "user-selected-size-kids-rec",
    "user-clicked-startOver",
    "user-clicked-confirm",
    "user-clicked-measurementUnit",
  ];

  const Required_ADULT_EVENTS = [
    "user-saw-product",
    "user-saw-widget-button",
    "user-selected-size",
    "user-opened-panel-rec",
    "user-opened-panel-tryiton",
    "user-opened-panel-compare",
  ];

  const Required_KIDS_EVENTS = [
    "user-saw-product",
    "user-saw-widget-kids",
    "user-selected-size-kids-rec",
    "user-created-silhouette",
  ];

  const reader = new FileReader();
  reader.onload = function (e) {
    const har = JSON.parse(e.target.result);
    const entries = har.log.entries;
    const tableBody = document.querySelector("#resultsTable tbody");
    tableBody.innerHTML = "";

    const eventResults = [];
    const apiResults = [];
    const foundApiMatches = new Set();
    const eventNamesSeen = new Set();
    let hasKidsEvent = false;

    entries.forEach((entry) => {
      const { request, response, startedDateTime } = entry;
      const url = request.url;
      const contentType = response.content?.mimeType || "";

      // API match
      REQUIRED_API_CALLS.forEach((api) => {
        if (url.includes(api.urlMatch)) {
          apiResults.push({
            name: api.name,
            source: api.source,
            statusCode: response.status,
            status:
              response.status === 200 ? "Present" : `Error ${response.status}`,
            timestamp: new Date(startedDateTime).toLocaleString(),
            category: "API",
          });
          foundApiMatches.add(api.urlMatch);
        }
      });

      // Events from JSON payload
      if (
        contentType.includes("application/json") &&
        url.includes("virtusize")
      ) {
        try {
          const resBody = JSON.parse(entry.response?.content?.text || "{}");
          const events = Array.isArray(resBody)
            ? resBody
            : resBody.events ?? (resBody.name ? [resBody] : []);

          events.forEach((event) => {
            if (!event?.name) return;
            const name = event.name;
            const source = event.source ?? "integration";
            eventNamesSeen.add(name);
            if (source === "kids") hasKidsEvent = true;

            let category = "";
            if (
              Required_KIDS_EVENTS.includes(name) ||
              Required_ADULT_EVENTS.includes(name)
            ) {
              category = "Required";
            } else if (
              ADULT_KPI_EVENTS.includes(name) ||
              KIDS_KPI_EVENTS.includes(name)
            ) {
              category = "KPI";
            }

            eventResults.push({
              name,
              source,
              statusCode: 200,
              status: "Present",
              timestamp: new Date(startedDateTime).toLocaleString(),
              category,
            });
          });
        } catch (err) {
          console.warn("Error parsing JSON:", err.message);
        }
      }
    });

    // Add missing API calls
    REQUIRED_API_CALLS.forEach((api) => {
      if (!foundApiMatches.has(api.urlMatch)) {
        apiResults.push({
          name: api.name,
          source: api.source,
          statusCode: "MISSING",
          status: "Missing",
          timestamp: "-",
          category: "API",
        });
      }
    });

    // Determine event list to validate
    const expectedKPI = hasKidsEvent ? KIDS_KPI_EVENTS : ADULT_KPI_EVENTS;
    const Required = hasKidsEvent
      ? Required_KIDS_EVENTS
      : Required_ADULT_EVENTS;

    expectedKPI.forEach((name) => {
      if (!eventNamesSeen.has(name)) {
        const category = Required.includes(name) ? "Required" : "KPI";
        eventResults.push({
          name,
          source: "",
          statusCode: "MISSING",
          status: "Missing",
          timestamp: "-",
          category,
        });
      }
    });

    // Render all rows
    [...eventResults, ...apiResults].forEach((data) => {
      const row = document.createElement("tr");
      [
        "name",
        "source",
        "statusCode",
        "timestamp",
        "status",
        "category",
      ].forEach((field) => {
        const td = document.createElement("td");
        td.textContent = data[field] || "";

        if (field === "category") {
          if (data[field] === "API") td.style.color = "red";
          if (data[field] === "KPI") td.style.color = "orange";
          if (data[field] === "Required") {
            td.style.color = "purple";
            td.style.fontWeight = "bold";
          }
        }

        row.appendChild(td);
      });
      tableBody.appendChild(row);
    });

    enableFilteringAndSorting();
  };

  reader.readAsText(file);
});

function enableFilteringAndSorting() {
  const categoryFilter = document.getElementById("categoryFilter");
  if (categoryFilter) {
    categoryFilter.addEventListener("change", function () {
      const selected = this.value;
      const rows = document.querySelectorAll("#resultsTable tbody tr");
      rows.forEach((row) => {
        const category = row.children[5]?.textContent.trim();
        row.style.display = !selected || category === selected ? "" : "none";
      });
    });
  }

  document.querySelectorAll("#resultsTable th").forEach((header, index) => {
    let ascending = true;
    header.addEventListener("click", () => {
      const tbody = document.querySelector("#resultsTable tbody");
      const rows = Array.from(tbody.querySelectorAll("tr"));
      rows.sort((a, b) => {
        const valA = a.children[index].textContent.trim().toLowerCase();
        const valB = b.children[index].textContent.trim().toLowerCase();
        return ascending
          ? valA.localeCompare(valB, undefined, { numeric: true })
          : valB.localeCompare(valA, undefined, { numeric: true });
      });
      rows.forEach((row) => tbody.appendChild(row));
      ascending = !ascending;
    });
  });
}
