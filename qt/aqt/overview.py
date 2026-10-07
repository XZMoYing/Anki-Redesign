# Copyright: Ankitects Pty Ltd and contributors
# License: GNU AGPL, version 3 or later; http://www.gnu.org/licenses/agpl.html
from __future__ import annotations

import html
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

import aqt
import aqt.operations
from anki.collection import OpChanges
from anki.scheduler import UnburyDeck
from aqt import gui_hooks
from aqt.deckdescription import DeckDescriptionDialog
from aqt.deckoptions import display_options_for_deck
from aqt.operations import QueryOp
from aqt.operations.scheduling import (
    empty_filtered_deck,
    rebuild_filtered_deck,
    unbury_deck,
)
from aqt.sound import av_player
from aqt.toolbar import BottomBar
from aqt.utils import askUserDialog, openLink, shortcut, tooltip, tr


class OverviewBottomBar:
    def __init__(self, overview: Overview) -> None:
        self.overview = overview


@dataclass
class OverviewContent:
    """Stores sections of HTML content that the overview will be
    populated with.

    Attributes:
        deck {str} -- Plain text deck name
        shareLink {str} -- HTML of the share link section
        desc {str} -- HTML of the deck description section
        table {str} -- HTML of the deck stats table section
    """

    deck: str
    shareLink: str
    desc: str
    table: str


