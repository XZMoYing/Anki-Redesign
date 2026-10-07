/* Copyright: Ankitects Pty Ltd and contributors
 * Material Design 3 Expressive Deck Browser Script (Compiled JS)
 * Enhanced with keyboard shortcuts and drag-and-drop
 */

$(init);

function init() {
    $("tr.deck").draggable({
        scroll: false,
        helper: function(_event) {
            return $(this).clone(false);
        },
        delay: 200,
        opacity: 0.7,
    });
    $("tr.deck").droppable({
        drop: handleDropEvent,
        hoverClass: "drag-hover",
    });
    $("tr.top-level-drag-row").droppable({
        drop: handleDropEvent,
        hoverClass: "drag-hover",
    });

    setupDeckBrowserShortcuts();
}

function handleDropEvent(event, ui) {
    const draggedDeckId = ui.draggable.attr("id");
    const ontoDeckId = $(this).attr("id") || "";

    pycmd("drag:" + draggedDeckId + "," + ontoDeckId);
}

function setupDeckBrowserShortcuts() {
    window.addEventListener("keydown", (e) => {
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
            return;
        }

        const key = e.key;

        if (key === "s" || key === "S") {
            const sharedBtn = document.querySelector(".m3-action-shared");
            if (sharedBtn) {
                e.preventDefault();
                sharedBtn.click();
            }
        } else if (key === "c" || key === "C") {
            const createBtn = document.querySelector(".m3-action-create");
            if (createBtn) {
                e.preventDefault();
                createBtn.click();
            }
        } else if (key === "i" || key === "I") {
            const importBtn = document.querySelector(".m3-action-import");
            if (importBtn) {
                e.preventDefault();
                importBtn.click();
            }
        }
    });
}
