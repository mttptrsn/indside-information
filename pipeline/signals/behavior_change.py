"""Transparent behavior-change score."""
from __future__ import annotations
from pipeline.contracts.validation import config_dir,load_json

def role_score(roles):
 cfg=load_json(config_dir()/'scoring.json')['role_quality'];rs=set(str(roles).split('|'))
 if {'founder','ceo'}<=rs:return cfg['founder_ceo']
 return max([cfg.get(r,0) for r in rs] or [0])
def behavior_score(components):
 w=load_json(config_dir()/'scoring.json')['behavior_change_weights'];mapping={'purchase_size_abnormality':'abnormality_score','silence_break':'silence_break_score','purchase_velocity':'velocity_score','purchase_acceleration':'acceleration_score','ownership_increase':'ownership_score','role_quality':'role_score','history_quality':'history_quality_score'}
 available=[(k,components.get(v)) for k,v in mapping.items() if components.get(v) is not None]
 total=sum(w[k] for k,_ in available) or 1;score=sum(w[k]*float(v) for k,v in available)/total
 return {'behavior_change_score':round(score,4),'behavior_components':{v:components.get(v) for v in mapping.values()},'behavior_missing':[v for v in mapping.values() if components.get(v) is None]}
