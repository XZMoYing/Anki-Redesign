// Copyright: Ankitects Pty Ltd and contributors
// Material Design 3 Expressive Top Navigation Bar Script (Compiled JS)
// Enhanced with keyboard shortcuts and legacy addon handling

function updateSyncColor(state) {
    const elem = document.getElementById("sync");
    if (!elem) return;
    switch (state) {
        case 0:
            elem.classList.remove("full-sync", "normal-sync");
            break;
        case 1:
            elem.classList.add("normal-sync");
            elem.classList.remove("full-sync");
            break;
        case 2:
            elem.classList.add("full-sync");
            elem.classList.remove("normal-sync");
            break;
    }
}

function isAbsolutelyPositioned(node) {
    if (!(node instanceof HTMLElement)) {
        return false;
    }
    return getComputedStyle(node).position === "absolute";
}

function isLegacyAddonElement(node) {
    if (isAbsolutelyPositioned(node)) {
        return true;
    }
    for (const child of node.childNodes) {
        if (isAbsolutelyPositioned(child)) {
            return true;
        }
    }
    return false;
}

function getElementDimensions(element) {
    const widths = [element.offsetWidth];
    const heights = [element.offsetHeight];
    for (const child of element.childNodes) {
        if (!(child instanceof HTMLElement)) {
            continue;
        }
        widths.push(child.offsetWidth);
        heights.push(child.offsetHeight);
    }
    return [Math.max(...widths), Math.max(...heights)];
}

function moveLegacyAddonsToTray() {
    const rightTray = document.getElementsByClassName("right-tray")[0];
    if (!rightTray) return;
    const toolbarChildren = document.querySelectorAll(".toolbar > *");
    const legacyAddonElements = Array.from(toolbarChildren)
        .reverse()
        .filter(isLegacyAddonElement);

    for (const element of legacyAddonElements) {
        const wrapperElement = document.createElement("div");
        const dimensions = getElementDimensions(element);
        element.style.right = "0px";
        wrapperElement.append(element);
        wrapperElement.style.cssText = `\
width: ${dimensions[0]}px; height: ${dimensions[1]}px;
margin-left: 5px; margin-right: 5px; position: relative;`;
        wrapperElement.className = "tray-item tray-item-legacy";
        rightTray.append(wrapperElement);
    }
}

function setupToolbarShortcuts() {
    window.addEventListener("keydown", (e) => {
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
        }

        const key = e.key;

        if (key === "d" || key === "D") {
            const btn = document.getElementById("decks");
            if (btn) { e.preventDefault(); btn.click(); }
        } else if (key === "a" || key === "A") {
            const btn = document.getElementById("add");
            if (btn) { e.preventDefault(); btn.click(); }
        } else if (key === "b" || key === "B") {
            const btn = document.getElementById("browse");
            if (btn) { e.preventDefault(); btn.click(); }
        } else if (key === "t" || key === "T") {
            const btn = document.getElementById("stats");
            if (btn) { e.preventDefault(); btn.click(); }
        } else if (key === "y" || key === "Y") {
            const btn = document.getElementById("sync");
            if (btn) { e.preventDefault(); btn.click(); }
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    moveLegacyAddonsToTray();
    setupToolbarShortcuts();
});
