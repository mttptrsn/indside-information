"""Transparent conviction score and penalties."""
from __future__ import annotations
import numpy as np
from pipeline.contracts.validation import config_dir,load_json

def grade(score):return 'exceptional' if score>=90 else 'rare' if score>=80 else 'unusual' if score>=65 else 'notable' if score>=50 else 'ordinary'
def conviction_score(c,flags):
 cfg=load_json(config_dir()/'scoring.json');w=cfg['conviction_weights'];components={
 'behavior_change':c.get('behavior_change_score',0),'absolute_purchase_size':min(100,np.log10(max(c.get('purchase_value',1),1))/7*100),
 'ownership_increase':min(100,max(c.get('ownership_increase_percent') or 0,0)*2),'cluster_confirmation':c.get('cluster_score',0),
 'role_quality':c.get('role_score',0),'direct_ownership':100 if c.get('direct_indirect_code')=='D' else 35,
 'company_context':100 if c.get('discovery_eligible') else 35,'data_quality':100 if c.get('event_quality')=='high' else 65}
 raw=sum(w[k]*components[k] for k in w);penalties={k:cfg['quality_penalties'][k] for k in flags if k in cfg['quality_penalties']};score=float(np.clip(raw-sum(penalties.values()),0,100))
 return {'conviction_score':round(score,4),'conviction_grade':grade(score),'conviction_components':components,'conviction_penalties':penalties,'reason_codes':sorted(set(flags))}
