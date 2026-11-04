# Classroom records / 课堂记录格式

The Python `0.4.0a1` desktop saves `QuantumClassroomSession`, schema version 1.
This is local JSON data, not executable Python or pickle. The web edition and its
older export formats are preserved; this feature does not add web import.

## Contents / 内容

- `format`, `schema_version`, `application_version`, `created_at`.
- `language`: `zh` / `en`; `active`: `atomic` / `molecular` / `teaching`;
  `teaching_page`: 0–2; `projection`: large-text setting.
- `workspaces.atomic` and `.molecular`: `experiment` measurement record plus `view`.
  The existing `QuantumClassroomAtom` / `QuantumClassroomH2Plus` schema 1 includes
  full xyz coordinates, model definition, seed/PCG64/NumPy/algorithm metadata and
  statistics. New records add a random UUID `run_id` to distinguish resets even
  when the seed is unchanged. The view stores target, projection, rotation,
  coloring, axial curve mode and probability reveal state.
- `activities`: selected task/preset and answers for all five activities. Each
  answer stores draft prediction, committed prediction, conclusion, explanation,
  run identity, current result and at most 30 historical checks. Checks store the
  observation parameters, count, hits, frequency and model probability.
- `groups`: group-size/count/seed controls and an optional completed binomial
  result, with its source model/region. Changing controls does not relabel an
  earlier result: that result retains its own size, seed and source.
- `written_explanation_automatically_graded` is always false, including check
  records. No rubric automatically scores arbitrary student prose.

No dependencies were added in phase 3. Runtime session validation, activities
and groups require NumPy only; Qt is still an optional desktop dependency. All
existing third-party notices and MIT licensing remain in effect. The bilingual
catalog migrates the project's own `assets/lessons.js` and
`assets/molecular_lessons.js` into a packaged JSON resource; Node is not needed
at runtime.

## Restoration contract / 恢复约定

The reader limits input to 64 MiB and regular files, rejects duplicate JSON keys,
nonfinite numbers, unknown schema versions, malformed coordinates, excessive
counts, invalid controls, invalid answer choices and fabricated automatic prose
grades. Each experiment is limited to 100000 complete coordinates; the 50000
display limit never truncates the record. All statistics are recomputed from
coordinates; saved count/hit totals must agree.

Before changing widgets, the loader builds detached experiments and samplers,
replays the stored seed in bounded chunks, and compares every saved coordinate
exactly. The resulting sampler retains its unused proposal buffers, so the next
sample follows the saved prefix. This is tested across arbitrary chunk boundaries,
whole-atom mixtures and both molecular states. Replay differences are reported,
not silently replaced with newly sampled data. Cross-version/platform bitwise
compatibility is not promised; preserve the recorded dependencies when needed.

Complete session restoration replaces both workspaces and all task state only
after validation. A legacy individual Python record replaces only its own
workspace and invalidates any current activity run for that workspace. Historical
checks and the other experiment remain. Older individual records without `run_id`
receive a fresh ID. Restoration always leaves measurement paused.

The UI pauses and drains in-flight batches before capturing or installing data;
parsing, replay and writing run in a separate Qt thread. Inputs are temporarily
disabled during the transaction while the window continues painting. Closing
waits for a current record operation to finish. Failed writes remove the temporary
file and leave a previous destination untouched; failed reads preserve live
experiments and answers, with sampling paused.

This is not a cryptographically authenticated gradebook. A local file owner can
edit an otherwise consistent record. Written responses are displayed as plain
text, never HTML. There is no autosave, backup service, network upload or web-record
conversion. Integer seeds must fit the desktop range 0–2147483647; sphere radius
must fit 0–10000 a₀, and hydrogen orbitals must belong to the 30-state classroom
catalog. Core APIs continue to support their broader scientific parameter ranges.

## Headless example / 无界面示例

```python
from quantum_classroom.records import load_session, save_session

session = load_session('quantum-classroom-session.json')
atom = session.workspaces['atomic']
atom.experiment.append(atom.sampler.take(100))  # continue the exact prefix
print(atom.experiment.count, atom.experiment.frequency)
print(session.activities.answers['atom-positions']['reflection'])
```

`session_record(...)` constructs the versioned JSON dictionary from experiment
records/views and an `ActivityBook`; `save_session(path, dictionary)` atomically
writes that dictionary. `decode_session(dictionary)` performs the same detached
validation/replay as the file reader. See `tests/python/test_records.py` for complete
examples and failure cases. Use `core.groups.repeat_groups(p, size, groups, seed)`
for the independent binomial demonstration.

中文要点：完整记录保存两个实验及课堂答案；旧 Python 测量记录仅恢复对应实验。
恢复前校验整个文件与种子前缀，成功后保持暂停并可接着测量；失败不覆盖当前数据。
自由解释不自动评分，教师载入不代替学生提交预测。关闭窗口前需要主动保存。
