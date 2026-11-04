"""Bilingual classroom content and headless predict–observe–explain workflows."""
import json
from importlib.resources import files

CATALOG = json.loads(files(__package__).joinpath('catalog.json').read_text(encoding='utf-8'))
LESSONS = {item['id']: item for item in CATALOG['lessons']}
PRESETS = {item['id']: item for item in CATALOG['presets']}


def text(value, language='zh'):
    return value[language]


from .state import ActivityBook, observation  # noqa: E402

__all__ = ['LESSONS', 'PRESETS', 'ActivityBook', 'observation', 'text']