class Overview:
    "Deck overview."

    def __init__(self, mw: aqt.AnkiQt) -> None:
        self.mw = mw
        self.web = mw.web
        self.bottom = BottomBar(mw, mw.bottomWeb)
        self._refresh_needed = False

    def show(self) -> None:
        av_player.stop_and_clear_queue()
        self.web.set_bridge_command(self._linkHandler, self)
        self.mw.setStateShortcuts(self._shortcutKeys())
        self.refresh()

    def refresh(self) -> None:
        def success(_counts: tuple) -> None:
            self._refresh_needed = False
            self._renderPage()
            self._renderBottom()
            self.mw.web.setFocus()
            gui_hooks.overview_did_refresh(self)

        QueryOp(
            parent=self.mw, op=lambda col: col.sched.counts(), success=success
        ).run_in_background()

    def refresh_if_needed(self) -> None:
        if self._refresh_needed:
            self.refresh()

    def op_executed(
        self, changes: OpChanges, handler: object | None, focused: bool
    ) -> bool:
        if changes.study_queues:
            self._refresh_needed = True

        if focused:
            self.refresh_if_needed()

        return self._refresh_needed

    # Handlers
    ############################################################

    def _linkHandler(self, url: str) -> bool:
        if url == "study":
            self.mw.col.startTimebox()
            self.mw.moveToState("review")
            if self.mw.state == "overview":
                tooltip(tr.studying_no_cards_are_due_yet())
        elif url == "anki":
            print("anki menu")
        elif url == "opts":
            display_options_for_deck(self.mw.col.decks.current())
        elif url == "cram":
            aqt.dialogs.open("FilteredDeckConfigDialog", self.mw)
        elif url == "refresh":
            self.rebuild_current_filtered_deck()
        elif url == "empty":
            self.empty_current_filtered_deck()
        elif url == "decks":
            self.mw.moveToState("deckBrowser")
        elif url == "review":
            openLink(f"{aqt.appShared}info/{self.sid}?v={self.sidVer}")
        elif url in {"studymore", "customStudy"}:
            self.onStudyMore()
        elif url == "unbury":
            self.on_unbury()
        elif url == "description":
            self.edit_description()
        elif url.lower().startswith("http"):
            openLink(url)
        return False

    def _shortcutKeys(self) -> list[tuple[str, Callable]]:
        return [
            (" ", lambda: self._linkHandler("study")),
            ("Return", lambda: self._linkHandler("study")),
            ("Enter", lambda: self._linkHandler("study")),
            ("s", lambda: self._linkHandler("study")),
            ("o", lambda: display_options_for_deck(self.mw.col.decks.current())),
            ("r", self.rebuild_current_filtered_deck),
            ("e", self.empty_current_filtered_deck),
            ("c", self.onCustomStudyKey),
            ("u", self.on_unbury),
        ]

    def _current_deck_is_filtered(self) -> int:
        return self.mw.col.decks.current()["dyn"]

    def rebuild_current_filtered_deck(self) -> None:
        rebuild_filtered_deck(
            parent=self.mw, deck_id=self.mw.col.decks.selected()
        ).run_in_background()

    def empty_current_filtered_deck(self) -> None:
        empty_filtered_deck(
            parent=self.mw, deck_id=self.mw.col.decks.selected()
        ).run_in_background()

    def onCustomStudyKey(self) -> None:
        if not self._current_deck_is_filtered():
            self.onStudyMore()

    def on_unbury(self) -> None:
        mode = UnburyDeck.Mode.ALL
        info = self.mw.col.sched.congratulations_info()
        if info.have_sched_buried and info.have_user_buried:
            opts = [
                tr.studying_manually_buried_cards(),
                tr.studying_buried_siblings(),
                tr.studying_all_buried_cards(),
                tr.actions_cancel(),
            ]

            diag = askUserDialog(tr.studying_what_would_you_like_to_unbury(), opts)
            diag.setDefault(0)
            ret = diag.run()
            if ret == opts[0]:
                mode = UnburyDeck.Mode.USER_ONLY
            elif ret == opts[1]:
                mode = UnburyDeck.Mode.SCHED_ONLY
            elif ret == opts[3]:
                return

        unbury_deck(
            parent=self.mw, deck_id=self.mw.col.decks.get_current_id(), mode=mode
        ).run_in_background()

    onUnbury = on_unbury

    # HTML
    ############################################################

    def _renderPage(self) -> None:
        deck = self.mw.col.decks.current()
        self.sid = deck.get("sharedFrom")
        if self.sid:
            self.sidVer = deck.get("ver", None)
            shareLink = '<a class=smallLink href="review">Reviews and Updates</a>'
        else:
            shareLink = ""
        if self.mw.col.sched._is_finished():
            self._show_finished_screen()
            return
        content = OverviewContent(
            deck=deck["name"],
            shareLink=shareLink,
            desc=self._desc(deck),
            table=self._table(),
        )
        gui_hooks.overview_will_render_content(self, content)
        content.deck = html.escape(content.deck)
        self.web.stdHtml(
            self._body % content.__dict__,
            css=["css/overview.css"],
            js=["js/vendor/jquery.min.js"],
            context=self,
        )

    def _show_finished_screen(self) -> None:
        self.web.load_sveltekit_page("congrats")

    def _desc(self, deck: dict[str, Any]) -> str:
        if deck["dyn"]:
            desc = tr.studying_this_is_a_special_deck_for()
            desc += f" {tr.studying_cards_will_be_automatically_returned_to()}"
            desc += f" {tr.studying_deleting_this_deck_from_the_deck()}"
        else:
            desc = deck.get("desc", "")
            if deck.get("md", False):
                desc = self.mw.col.render_markdown(desc)
        if not desc:
            return "<p>"
        if deck["dyn"]:
            dyn = "dyn"
        else:
            dyn = ""
        return f'<div class="descfont descmid description {dyn}">{desc}</div>'

    def _table(self) -> str:
        counts = list(self.mw.col.sched.counts())
        current_did = self.mw.col.decks.get_current_id()
        deck_node = self.mw.col.sched.deck_due_tree(current_did)

        but = self.mw.button
        if self.mw.col.v3_scheduler():
            assert deck_node is not None
            buried_new = deck_node.new_count - counts[0]
            buried_learning = deck_node.learn_count - counts[1]
            buried_review = deck_node.review_count - counts[2]
        else:
            buried_new = buried_learning = buried_review = 0
        buried_label = tr.studying_counts_differ()

        def stat_col(title: str, klass: str, count: int, buried_count: int) -> str:
            buried = f"<span class='bury-count' title='{buried_label}'>{buried_count:+}</span>" if buried_count else ""
            return f"""
<div class="m3-stat-item">
  <div class="m3-stat-num"><span class="{klass}">{count}</span>{buried}</div>
  <div class="m3-stat-label">{title}</div>
</div>
"""

        space_label = tr.studying_space()
        space_tip = tr.actions_shortcut_key(val=space_label)
        study_btn = f"""
<button id="study" class="m3-hero-study-btn" title="{space_tip}" onclick="pycmd('study');" autofocus tabindex="0">
  <svg class="m3-play-icon" viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
  <span class="m3-study-label">{tr.studying_study_now()}</span>
  <kbd class="m3-kbd m3-kbd-hero">{space_label}</kbd>
</button>
"""

        return f"""
<div class="m3-overview-body">
  <div class="m3-stats-card">
    <div class="m3-stats-grid">
      {stat_col(tr.actions_new(), "new-count", counts[0], buried_new)}
      {stat_col(tr.scheduling_learning(), "learn-count", counts[1], buried_learning)}
      {stat_col(tr.studying_to_review(), "review-count", counts[2], buried_review)}
    </div>
  </div>
  <div class="m3-study-action">
    {study_btn}
  </div>
</div>
"""

    _body = """
<div class="m3-overview-container">
  <div class="m3-overview-card">
    <div class="m3-deck-header">
      <h2 class="m3-deck-title">%(deck)s</h2>
      %(shareLink)s
    </div>
    %(desc)s
    %(table)s
  </div>
</div>
"""

    def edit_description(self) -> None:
        DeckDescriptionDialog(self.mw)

    # Bottom area
    ######################################################################

    def _renderBottom(self) -> None:
        links = [
            ["O", "opts", tr.actions_options()],
        ]
        is_dyn = self.mw.col.decks.current()["dyn"]
        if is_dyn:
            links.append(["R", "refresh", tr.actions_rebuild()])
            links.append(["E", "empty", tr.studying_empty()])
        else:
            links.append(["C", "studymore", tr.actions_custom_study()])
            # links.append(["F", "cram", _("Filter/Cram")])
        if self.mw.col.sched.have_buried():
            links.append(["U", "unbury", tr.studying_unbury()])
        if not is_dyn:
            links.append(["", "description", tr.scheduling_description()])
        link_handler = gui_hooks.overview_will_render_bottom(
            self._linkHandler,
            links,
        )
        if not callable(link_handler):
            link_handler = self._linkHandler
        buf = "<div class='m3-deck-actions-bar'>"
        for b in links:
            raw_key = b[0]
            key_tip = tr.actions_shortcut_key(val=shortcut(raw_key)) if raw_key else ""
            key_badge = f"<kbd class='m3-kbd'>{shortcut(raw_key)}</kbd>" if raw_key else ""
            buf += f"""
<button class='m3-pill-btn m3-deck-action-btn' title='{key_tip}' onclick='pycmd("{b[1]}");' tabindex='0'>
  <span class='m3-btn-text'>{b[2]}</span>
  {key_badge}
</button>"""
        buf += "</div>"
        self.bottom.draw(
            buf=buf,
            link_handler=link_handler,
            web_context=OverviewBottomBar(self),
        )

    # Studying more
    ######################################################################

    def onStudyMore(self) -> None:
        import aqt.customstudy

        aqt.customstudy.CustomStudy.fetch_data_and_show(self.mw)
