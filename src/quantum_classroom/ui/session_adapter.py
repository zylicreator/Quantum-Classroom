"""Map widgets to portable session data without replaying widget change signals."""
from PySide6.QtCore import QSignalBlocker
from quantum_classroom.core import CLASSROOM_STATES
from quantum_classroom.core.hydrogen import STATES


def workspace_record(lab):
    return dict(experiment=lab.experiment.record(lab.language), view=dict(
        target=lab.target.value(), view=lab.cloud.view, colors=lab.colors.currentIndex(),
        yaw=lab.cloud.yaw, pitch=lab.cloud.pitch,
        axis=lab.axis_plot.mode if hasattr(lab, 'R') else 'density', revealed=lab.revealed))


def install_workspace(lab, restored):
    if lab._busy:
        raise RuntimeError('Wait for the bounded sampling batch before restoring.')
    exp, view = restored.experiment, restored.view
    controls = [lab.seed, lab.target, lab.view, lab.colors]
    controls += [lab.R, lab.state, lab.axis_mode] if hasattr(lab, 'R') else [lab.mode, lab.element, lab.orbital, lab.radius]
    blockers = [QSignalBlocker(widget) for widget in controls]
    try:
        lab.epoch += 1
        lab._remaining = 0
        lab.experiment, lab.sampler = exp, restored.sampler
        lab.seed.setValue(exp.seed)
        lab.target.setValue(view['target'])
        lab.view.setCurrentIndex(['3d', 'xz', 'xy'].index(view['view']))
        lab.colors.setCurrentIndex(view['colors'])
        if hasattr(lab, 'R'):
            lab.R.setValue(exp.model.R)
            lab.state.setCurrentIndex(['bonding', 'antibonding'].index(exp.model.state))
            lab.axis_mode.setCurrentIndex(['density', 'amplitude'].index(view['axis']))
        else:
            model = exp.model
            lab.mode.setCurrentIndex(['hydrogen', 'orbital', 'whole'].index(model.mode))
            lab.element.setCurrentIndex(model.z-1)
            lab.element.setEnabled(model.mode != 'hydrogen')
            lab.orbital.setEnabled(not model.mixed)
            lab.colors.setEnabled(not model.mixed)
            shells = {shell.key for shell in model.shells}
            states = CLASSROOM_STATES if model.mode == 'hydrogen' else [key for key, spec in STATES.items() if spec.subshell in shells]
            lab.orbital.clear()
            for state in states:
                lab.orbital.addItem(STATES[state].label, state)
            lab.orbital.setCurrentIndex(max(0, lab.orbital.findData(model.state)))
            lab.radius.setValue(model.radius)
        for plot in (lab.cloud, lab.frequency_plot, lab.axis_plot):
            plot.experiment = exp
        lab.cloud.yaw, lab.cloud.pitch = view['yaw'], view['pitch']
        lab.update_view()
        lab.set_revealed(view['revealed'])
        lab.translate()
    finally:
        del blockers
