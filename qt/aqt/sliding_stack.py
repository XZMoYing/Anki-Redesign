# Copyright: Ankitects Pty Ltd and contributors
# License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
from __future__ import annotations

from collections.abc import Callable

from aqt.qt import (
    QEasingCurve,
    QParallelAnimationGroup,
    QPoint,
    QPropertyAnimation,
    QResizeEvent,
    QStackedWidget,
    QWidget,
    pyqtSignal,
)


class SlidingStackedWidget(QStackedWidget):
    """A QStackedWidget subclass that transitions between child widgets using

    smooth, responsive horizontal slide animations (Material Design 3
    Expressive style).
    """

    slideFinished = pyqtSignal(int)

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._is_animating = False
        self._anim_group: QParallelAnimationGroup | None = None

    def slideToIndex(
        self,
        next_idx: int,
        duration: int = 260,
        on_done: Callable[[], None] | None = None,
    ) -> None:
        if next_idx < 0 or next_idx >= self.count():
            if on_done:
                on_done()
            return

        current_idx = self.currentIndex()
        if next_idx == current_idx:
            if on_done:
                on_done()
            self.slideFinished.emit(next_idx)
            return

        # Stop any active animation immediately
        if self._is_animating and self._anim_group:
            self._anim_group.stop()
            self._is_animating = False

        w_width = self.width()
        w_height = self.height()

        if w_width <= 0 or w_height <= 0:
            self.setCurrentIndex(next_idx)
            if on_done:
                on_done()
            self.slideFinished.emit(next_idx)
            return

        forward = next_idx > current_idx
        offset_x = w_width if forward else -w_width

        curr_w = self.widget(current_idx)
        next_w = self.widget(next_idx)

        if not curr_w or not next_w:
            self.setCurrentIndex(next_idx)
            if on_done:
                on_done()
            self.slideFinished.emit(next_idx)
            return

        # Position next widget just outside visible bounds
        next_w.setGeometry(offset_x, 0, w_width, w_height)
        next_w.show()
        next_w.raise_()

        self._is_animating = True
        self._anim_group = QParallelAnimationGroup(self)

        anim_curr = QPropertyAnimation(curr_w, b"pos", self)
        anim_curr.setDuration(duration)
        anim_curr.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim_curr.setStartValue(QPoint(0, 0))
        anim_curr.setEndValue(QPoint(-offset_x, 0))
        self._anim_group.addAnimation(anim_curr)

        anim_next = QPropertyAnimation(next_w, b"pos", self)
        anim_next.setDuration(duration)
        anim_next.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim_next.setStartValue(QPoint(offset_x, 0))
        anim_next.setEndValue(QPoint(0, 0))
        self._anim_group.addAnimation(anim_next)

        def on_finished() -> None:
            self.setCurrentIndex(next_idx)
            curr_w.move(0, 0)
            next_w.move(0, 0)
            self._is_animating = False
            self.slideFinished.emit(next_idx)
            if on_done:
                on_done()

        self._anim_group.finished.connect(on_finished)
        self._anim_group.start()

    def resizeEvent(self, event: QResizeEvent | None) -> None:
        if self._is_animating and self._anim_group:
            self._anim_group.stop()
            self._is_animating = False
            curr = self.currentWidget()
            if curr:
                curr.move(0, 0)
        super().resizeEvent(event)
