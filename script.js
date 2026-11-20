
const fileInput = document.getElementById("fileInput");
const dropArea = document.getElementById("dropArea");
const fileList = document.getElementById("fileList");

const fileCount = document.getElementById("fileCount");
const totalFiles = document.getElementById("totalFiles");
const totalSize = document.getElementById("totalSize");

const clearBtn = document.getElementById("clearBtn");
const mergeBtn = document.getElementById("mergeBtn");
const statusMessage = document.getElementById("statusMessage");

let pdfFiles = [];

function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function addFiles(files) {
    const selectedFiles = Array.from(files);

    let rejected = 0;

    selectedFiles.forEach(file => {
        const isPDF =
            file.type === "application/pdf" ||
            file.name.toLowerCase().endsWith(".pdf");

        if (!isPDF) {
            rejected++;
            return;
        }

        pdfFiles.push(file);
    });

    renderFiles();

    if (rejected > 0) {
        statusMessage.textContent =
            `${rejected} unsupported file(s) skipped.`;
    } else {
        statusMessage.textContent = "";
    }
}

fileInput.addEventListener("change", event => {
    addFiles(event.target.files);
    fileInput.value = "";
});

// Drag and drop

dropArea.addEventListener("dragover", event => {
    event.preventDefault();
    dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", event => {
    event.preventDefault();
    dropArea.classList.remove("dragover");

    addFiles(event.dataTransfer.files);
});

// Display files

function renderFiles() {
    fileList.innerHTML = "";

    pdfFiles.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "file-item";

        const info = document.createElement("div");
        info.className = "file-info";

        const icon = document.createElement("span");
        icon.className = "file-icon";
        icon.textContent = "📕";

        const details = document.createElement("div");
        details.className = "file-details";

        const name = document.createElement("h3");
        name.textContent = file.name;

        const size = document.createElement("p");
        size.textContent = formatSize(file.size);

        details.append(name, size);
        info.append(icon, details);

        const actions = document.createElement("div");
        actions.className = "file-actions";

        const upBtn = document.createElement("button");
        upBtn.textContent = "↑";
        upBtn.title = "Move up";
        upBtn.disabled = index === 0;
        upBtn.addEventListener("click", () => moveFile(index, -1));

        const downBtn = document.createElement("button");
        downBtn.textContent = "↓";
        downBtn.title = "Move down";
        downBtn.disabled = index === pdfFiles.length - 1;
        downBtn.addEventListener("click", () => moveFile(index, 1));

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove file";
        removeBtn.className = "remove-btn";
        removeBtn.addEventListener("click", () => removeFile(index));

        actions.append(upBtn, downBtn, removeBtn);
        item.append(info, actions);

        fileList.appendChild(item);
    });

    if (pdfFiles.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <span>📁</span>
                <p>No PDF files uploaded yet.</p>
            </div>
        `;
    }

    updateSummary();
}

// Move files

function moveFile(index, direction) {
    const newIndex = index + direction;

    if (newIndex < 0 || newIndex >= pdfFiles.length) return;

    [pdfFiles[index], pdfFiles[newIndex]] =
        [pdfFiles[newIndex], pdfFiles[index]];

    renderFiles();
}

// Remove file

function removeFile(index) {
    pdfFiles.splice(index, 1);
    renderFiles();
}

// Update summary

function updateSummary() {
    const count = pdfFiles.length;

    const size = pdfFiles.reduce(
        (total, file) => total + file.size,
        0
    );

    fileCount.textContent = `${count} PDF files selected`;
    totalFiles.textContent = count;
    totalSize.textContent = formatSize(size);

    mergeBtn.disabled = count < 2;
}

// Clear all files

clearBtn.addEventListener("click", () => {
    pdfFiles = [];
    fileInput.value = "";
    statusMessage.textContent = "";
    renderFiles();
});

// Merge PDF files

mergeBtn.addEventListener("click", async () => {
    if (pdfFiles.length < 2) return;

    if (!window.PDFLib) {
        statusMessage.textContent =
            "PDF library could not load. Check your internet connection.";
        return;
    }

    mergeBtn.disabled = true;
    mergeBtn.textContent = "Merging...";
    statusMessage.textContent = "Please wait. Merging PDF files...";

    try {
        const { PDFDocument } = PDFLib;

        const mergedPDF = await PDFDocument.create();

        for (const file of pdfFiles) {
            const fileBytes = await file.arrayBuffer();

            const pdf = await PDFDocument.load(fileBytes);

            const pages = await mergedPDF.copyPages(
                pdf,
                pdf.getPageIndices()
            );

            pages.forEach(page => {
                mergedPDF.addPage(page);
            });
        }

        const mergedBytes = await mergedPDF.save();

        const blob = new Blob([mergedBytes], {
            type: "application/pdf"
        });

        const url = URL.createObjectURL(blob);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "merged_result.pdf";

        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        statusMessage.textContent =
            "PDF files merged successfully! Download started.";

    } catch (error) {
        console.error("PDF Merge Error:", error);

        statusMessage.textContent =
            "Unable to merge PDFs. Check whether all files are valid and password-free.";
    } finally {
        mergeBtn.disabled = pdfFiles.length < 2;
        mergeBtn.textContent = "Merge PDF Files";
    }
});

// Initial display

renderFiles();
