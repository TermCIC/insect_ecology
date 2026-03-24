document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;

    if (!body || body.dataset.ecoThemeApplied === "true") {
        return;
    }

    body.dataset.ecoThemeApplied = "true";
    body.classList.add("eco-themed");

    if (body.classList.contains("eco-book")) {
        const leftColumn = document.getElementById("leftColumn");
        const rightColumn = document.getElementById("rightColumn");

        if (leftColumn && rightColumn) {
            const bookShell = document.createElement("div");
            bookShell.className = "eco-book-shell";

            const bookFrame = document.createElement("div");
            bookFrame.className = "eco-book-frame";

            leftColumn.parentNode.insertBefore(bookShell, leftColumn);
            bookShell.appendChild(bookFrame);
            bookFrame.appendChild(leftColumn);
            bookFrame.appendChild(rightColumn);
        }

        return;
    }

    const shell = document.createElement("div");
    shell.className = "eco-shell";

    const page = document.createElement("main");
    page.className = "eco-page";

    const inner = document.createElement("div");
    inner.className = "eco-page__inner";

    const nodes = Array.from(body.childNodes).filter((node) => {
        return !(node.nodeType === Node.ELEMENT_NODE && node.tagName === "SCRIPT");
    });

    if (body.querySelector("#dos")) {
        body.classList.add("eco-immersive");
    }

    body.insertBefore(shell, body.firstChild);
    shell.appendChild(page);
    page.appendChild(inner);

    nodes.forEach((node) => {
        inner.appendChild(node);
    });
});
