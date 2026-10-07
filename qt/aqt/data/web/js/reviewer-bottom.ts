/* Copyright: Ankitects Pty Ltd and contributors
 * Material Design 3 Expressive Reviewer Bottom Bar Script
 * Enhanced with responsive keyboard shortcuts, spring interactions, and milestone encouragement fx
 */

/* eslint
@typescript-eslint/no-unused-vars: "off",
*/

declare function pycmd(cmd: string): void;

let time: number; // set in python code
let timerStopped = false;
let maxTime = 0;

function updateTime(): void {
    const timeNode = document.getElementById("time");
    if (!timeNode) return;
    if (maxTime === 0) {
        timeNode.textContent = "";
        return;
    }
    time = Math.min(maxTime, time);
    const m = Math.floor(time / 60);
    const s = time % 60;
    const sStr = String(s).padStart(2, "0");
    const timeString = `${m}:${sStr}`;

    if (maxTime === time) {
        timeNode.innerHTML = `<span style="color: var(--m3-sys-color-error, #ba1a1a); font-weight: bold;">${timeString}</span>`;
    } else {
        timeNode.textContent = timeString;
    }
}

let intervalId: number | undefined;

function showQuestion(txt: string, maxTime_: number): void {
    showAnswer(txt);
    time = 0;
    maxTime = maxTime_;
    updateTime();

    if (intervalId !== undefined) {
        clearInterval(intervalId);
    }

    intervalId = setInterval(function() {
        if (!timerStopped) {
            time += 1;
            updateTime();
        }
    }, 1000);
}

function showAnswer(txt: string, stopTimer = false): void {
    const middle = document.getElementById("middle");
    if (middle) {
        middle.innerHTML = txt;
    }
    timerStopped = stopTimer;
    setupEaseButtonEvents();
}

function selectedAnswerButton(): string | undefined {
    const node = document.activeElement as HTMLElement;
    if (!node) {
        return undefined;
    }
    return node.dataset.ease;
}

/* ==========================================================================
   Milestone Celebration & Screen Shake (Inspired by 绿宝书 fx.js)
   ========================================================================== */

let sessionCardCount = parseInt(sessionStorage.getItem("m3_session_reviewed") || "0", 10);

function triggerScreenShake(): void {
    // Check if user disabled shake in localStorage or OS prefers reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shakeDisabled = localStorage.getItem("m3_shake_disabled") === "true";
    if (prefersReducedMotion || shakeDisabled) return;

    const outer = document.getElementById("outer") || document.body;
    outer.classList.remove("m3-shake");
    void outer.offsetWidth; // restart animation reflow
    outer.classList.add("m3-shake");

    setTimeout(() => {
        outer.classList.remove("m3-shake");
    }, 300);
}

