"""Native histograms for independent repeated region-count experiments."""
import math
import numpy as np
from PySide6.QtCore import QRectF, QPointF
from PySide6.QtGui import QPainter, QPen, QColor
from PySide6.QtWidgets import QWidget
from .plots import TEAL, ORANGE, INK, MUTED, GRID, polygon


class GroupPlot(QWidget):
    def __init__(self, standardized=False):
        super().__init__()
        self.standardized = standardized
        self.result = None
        self.language = 'zh'
        self.setMinimumSize(380, 310)

    def paintEvent(self, event):
        p = QPainter(self)
        p.fillRect(self.rect(), QColor('white'))
        zh = self.language == 'zh'
        p.setPen(INK)
        title = ('标准化误差' if zh else 'Standardized errors') if self.standardized else ('各组球内频率' if zh else 'Inside-sphere frequency per group')
        p.drawText(14, 25, title)
        r = self.result
        if r is None:
            p.drawText(14, 65, '运行成组实验后显示' if zh else 'Run repeated groups to display')
            return
        values = r.standardized if self.standardized else r.frequencies
        if values is None:
            p.drawText(14, 65, 'p=0 或 1：方差为零，无法标准化。' if zh else 'p=0 or 1: zero variance; standardization undefined.')
            return
        mean, sd = (0., 1.) if self.standardized else (r.probability, r.standard_error)
        low, high = min(float(values.min()), mean-4*sd), max(float(values.max()), mean+4*sd)
        if not self.standardized:
            low, high = max(0., low), min(1., high)
        if high <= low:
            low, high = max(0, low-.01), min(1, high+.01)
        hist, edges = np.histogram(values, bins=30, range=(low, high), density=True)
        x = np.linspace(low, high, 301)
        normal = np.exp(-.5*((x-mean)/sd)**2)/(sd*math.sqrt(2*math.pi)) if sd > 0 else np.zeros_like(x)
        ymax = max(float(hist.max()), float(normal.max()), 1)*1.12
        rect = QRectF(48, 45, self.width()-70, self.height()-105)
        sx = lambda x: rect.left()+(x-low)/(high-low)*rect.width()
        sy = lambda y: rect.bottom()-y/ymax*rect.height()
        p.setPen(GRID)
        for y in np.linspace(0, ymax, 4):
            p.drawLine(QPointF(rect.left(), sy(y)), QPointF(rect.right(), sy(y)))
            p.setPen(MUTED)
            p.drawText(QPointF(2, sy(y)), f'{y:.1f}')
            p.setPen(GRID)
        p.setPen(QPen(TEAL, 1))
        p.setBrush(QColor('#b9dfe0'))
        for a, b, y in zip(edges[:-1], edges[1:], hist):
            p.drawRect(QRectF(sx(a), sy(y), sx(b)-sx(a), rect.bottom()-sy(y)))
        if sd > 0:
            p.setPen(QPen(ORANGE, 2))
            p.drawPolyline(polygon([sx(v) for v in x], [sy(v) for v in normal]))
        p.setPen(MUTED)
        for value in (low, (low+high)/2, high):
            p.drawText(QPointF(sx(value)-15, rect.bottom()+20), f'{value:.3g}')
        p.drawText(14, self.height()-25, '纵轴为密度；橙线为正态近似' if zh else 'Vertical axis: density; orange: normal approximation')
        p.drawText(14, self.height()-7, '(频率 − p) / √[p(1−p)/n]' if self.standardized else ('分组频率 = 球内命中 / 每组次数' if zh else 'Group frequency = inside hits / group size'))
