"""Native raster plots. No browser, WebView, OpenGL or plotting dependency."""
import math

import numpy as np
from PySide6.QtCore import QPointF, QRectF, Qt
from PySide6.QtGui import QColor, QPainter, QPen, QPolygonF
from PySide6.QtWidgets import QWidget

INK = QColor("#163248")
MUTED = QColor("#617486")
TEAL = QColor("#137f87")
ORANGE = QColor("#cb623f")
GRID = QColor("#dfe7ec")


def polygon(x, y):
    return QPolygonF([QPointF(float(a), float(b)) for a, b in zip(x, y)])


class Cloud(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.experiment = None
        self.language = "zh"
        self.view = "3d"
        self.sign_colors = True
        self.yaw, self.pitch = 28.0, 18.0
        self._drag = None
        self.setMinimumSize(430, 300)
        self.setAccessibleName("H2+ position measurement cloud")

    def project(self, points):
        x, y, z = np.asarray(points).T
        if self.view == "xz":
            return np.column_stack((z, x))
        if self.view == "xy":
            return np.column_stack((x, y))
        yaw, pitch = math.radians(self.yaw), math.radians(self.pitch)
        u = z*math.cos(yaw) + x*math.sin(yaw)
        v = (x*math.cos(yaw)-z*math.sin(yaw))*math.cos(pitch) + y*math.sin(pitch)
        return np.column_stack((u, v))

    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton and self.view == "3d":
            self._drag = event.position()

    def mouseMoveEvent(self, event):
        if self._drag is not None and self.view == "3d":
            delta = event.position()-self._drag
            self.yaw = (self.yaw + delta.x()*.4) % 360
            self.pitch = max(-85, min(85, self.pitch + delta.y()*.4))
            self._drag = event.position()
            self.update()

    def mouseReleaseEvent(self, event):
        self._drag = None

    def paintEvent(self, event):
        p = QPainter(self)
        p.fillRect(self.rect(), QColor("#ffffff"))
        if self.experiment is None:
            return
        exp, model = self.experiment, self.experiment.model
        rect = QRectF(20, 36, self.width()-40, self.height()-74)
        extent = max(4, model.R/2+3)
        scale = min(rect.width(), rect.height()) / (2*extent)

        def screen(points):
            q = self.project(points)
            return q * [scale, -scale] + [rect.center().x(), rect.center().y()]

        p.setPen(INK)
        p.drawText(20, 23, "独立位置测量 · H₂⁺" if self.language == "zh" else "Independent position measurements · H₂⁺")
        p.save()
        p.setClipRect(rect)
        p.setPen(QPen(GRID, 1))
        p.drawLine(QPointF(rect.left(), rect.center().y()), QPointF(rect.right(), rect.center().y()))
        p.drawLine(QPointF(rect.center().x(), rect.top()), QPointF(rect.center().x(), rect.bottom()))
        # Only the drawing of the infinite observation slab has a finite extent.
        for z in [-model.R/4, model.R/4]:
            corners = screen([[-extent, -extent, z], [extent, -extent, z],
                              [extent, extent, z], [-extent, extent, z]])
            p.setPen(QPen(QColor(19, 127, 135, 80), 1))
            p.setBrush(QColor(19, 127, 135, 13))
            p.drawPolygon(polygon(corners[:, 0], corners[:, 1]))
        points = exp.display_points()
        if len(points):
            projected = screen(points)
            positive = (points[:, 2] <= 0) | (model.sign == 1) | (not self.sign_colors)
            for mask, color in [(positive, TEAL), (~positive, ORANGE)]:
                selected = projected[mask]
                if len(selected):
                    shade = QColor(color)
                    shade.setAlpha(135)
                    p.setPen(QPen(shade, 1.7))
                    p.drawPoints(polygon(selected[:, 0], selected[:, 1]))
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        nuclei = screen([[0, 0, -model.R/2], [0, 0, model.R/2]])
        p.setPen(QPen(INK, 1.5))
        p.drawLine(QPointF(*nuclei[0]), QPointF(*nuclei[1]))
        for index, (x, y) in enumerate(nuclei):
            p.setBrush(QColor("#e4b14d"))
            p.drawEllipse(QPointF(x, y), 5, 5)
            p.setPen(INK)
            if self.view != "xy":
                p.drawText(QPointF(x-4, y-12), "A" if index == 0 else "B")
        if self.view == "xy":
            p.drawText(QPointF(nuclei[0, 0]+9, nuclei[0, 1]-9), "A/B")
        p.restore()
        p.setPen(MUTED)
        axes = "x → / y ↑" if self.view == "xy" else ("z → / x ↑" if self.view == "xz" else "3D")
        p.drawText(QRectF(20, 4, self.width()-40, 28), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, axes)
        note = ("拖动旋转 · 单位 a₀" if self.language == "zh" else "Drag to rotate · units a₀") if self.view == "3d" else ("投影叠加不同深度；端视不能判断核间节点" if self.language == "zh" else "Projection overlaps depths; end view cannot establish the node")
        p.drawText(20, self.height()-18, note)


class Plot(QWidget):
    def __init__(self, mode, parent=None):
        super().__init__(parent)
        self.mode = mode
        self.experiment = None
        self.language = "zh"
        self.show_probability = True
        self.setMinimumSize(315, 220)

    def paintEvent(self, event):
        p = QPainter(self)
        p.fillRect(self.rect(), QColor("white"))
        if self.experiment is None:
            return
        exp = self.experiment
        zh = self.language == "zh"
        rect = QRectF(51, 43, self.width()-70, self.height()-94)
        if self.mode == "frequency":
            n, frequency = exp.convergence()
            xmax = math.log10(max(10, exp.count))
            xmin, ymin, ymax = 0, 0, 1
            curves = [(np.log10(n), frequency, TEAL, False)]
            if self.show_probability:
                curves.append((np.array([0, xmax]), np.repeat(exp.model.region_probability, 2), ORANGE, True))
            atomic = hasattr(exp.model, 'mode')
            title = ("观察球：频率与概率" if zh else "Sphere: frequency & probability") if atomic else ("中央薄片：频率与概率" if zh else "Central slab: frequency & probability")
            footer = "n（对数刻度） · 误差不必逐步减小" if zh else "n (log scale) · error need not fall at every step"
            legend = "青：频率   橙虚线：模型概率" if zh else "Teal: frequency   Orange dashed: model probability"
            if not self.show_probability:
                legend = "青：频率；模型概率待揭晓" if zh else "Teal: frequency; model probability hidden"
            ticks = [(i, str(10**i)) for i in range(int(xmax)+1)]
        elif self.mode == 'radial':
            x = np.linspace(0, exp.model.extent, 401)
            y = exp.model.radial_density(x)
            xmin, xmax, ymin, ymax = 0, x[-1], 0, float(y.max())*1.1
            curves = [(x, y, TEAL, False)]
            title = '径向概率密度 P(r) / a₀⁻¹' if zh else 'Radial probability density P(r) / a₀⁻¹'
            footer = 'r / a₀ · 已含球壳体积因子；不是点密度' if zh else 'r / a₀ · includes shell volume, not point density'
            legend = '橙线：观察球半径   灰线：径向节点' if zh else 'Orange: sphere radius   Grey: radial nodes'
            ticks = [(0, '0'), (xmax/2, f'{xmax/2:.2g}'), (xmax, f'{xmax:.2g}')]
        else:
            data = exp.model.axis_data()
            x = data["z"]
            xmin, xmax = x[0], x[-1]
            if self.mode == "amplitude":
                arrays = [(data["a"], QColor("#9aabbd"), True), (data["b"], ORANGE, True), (data["psi"], TEAL, False)]
                title = "核轴振幅 ψ / a₀⁻³ᐟ²" if zh else "Axial amplitude ψ / a₀⁻³ᐟ²"
                legend = "青：ψ   灰：φA   橙：φB" if zh else "Teal: ψ   Grey: φA   Orange: φB"
            else:
                arrays = [(data["incoherent"], ORANGE, True), (data["density"], TEAL, False)]
                title = "核轴点密度 |ψ|² / a₀⁻³" if zh else "Axial point density |ψ|² / a₀⁻³"
                legend = "青：|ψ|²   橙虚线：无干涉对照" if zh else "Teal: |ψ|²   Orange dashed: no-interference mixture"
            ymin = min(0, *(float(v.min()) for v, _, _ in arrays)) * 1.1
            ymax = max(float(v.max()) for v, _, _ in arrays) * 1.1
            curves = [(x, v, color, dashed) for v, color, dashed in arrays]
            footer = "z / a₀ · x = y = 0；不是 z 边缘分布" if zh else "z / a₀ · x = y = 0; not the z marginal"
            ticks = [(xmin, f"{xmin:g}"), (0, "0"), (xmax, f"{xmax:g}")]
        p.setPen(INK)
        p.drawText(14, 23, title)
        p.setPen(MUTED)
        font = p.font()
        font.setPointSize(8)
        p.setFont(font)
        for y in np.linspace(ymin, ymax, 3):
            py = rect.bottom()-(y-ymin)/(ymax-ymin)*rect.height()
            p.setPen(GRID)
            p.drawLine(QPointF(rect.left(), py), QPointF(rect.right(), py))
            p.setPen(MUTED)
            label = f"{y:.0%}" if self.mode == "frequency" else f"{y:.2f}"
            p.drawText(QRectF(0, py-9, 45, 18), Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter, label)
        for x, label in ticks:
            px = rect.left()+(x-xmin)/(xmax-xmin)*rect.width()
            p.drawText(QRectF(px-30, rect.bottom()+3, 60, 16), Qt.AlignmentFlag.AlignCenter, label)
        p.save()
        p.setClipRect(rect.adjusted(-1, -1, 1, 1))
        if self.mode == 'radial':
            for value, color in [(exp.model.radius, ORANGE), *((node, MUTED) for node in exp.model.nodes)]:
                px = rect.left()+value/xmax*rect.width()
                p.setPen(QPen(color, 1, Qt.PenStyle.DashLine))
                p.drawLine(QPointF(px, rect.top()), QPointF(px, rect.bottom()))
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        for x, y, color, dashed in curves:
            p.setPen(QPen(color, 1.7, Qt.PenStyle.DashLine if dashed else Qt.PenStyle.SolidLine))
            xp = rect.left()+(x-xmin)/(xmax-xmin)*rect.width()
            yp = rect.bottom()-(y-ymin)/(ymax-ymin)*rect.height()
            if len(x):
                p.drawPolyline(polygon(xp, yp))
        p.restore()
        p.setPen(MUTED)
        p.drawText(14, self.height()-25, legend)
        p.drawText(14, self.height()-8, footer)