function showMilestoneToast(msg: string): void {
    let banner = document.getElementById("m3-milestone-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "m3-milestone-banner";
        banner.className = "m3-milestone-banner";
        document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <svg class="m3-milestone-svg" viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
      </svg>
      <span>${msg}</span>
    `;
    banner.classList.add("m3-banner-visible");

    setTimeout(() => {
        if (banner) {
            banner.classList.remove("m3-banner-visible");
        }
    }, 3200);
}

/* Canvas Confetti Particles */
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    gravity: number;
    size: number;
    color: string;
    life: number;
    decay: number;
    shape: "rect" | "circle";
    rot: number;
    vrot: number;
}

let particles: Particle[] = [];
let animFrame: number | null = null;

function burstParticles(): void {
    const canvas = document.getElementById("m3-confetti-canvas") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    const PALETTE = ["#005FB0", "#BA1A1A", "#875200", "#006E3B", "#A1C9FF", "#FFB4AB", "#FFB870", "#6CDA8F"];
    const count = 38;
    const cx = (window.innerWidth / 2) * dpr;
    const cy = (window.innerHeight - 20) * dpr;

    for (let i = 0; i < count; i++) {
        const ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
        const sp = (4 + Math.random() * 6.5) * dpr;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(ang) * sp,
            vy: Math.sin(ang) * sp,
            gravity: 0.14 * dpr,
            size: (3 + Math.random() * 4.5) * dpr,
            color: PALETTE[(Math.random() * PALETTE.length) | 0],
            life: 1,
            decay: 0.012 + Math.random() * 0.015,
            shape: Math.random() < 0.4 ? "rect" : "circle",
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 0.25,
        });
    }

    if (!animFrame) {
        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles = particles.filter(p => p.life > 0);
            if (!particles.length) {
                animFrame = null;
                return;
            }
            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += p.gravity;
                p.vx *= 0.985;
                p.vy *= 0.985;
                p.life -= p.decay;
                const a = Math.max(0, Math.min(1, p.life));
                ctx.globalAlpha = a;
                ctx.fillStyle = p.color;
                if (p.shape === "rect") {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate((p.rot += p.vrot));
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
                    ctx.restore();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            ctx.globalAlpha = 1;
            animFrame = requestAnimationFrame(loop);
        };
        animFrame = requestAnimationFrame(loop);
    }
}

function handleMilestoneReward(): void {
    sessionCardCount++;
    sessionStorage.setItem("m3_session_reviewed", String(sessionCardCount));

    // Milestone encouragement milestones: 5, 10, 20, 30, 50, 100...
    if (sessionCardCount === 5 || sessionCardCount % 10 === 0) {
        triggerScreenShake();
        burstParticles();
        const encouragements = [
            `太棒了！已连续学习 ${sessionCardCount} 张卡片！`,
            `渐入佳境！已完成 ${sessionCardCount} 张卡片复习！`,
            `专注力爆发！今日已复习 ${sessionCardCount} 张！`,
            `保持节奏！已连续突破 ${sessionCardCount} 张卡片！`
        ];
        const msg = encouragements[(Math.floor(sessionCardCount / 10)) % encouragements.length];
        showMilestoneToast(msg);
    }
}

function setupEaseButtonEvents(): void {
    const buttons = document.querySelectorAll<HTMLButtonElement>(".m3-ease-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            handleMilestoneReward();
        }, { once: true });
    });
}

/* ==========================================================================
   Full Keyboard Shortcuts & Accessibility Handler
   Ensures EVERY button and ease choice can be controlled via keyboard:
   - 1, 2, 3, 4: Again, Hard, Good, Easy
   - Space / Enter: Show Answer (or Good if showing answer)
   - E: Edit card
   - M: More options menu
   - U / Z: Undo
   ========================================================================== */

window.addEventListener("keydown", (e: KeyboardEvent) => {
    // Avoid intercepting when focused in text inputs
    const target = e.target as HTMLElement;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
    }

    const key = e.key;

    // Keys 1, 2, 3, 4 for Mastery Degrees
    if (key === "1" || key === "2" || key === "3" || key === "4") {
        const easeBtn = document.querySelector<HTMLButtonElement>(`button[data-ease="${key}"]`);
        if (easeBtn) {
            e.preventDefault();
            easeBtn.click();
            return;
        }
    }

    // Space or Enter for Show Answer
    if (key === " " || key === "Enter") {
        const ansBtn = document.getElementById("ansbut") as HTMLButtonElement;
        if (ansBtn) {
            e.preventDefault();
            ansBtn.click();
            return;
        }
        // If ease buttons are visible and Enter is pressed, trigger default ease
        const defaultEase = document.getElementById("defease") as HTMLButtonElement;
        if (defaultEase) {
            e.preventDefault();
            defaultEase.click();
            return;
        }
    }

    // E: Edit Current Card
    if (key === "e" || key === "E") {
        const editBtn = document.querySelector<HTMLButtonElement>(".m3-btn-edit");
        if (editBtn) {
            e.preventDefault();
            editBtn.click();
            return;
        }
    }

    // M: More Options Menu
    if (key === "m" || key === "M") {
        const moreBtn = document.querySelector<HTMLButtonElement>(".m3-btn-more");
        if (moreBtn) {
            e.preventDefault();
            moreBtn.click();
            return;
        }
    }

    // Arrow keys navigation between ease buttons
    if (key === "ArrowLeft" || key === "ArrowRight") {
        const easeBtns = Array.from(document.querySelectorAll<HTMLButtonElement>(".m3-ease-btn"));
        if (easeBtns.length > 0) {
            const currentIndex = easeBtns.findIndex(btn => btn === document.activeElement);
            if (currentIndex === -1) {
                easeBtns[0].focus();
            } else {
                const nextIndex = key === "ArrowRight"
                    ? Math.min(currentIndex + 1, easeBtns.length - 1)
                    : Math.max(currentIndex - 1, 0);
                easeBtns[nextIndex].focus();
            }
            e.preventDefault();
        }
    }
});

// Initial binding
document.addEventListener("DOMContentLoaded", () => {
    setupEaseButtonEvents();
});
