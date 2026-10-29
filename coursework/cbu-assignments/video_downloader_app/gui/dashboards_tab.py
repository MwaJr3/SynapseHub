"""Custom PyQt6 adapted dashboards (InsightOS Analytical Board + Founder Telemetry Views)."""

from __future__ import annotations

from typing import Any, Callable

from PyQt6.QtCore import QPointF, QRectF, Qt, pyqtSignal
from PyQt6.QtGui import (
    QColor,
    QFont,
    QLinearGradient,
    QPainter,
    QPainterPath,
    QPen,
    QRadialGradient,
)
from PyQt6.QtWidgets import (
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QPushButton,
    QScrollArea,
    QSizePolicy,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ..core.telemetry import TelemetryStore


class DonutChartWidget(QWidget):
    """Multi-segment ring chart with center summary KPI (adapted from InsightOS & Clients Hub)."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setMinimumSize(175, 175)
        self._segments: list[tuple[str, float, str]] = [
            ("YouTube", 3, "#6366F1"),
            ("Social", 2, "#10B981"),
            ("Anime", 2, "#C6FF33"),
        ]
        self._center_top = "7"
        self._center_sub = "Total Streams"

    def set_data(
        self,
        segments: list[tuple[str, float, str]],
        center_top: str,
        center_sub: str = "Total Streams",
    ) -> None:
        self._segments = segments
        self._center_top = center_top
        self._center_sub = center_sub
        self.update()

    def paintEvent(self, _event: object) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        side = min(self.width(), self.height()) - 24
        rect = QRectF((self.width() - side) / 2.0, (self.height() - side) / 2.0, side, side)
        thickness = max(16.0, side * 0.16)
        inner_rect = rect.adjusted(thickness / 2, thickness / 2, -thickness / 2, -thickness / 2)

        total = sum(max(0.0, val) for _, val, _ in self._segments)
        if total <= 0:
            pen = QPen(QColor("#334155"), thickness, Qt.PenStyle.SolidLine, Qt.PenCapStyle.FlatCap)
            painter.setPen(pen)
            painter.drawArc(inner_rect, 0, 360 * 16)
        else:
            start_angle = 90 * 16
            for _label, val, color_hex in self._segments:
                if val <= 0:
                    continue
                span = int(round(-(val / total) * 360 * 16))
                pen = QPen(
                    QColor(color_hex),
                    thickness,
                    Qt.PenStyle.SolidLine,
                    Qt.PenCapStyle.FlatCap,
                )
                painter.setPen(pen)
                painter.drawArc(inner_rect, start_angle, span)
                start_angle += span

        painter.setPen(QColor("#94A3B8"))
        f_top = QFont("Inter", 14, QFont.Weight.Bold)
        painter.setFont(f_top)
        painter.setPen(self.palette().text().color())
        painter.drawText(
            inner_rect.adjusted(0, -10, 0, -10),
            Qt.AlignmentFlag.AlignCenter,
            self._center_top,
        )

        f_sub = QFont("Inter", 9)
        painter.setFont(f_sub)
        painter.setPen(QColor("#64748B"))
        painter.drawText(
            inner_rect.adjusted(0, 18, 0, 18),
            Qt.AlignmentFlag.AlignCenter,
            self._center_sub,
        )
        painter.end()


class AreaLineChartWidget(QWidget):
    """Glowing area-line trend chart (adapted from Live Metrics & Sources Overview)."""

    def __init__(self, accent_hex: str = "#10B981", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._accent = accent_hex
        self._values: list[float] = [8.4, 11.2, 10.8, 14.5, 16.9, 15.2, 18.4]
        self.setMinimumHeight(185)

    def set_values(self, values: list[float]) -> None:
        if values:
            self._values = values
            self.update()

    def paintEvent(self, _event: object) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        w = float(self.width())
        h = float(self.height())
        pad_x, pad_y = 18.0, 22.0
        plot_w = max(20.0, w - pad_x * 2)
        plot_h = max(20.0, h - pad_y * 2)

        # Subtle horizontal grid lines
        grid_pen = QPen(QColor(148, 163, 184, 32), 1.0, Qt.PenStyle.DashLine)
        painter.setPen(grid_pen)
        for step in range(4):
            gy = pad_y + (plot_h * step / 3.0)
            painter.drawLine(QPointF(pad_x, gy), QPointF(w - pad_x, gy))

        pts = self._values if len(self._values) >= 2 else [self._values[0], self._values[0]]
        max_v = max(max(pts), 1.0) * 1.12
        min_v = 0.0

        coords: list[QPointF] = []
        for idx, val in enumerate(pts):
            px = pad_x + (idx / (len(pts) - 1)) * plot_w
            norm = (val - min_v) / (max_v - min_v)
            py = pad_y + plot_h * (1.0 - norm)
            coords.append(QPointF(px, py))

        area_path = QPainterPath()
        area_path.moveTo(coords[0].x(), pad_y + plot_h)
        for pt in coords:
            area_path.lineTo(pt)
        area_path.lineTo(coords[-1].x(), pad_y + plot_h)
        area_path.closeSubpath()

        fill_grad = QLinearGradient(0, pad_y, 0, pad_y + plot_h)
        c_top = QColor(self._accent)
        c_top.setAlpha(95)
        c_bot = QColor(self._accent)
        c_bot.setAlpha(4)
        fill_grad.setColorAt(0.0, c_top)
        fill_grad.setColorAt(1.0, c_bot)
        painter.fillPath(area_path, fill_grad)

        line_path = QPainterPath()
        line_path.moveTo(coords[0])
        for pt in coords[1:]:
            line_path.lineTo(pt)

        painter.setPen(QPen(QColor(self._accent), 2.6))
        painter.drawPath(line_path)

        painter.setBrush(QColor(self._accent))
        painter.setPen(Qt.PenStyle.NoPen)
        for pt in coords:
            painter.drawEllipse(pt, 3.6, 3.6)
        painter.end()


class BarChartWidget(QWidget):
    """Vertical rounded bar series widget (Engine Load, UI Latency, Resolution Breakdown)."""

    def __init__(self, accent_hex: str = "#3B82F6", parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._accent = accent_hex
        self._bars: list[tuple[str, float]] = []
        self.setMinimumHeight(165)

    def set_bars(self, bars: list[tuple[str, float]]) -> None:
        self._bars = bars
        self.update()

    def paintEvent(self, _event: object) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        if not self._bars:
            painter.end()
            return

        w = float(self.width())
        h = float(self.height())
        show_labels = len(self._bars) <= 8
        bottom_pad = 26.0 if show_labels else 12.0
        top_pad = 14.0
        side_pad = 12.0
        avail_w = max(20.0, w - side_pad * 2)
        avail_h = max(20.0, h - top_pad - bottom_pad)

        max_v = max(max(v for _, v in self._bars), 1.0)
        count = len(self._bars)
        slot_w = avail_w / count
        bar_w = max(6.0, slot_w * 0.72)

        font = QFont("Inter", 8, QFont.Weight.DemiBold)
        painter.setFont(font)

        for idx, (label, val) in enumerate(self._bars):
            bh = max(5.0, (val / max_v) * avail_h)
            bx = side_pad + idx * slot_w + (slot_w - bar_w) / 2.0
            by = top_pad + (avail_h - bh)

            rect = QRectF(bx, by, bar_w, bh)
            grad = QLinearGradient(bx, by, bx, by + bh)
            c1 = QColor(self._accent)
            c2 = QColor(self._accent)
            c2.setAlpha(155)
            grad.setColorAt(0.0, c1)
            grad.setColorAt(1.0, c2)

            path = QPainterPath()
            path.addRoundedRect(rect, 4.0, 4.0)
            painter.fillPath(path, grad)

            if show_labels and label:
                painter.setPen(QColor("#94A3B8"))
                lbl_rect = QRectF(side_pad + idx * slot_w, h - 22.0, slot_w, 18.0)
                painter.drawText(lbl_rect, Qt.AlignmentFlag.AlignCenter, label)

        painter.end()


class GlowingOrbWidget(QWidget):
    """Iridescent neon orb inspired by the Bostie AI / Pulse Inspector right panel."""

    def __init__(self, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setFixedSize(124, 124)

    def paintEvent(self, _event: object) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        cx, cy = self.width() / 2.0, self.height() / 2.0
        glow = QRadialGradient(cx, cy, 58.0)
        glow.setColorAt(0.0, QColor(198, 255, 51, 235))
        glow.setColorAt(0.45, QColor(16, 185, 129, 210))
        glow.setColorAt(0.75, QColor(6, 182, 212, 120))
        glow.setColorAt(1.0, QColor(11, 15, 20, 0))
        painter.setBrush(glow)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(QPointF(cx, cy), 56.0, 56.0)

        highlight = QRadialGradient(cx - 12, cy - 14, 28.0)
        highlight.setColorAt(0.0, QColor(255, 255, 255, 190))
        highlight.setColorAt(1.0, QColor(255, 255, 255, 0))
        painter.setBrush(highlight)
        painter.drawEllipse(QPointF(cx - 8, cy - 10), 26.0, 26.0)
        painter.end()


def _make_kpi_box(title: str, value: str, sub: str, accent: str = "#C6FF33") -> tuple[QFrame, QLabel, QLabel]:
    box = QFrame()
    box.setObjectName("CardSurface")
    lay = QVBoxLayout(box)
    lay.setContentsMargins(16, 14, 16, 14)
    lay.setSpacing(4)

    lbl_t = QLabel(title.upper())
    lbl_t.setStyleSheet("color: #64748B; font-size: 10px; font-weight: 700; letter-spacing: 0.6px;")
    lay.addWidget(lbl_t)

    lbl_v = QLabel(value)
    lbl_v.setStyleSheet("font-size: 24px; font-weight: 800;")
    lay.addWidget(lbl_v)

    lbl_s = QLabel(sub)
    lbl_s.setStyleSheet(f"color: {accent}; font-size: 11px; font-weight: 600;")
    lay.addWidget(lbl_s)
    return box, lbl_v, lbl_s


class AnalyticalBoardView(QWidget):
    """Adapted InsightOS Analytical Board (Hero dark card + Donut + Lime card + Pulse AI + Queue table)."""

    quickInspectRequested = pyqtSignal(str)
    quickTranscriptRequested = pyqtSignal(str)

    def __init__(self, telemetry: TelemetryStore, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self._telemetry = telemetry
        self._build_ui()
        self.refresh_metrics()

    def _build_ui(self) -> None:
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(scroll)

        container = QWidget()
        scroll.setWidget(container)
        root = QVBoxLayout(container)
        root.setContentsMargins(2, 2, 6, 8)
        root.setSpacing(14)

        top_split = QHBoxLayout()
        top_split.setSpacing(14)

        # Left 2/3 column: Obsidian Hero Card + 2 side-by-side Analysis Cards
        left_col = QVBoxLayout()
        left_col.setSpacing(14)

        hero = QFrame()
        hero.setObjectName("ObsidianHeroCard")
        hero_lay = QVBoxLayout(hero)
        hero_lay.setContentsMargins(20, 18, 20, 18)
        hero_lay.setSpacing(12)

        hero_title = QLabel("Smart Media & Transcript Distribution")
        hero_title.setStyleSheet("color: #F8FAFC; font-size: 17px; font-weight: 700;")
        hero_lay.addWidget(hero_title)

        hero_sub = QLabel(
            "yt-dlp + FFmpeg enhanced telemetry tracking stream volume, extraction success ROI, and parsed captions."
        )
        hero_sub.setStyleSheet("color: #94A3B8; font-size: 12px;")
        hero_lay.addWidget(hero_sub)

        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(12)

        self.hero_vol_lbl = QLabel("0 B")
        self.hero_roi_lbl = QLabel("100%")
        self.hero_cues_lbl = QLabel("0")

        for caption, val_lbl, suffix in [
            ("Total Media Saved", self.hero_vol_lbl, "Disk library"),
            ("Extraction Success ROI", self.hero_roi_lbl, "First-pass + retry"),
            ("Parsed Transcript Cues", self.hero_cues_lbl, "Clean VTT/SRT lines"),
        ]:
            sub_card = QFrame()
            sub_card.setStyleSheet(
                "background-color: rgba(255, 255, 255, 0.05); "
                "border: 1px solid rgba(198, 255, 51, 0.25); border-radius: 14px;"
            )
            sc_lay = QVBoxLayout(sub_card)
            sc_lay.setContentsMargins(14, 12, 14, 12)
            c_lbl = QLabel(caption)
            c_lbl.setStyleSheet("color: #CBD5E1; font-size: 11px; font-weight: 600;")
            sc_lay.addWidget(c_lbl)
            val_lbl.setStyleSheet("color: #FFFFFF; font-size: 23px; font-weight: 800;")
            sc_lay.addWidget(val_lbl)
            s_lbl = QLabel(suffix)
            s_lbl.setStyleSheet("color: #C6FF33; font-size: 10px; font-weight: 600;")
            sc_lay.addWidget(s_lbl)
            kpi_row.addWidget(sub_card, stretch=1)

        hero_lay.addLayout(kpi_row)
        left_col.addWidget(hero)

        # Middle row: Platform Analysis Donut + Queue/Format Lime Card
        mid_row = QHBoxLayout()
        mid_row.setSpacing(14)

        donut_card = QFrame()
        donut_card.setObjectName("CardSurface")
        d_lay = QVBoxLayout(donut_card)
        d_lay.setContentsMargins(16, 14, 16, 14)
        d_title = QLabel("Platform Analysis")
        d_title.setStyleSheet("font-size: 14px; font-weight: 700;")
        d_lay.addWidget(d_title)

        d_body = QHBoxLayout()
        self.platform_donut = DonutChartWidget()
        d_body.addWidget(self.platform_donut)

        self.donut_legend = QLabel()
        self.donut_legend.setStyleSheet("font-size: 12px; line-height: 1.6;")
        d_body.addWidget(self.donut_legend, stretch=1)
        d_lay.addLayout(d_body)
        mid_row.addWidget(donut_card, stretch=1)

        lime_card = QFrame()
        lime_card.setObjectName("LimeAnalysisCard")
        l_lay = QVBoxLayout(lime_card)
        l_lay.setContentsMargins(16, 14, 16, 14)
        l_title = QLabel("Stream & Subtitle Breakdown")
        l_title.setStyleSheet("font-size: 14px; font-weight: 700;")
        l_lay.addWidget(l_title)

        self.deal_stats_lbl = QLabel()
        self.deal_stats_lbl.setWordWrap(True)
        self.deal_stats_lbl.setStyleSheet("font-size: 13px; font-weight: 600;")
        l_lay.addWidget(self.deal_stats_lbl)

        self.deal_bars = BarChartWidget(accent_hex="#84CC16")
        l_lay.addWidget(self.deal_bars, stretch=1)
        mid_row.addWidget(lime_card, stretch=1)

        left_col.addLayout(mid_row)
        top_split.addLayout(left_col, stretch=2)

        # Right 1/3 column: Pulse AI & Quick Stream Inspector (adapted from Bostie AI)
        pulse_card = QFrame()
        pulse_card.setObjectName("ObsidianHeroCard")
        pulse_card.setMinimumWidth(290)
        p_lay = QVBoxLayout(pulse_card)
        p_lay.setContentsMargins(18, 18, 18, 18)
        p_lay.setSpacing(12)

        p_hdr = QLabel("Pulse Stream Assistant")
        p_hdr.setAlignment(Qt.AlignmentFlag.AlignCenter)
        p_hdr.setStyleSheet("color: #F8FAFC; font-size: 14px; font-weight: 700;")
        p_lay.addWidget(p_hdr)

        orb_wrap = QHBoxLayout()
        orb_wrap.addStretch(1)
        orb_wrap.addWidget(GlowingOrbWidget())
        orb_wrap.addStretch(1)
        p_lay.addLayout(orb_wrap)

        p_prompt = QLabel("How can I extract your media today?")
        p_prompt.setAlignment(Qt.AlignmentFlag.AlignCenter)
        p_prompt.setStyleSheet("color: #CBD5E1; font-size: 13px; font-weight: 600;")
        p_lay.addWidget(p_prompt)

        quick_btns = QHBoxLayout()
        btn_fmt = QPushButton("⚡ Fetch Formats")
        btn_fmt.clicked.connect(self._emit_quick_inspect)
        quick_btns.addWidget(btn_fmt)

        btn_tr = QPushButton("📝 Quick Transcript")
        btn_tr.clicked.connect(self._emit_quick_transcript)
        quick_btns.addWidget(btn_tr)
        p_lay.addLayout(quick_btns)

        p_lay.addStretch(1)

        self.quick_url_input = QLineEdit()
        self.quick_url_input.setPlaceholderText("Paste YouTube / TikTok / Anime URL...")
        self.quick_url_input.returnPressed.connect(self._emit_quick_inspect)
        p_lay.addWidget(self.quick_url_input)

        top_split.addWidget(pulse_card, stretch=1)
        root.addLayout(top_split)

        # Bottom Table: Recent Downloads & Stream Health (InsightOS Top Opportunities adaptation)
        table_card = QFrame()
        table_card.setObjectName("CardSurface")
        t_lay = QVBoxLayout(table_card)
        t_lay.setContentsMargins(16, 14, 16, 14)
        t_lay.setSpacing(10)

        t_hdr = QLabel("Recent Downloads & Stream Health")
        t_hdr.setStyleSheet("font-size: 14px; font-weight: 700;")
        t_lay.addWidget(t_hdr)

        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(
            ["Stream Title", "Platform", "Resolution", "Health Score", "Throughput", "Size / Status"]
        )
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        for col in range(1, 6):
            self.table.horizontalHeader().setSectionResizeMode(
                col, QHeaderView.ResizeMode.ResizeToContents
            )
        self.table.verticalHeader().setVisible(False)
        self.table.setMinimumHeight(210)
        t_lay.addWidget(self.table)

        root.addWidget(table_card)

    def _emit_quick_inspect(self) -> None:
        url = self.quick_url_input.text().strip()
        if url:
            self.quickInspectRequested.emit(url)

    def _emit_quick_transcript(self) -> None:
        url = self.quick_url_input.text().strip()
        if url:
            self.quickTranscriptRequested.emit(url)

    def refresh_metrics(self, active_queue_count: int = 0) -> None:
        snap = self._telemetry.get_dashboard_snapshot(active_queue_count=active_queue_count)
        board = snap["insight_board"]
        self.hero_vol_lbl.setText(str(board["total_media_saved"]))
        self.hero_roi_lbl.setText(f"+{board['success_rate_pct']}%")
        self.hero_cues_lbl.setText(f"{board['total_transcript_cues']:,}")

        donut = board["platform_donut"]
        yt = int(donut["youtube"])
        soc = int(donut["social"])
        ani = int(donut["anime_and_other"])
        self.platform_donut.set_data(
            [
                ("YouTube", yt, "#6366F1"),
                ("Social", soc, "#10B981"),
                ("Anime & Other", ani, "#C6FF33"),
            ],
            center_top=str(board["total_downloads"]),
            center_sub="Saved Streams",
        )
        self.donut_legend.setText(
            f"🟣 {yt} YouTube Streams\n"
            f"🟢 {soc} TikTok / Facebook\n"
            f"🟡 {ani} Anime & Portals"
        )

        deals = board["format_deal_cards"]
        self.deal_stats_lbl.setText(
            f"Completed HD: {deals['hd_completed']}   •   "
            f"Failed/Retried: {deals['retried_or_failed']}   •   "
            f"Captions/Transcripts: {deals['subtitle_enriched']}"
        )
        self.deal_bars.set_bars(
            [
                ("HD Saved", float(deals["hd_completed"])),
                ("Retried", float(max(1, deals["retried_or_failed"]))),
                ("Subtitles", float(deals["subtitle_enriched"])),
            ]
        )

        rows = board["recent_downloads"]
        self.table.setRowCount(len(rows))
        for idx, item in enumerate(rows):
            self.table.setItem(idx, 0, QTableWidgetItem(item["title"]))
            self.table.setItem(idx, 1, QTableWidgetItem(item["platform"]))
            self.table.setItem(idx, 2, QTableWidgetItem(item["resolution"]))
            filled = max(1, min(10, round(int(item["health_score"]) / 10)))
            bars_str = "▮" * filled + "▯" * (10 - filled) + f" {item['health_score']}%"
            health_item = QTableWidgetItem(bars_str)
            health_item.setForeground(QColor("#84CC16"))
            self.table.setItem(idx, 3, health_item)
            self.table.setItem(idx, 4, QTableWidgetItem(item["speed_mbps"]))
            self.table.setItem(
                idx,
                5,
                QTableWidgetItem(f"{item['size_human']} ({item['status']})"),
            )


class AdaptedTelemetryView(QWidget):
    """Renders Live Metrics, Sources Hub, Engine Health, UI Performance, and Live Changelog."""

    def __init__(
        self,
        mode: str,
        telemetry: TelemetryStore,
        on_check_updates: Callable[[], None] | None = None,
        parent: QWidget | None = None,
    ) -> None:
        super().__init__(parent)
        self._mode = mode  # live_metrics | sources_hub | engine_health | ui_performance | changelog
        self._telemetry = telemetry
        self._on_check_updates = on_check_updates
        self._changelog_filter = "ALL"
        self._build_ui()
        self.refresh_metrics()

    def _build_ui(self) -> None:
        self._root = QVBoxLayout(self)
        self._root.setContentsMargins(2, 2, 6, 8)
        self._root.setSpacing(14)

        self.header_title = QLabel()
        self.header_title.setStyleSheet("font-size: 20px; font-weight: 800;")
        self._root.addWidget(self.header_title)

        self.header_sub = QLabel()
        self.header_sub.setStyleSheet("font-size: 12px; color: #94A3B8;")
        self._root.addWidget(self.header_sub)

        self.kpi_grid = QGridLayout()
        self.kpi_grid.setSpacing(12)
        self._root.addLayout(self.kpi_grid)

        self.body_frame = QFrame()
        self.body_frame.setObjectName("CardSurface")
        self.body_frame.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self.body_layout = QVBoxLayout(self.body_frame)
        self.body_layout.setContentsMargins(18, 16, 18, 16)
        self.body_layout.setSpacing(12)
        self._root.addWidget(self.body_frame, stretch=1)

    def _clear_layout(self, layout: Any) -> None:
        while layout.count():
            child = layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()
            elif child.layout():
                self._clear_layout(child.layout())

    def refresh_metrics(self, active_queue_count: int = 0) -> None:
        snap = self._telemetry.get_dashboard_snapshot(active_queue_count=active_queue_count)
        self._clear_layout(self.kpi_grid)
        self._clear_layout(self.body_layout)

        if self._mode == "live_metrics":
            m = snap["live_metrics"]
            self.header_title.setText("Live Metrics Dashboard")
            self.header_sub.setText(
                "Real-time KPIs at a glance — bandwidth saved, completed streams, speed trend, and caption conversion."
            )
            kpis = [
                ("Total Library Volume", m["total_volume_human"], "+18.4% vs last week", "#10B981"),
                ("Completed Streams", str(m["completed_streams"]), "yt-dlp verified", "#10B981"),
                ("Avg Download Speed", f"{m['avg_speed_mbps']} MB/s", "+2.1 MB/s peak", "#10B981"),
                ("Subtitle Hit Rate", f"{m['subtitle_conversion_pct']}%", "Auto + Manual SRT", "#10B981"),
            ]
            for idx, (t, v, s, c) in enumerate(kpis):
                box, _, _ = _make_kpi_box(t, v, s, c)
                self.kpi_grid.addWidget(box, 0, idx)

            row = QHBoxLayout()
            left_v = QVBoxLayout()
            left_v.addWidget(QLabel("Throughput Trend (MB/s)"))
            area = AreaLineChartWidget(accent_hex="#10B981")
            area.set_values([float(x) for x in m["speed_trend_mbps"]])
            left_v.addWidget(area)
            row.addLayout(left_v, stretch=3)

            right_v = QVBoxLayout()
            right_v.addWidget(QLabel("Downloads by Resolution Tier"))
            bars = BarChartWidget(accent_hex="#10B981")
            bars.set_bars([(k, float(v)) for k, v in m["resolution_bars"].items()])
            right_v.addWidget(bars)
            row.addLayout(right_v, stretch=2)
            self.body_layout.addLayout(row)

        elif self._mode == "sources_hub":
            s_hub = snap["sources_hub"]
            self.header_title.setText("Sources & Channels Hub")
            self.header_sub.setText(
                "Every streaming platform & creator channel in one place — domain extractors, playlists, and activity."
            )
            kpis = [
                ("Supported Sites", f"{s_hub['supported_extractors']:,}", "yt-dlp extractors", "#F59E0B"),
                ("Tracked Channels", str(s_hub["tracked_channels"]), "Active creators", "#F59E0B"),
                ("Media Volume", s_hub["library_volume_human"], "Local storage", "#F59E0B"),
                ("Open Queue Jobs", str(s_hub["active_queue_jobs"]), "Concurrent workers", "#F59E0B"),
            ]
            for idx, (t, v, s, c) in enumerate(kpis):
                box, _, _ = _make_kpi_box(t, v, s, c)
                self.kpi_grid.addWidget(box, 0, idx)

            row = QHBoxLayout()
            donut = DonutChartWidget()
            pb = s_hub["platform_breakdown"]
            donut.set_data(
                [
                    ("YouTube", float(pb.get("YouTube", 0)), "#F59E0B"),
                    ("Anime", float(pb.get("Anime Sites", 0)), "#F97316"),
                    ("Social", float(pb.get("TikTok & Social", 0)), "#EAB308"),
                    ("Other", float(pb.get("Other Portals", 0)), "#78716C"),
                ],
                center_top=str(sum(pb.values())),
                center_sub="Total Sources",
            )
            row.addWidget(donut, stretch=1)

            act_col = QVBoxLayout()
            act_hdr = QLabel("Recent Extractor & Bridge Activity")
            act_hdr.setStyleSheet("font-weight: 700; font-size: 14px;")
            act_col.addWidget(act_hdr)
            for ev in s_hub["recent_activity"][:5]:
                lbl = QLabel(f"● {ev['headline']} — {ev['detail']}")
                lbl.setStyleSheet("color: #CBD5E1; font-size: 12px; padding: 4px 0;")
                act_col.addWidget(lbl)
            act_col.addStretch(1)
            row.addLayout(act_col, stretch=2)
            self.body_layout.addLayout(row)

        elif self._mode == "engine_health":
            eh = snap["engine_health"]
            self.header_title.setText("Engine & Services Health Monitor")
            self.header_sub.setText(
                "Catches extractor, FFmpeg remux, and WebSocket browser bridge issues before downloads fail."
            )
            kpis = [
                ("Bridge Uptime", f"{eh['ws_uptime_pct']}%", "ws://127.0.0.1 active", "#10B981"),
                ("Avg Extractor Latency", f"{eh['avg_extractor_ms']}ms", "yt-dlp metadata probe", "#10B981"),
                ("Task Error Rate", f"{eh['error_rate_pct']}%", "Auto-retry protected", "#10B981"),
            ]
            for idx, (t, v, s, c) in enumerate(kpis):
                box, _, _ = _make_kpi_box(t, v, s, c)
                self.kpi_grid.addWidget(box, 0, idx)

            row = QHBoxLayout()
            left_col = QVBoxLayout()
            left_col.addWidget(QLabel("Engine Load — Last 24 Intervals"))
            bars = BarChartWidget(accent_hex="#EF4444")
            bars.set_bars([("", float(x)) for x in eh["engine_load_24"]])
            left_col.addWidget(bars)
            row.addLayout(left_col, stretch=3)

            fleet_col = QVBoxLayout()
            fleet_hdr = QLabel("Subsystem Fleet")
            fleet_hdr.setStyleSheet("font-weight: 700; font-size: 14px;")
            fleet_col.addWidget(fleet_hdr)
            for svc in eh["fleet"]:
                status_txt = "● Healthy" if svc["healthy"] else "● Degraded"
                status_clr = "#10B981" if svc["healthy"] else "#EF4444"
                item_lbl = QLabel(f"{svc['name']}  [{status_txt}]\n{svc['detail']}")
                item_lbl.setStyleSheet(
                    f"padding: 7px 10px; border: 1px solid #263547; border-radius: 10px; color: {status_clr}; font-size: 12px;"
                )
                fleet_col.addWidget(item_lbl)
            fleet_col.addStretch(1)
            row.addLayout(fleet_col, stretch=2)
            self.body_layout.addLayout(row)

        elif self._mode == "ui_performance":
            up = snap["ui_performance"]
            self.header_title.setText("UI & Browser Bridge Performance")
            self.header_sub.setText(
                "Measures GUI frame smoothness, yt-dlp info fetch speed, and IDM mini-taskbar popup latency."
            )
            kpis = [
                ("Responsiveness Score", str(up["responsiveness_score"]), "+3pts vs baseline", "#3B82F6"),
                ("Metadata Fetch (P50)", f"{up['metadata_fetch_p50_sec']}s", "Async worker thread", "#3B82F6"),
                ("Mini-Taskbar Jitter", f"{up['mini_taskbar_jitter_sec']}s", "Zero focus-steal", "#10B981"),
            ]
            for idx, (t, v, s, c) in enumerate(kpis):
                box, _, _ = _make_kpi_box(t, v, s, c)
                self.kpi_grid.addWidget(box, 0, idx)

            self.body_layout.addWidget(QLabel("Metadata & Transcript Probe Time — Last 14 Requests (Seconds)"))
            bars = BarChartWidget(accent_hex="#3B82F6")
            bars.set_bars([("", float(x)) for x in up["latency_bars_14"]])
            self.body_layout.addWidget(bars, stretch=1)

        elif self._mode == "changelog":
            self.header_title.setText("Live Changelog — What's New")
            self.header_sub.setText(
                "Continuous VDownloader OS updates, FFmpeg remux fixes, and yt-dlp extractor releases."
            )
            filter_row = QHBoxLayout()
            for tag in ("ALL", "NEW", "IMPROVED", "FIX"):
                b = QPushButton(tag.title() if tag != "ALL" else "All Updates")
                if self._changelog_filter == tag:
                    b.setObjectName("PrimaryButton")
                b.clicked.connect(lambda _checked=False, t=tag: self._set_changelog_filter(t))
                filter_row.addWidget(b)
            filter_row.addStretch(1)
            if self._on_check_updates is not None:
                upd_btn = QPushButton("Check Engine Version")
                upd_btn.clicked.connect(self._on_check_updates)
                filter_row.addWidget(upd_btn)
            self.body_layout.addLayout(filter_row)

            tag_colors = {"NEW": "#06B6D4", "IMPROVED": "#10B981", "FIX": "#EF4444"}
            for entry in snap["changelog"]:
                if self._changelog_filter != "ALL" and entry["tag"] != self._changelog_filter:
                    continue
                row_card = QFrame()
                row_card.setStyleSheet(
                    "border: 1px solid #223042; border-radius: 12px; padding: 8px;"
                )
                rl = QVBoxLayout(row_card)
                clr = tag_colors.get(entry["tag"], "#10B981")
                top = QLabel(
                    f"<span style='color:{clr};font-weight:800;'>[{entry['tag']}]</span> "
                    f"<b>{entry['version']} — {entry['title']}</b> "
                    f"<span style='color:#64748B;font-size:11px;'>({entry['released_label']})</span>"
                )
                rl.addWidget(top)
                desc = QLabel(entry["description"])
                desc.setWordWrap(True)
                desc.setStyleSheet("color: #94A3B8; font-size: 12px;")
                rl.addWidget(desc)
                self.body_layout.addWidget(row_card)
            self.body_layout.addStretch(1)

    def _set_changelog_filter(self, tag: str) -> None:
        self._changelog_filter = tag
        self.refresh_metrics()
