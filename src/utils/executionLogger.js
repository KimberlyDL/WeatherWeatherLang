class ExecutionLogger {
  constructor() {
    this.logs = [];
    this.isVisible = false;
  }

  startOperation(operationName, details = "") {
    const operation = {
      id: Date.now() + Math.random(),
      name: operationName,
      details,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      status: "running",
      error: null,
    };

    this.logs.push(operation);
    this.updateUI();

    return operation.id;
  }

  endOperation(operationId, error = null) {
    const operation = this.logs.find((op) => op.id === operationId);
    if (operation) {
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.status = error ? "error" : "completed";
      operation.error = error;
      this.updateUI();
    }
  }

  clear() {
    this.logs = [];
    this.updateUI();
  }

  toggle() {
    this.isVisible = !this.isVisible;
    const logPanel = document.getElementById("executionLogPanel");
    if (logPanel) {
      logPanel.classList.toggle("hidden", !this.isVisible);
    }
  }

  updateUI() {
    const logContainer = document.getElementById("executionLogContainer");
    if (!logContainer) return;

    logContainer.innerHTML = this.logs
      .map((log) => {
        const timestamp = new Date(log.startTime).toLocaleTimeString();
        const statusIcon =
          log.status === "running"
            ? "🔄"
            : log.status === "error"
            ? "❌"
            : "✅";
        const durationText = log.duration ? `(${log.duration}ms)` : "";

        return `
        <div class="flex items-start gap-2 p-2 text-xs border-b border-gray-100 ${
          log.status === "error"
            ? "bg-red-50"
            : log.status === "running"
            ? "bg-blue-50"
            : "bg-green-50"
        }">
          <span class="text-lg">${statusIcon}</span>
          <div class="flex-1">
            <div class="font-medium">${log.name}</div>
            ${
              log.details
                ? `<div class="text-gray-600">${log.details}</div>`
                : ""
            }
            <div class="text-gray-500">${timestamp} ${durationText}</div>
            ${
              log.error
                ? `<div class="text-red-600 mt-1">${log.error.message}</div>`
                : ""
            }
          </div>
        </div>
      `;
      })
      .join("");

    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

export const executionLogger = new ExecutionLogger();
