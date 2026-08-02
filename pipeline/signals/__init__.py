"""Behavioral signal orchestration."""
from __future__ import annotations
import json,pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.signals.abnormality import abnormality
from pipeline.signals.silence_break import silence_break
from pipeline.signals.purchase_velocity import velocity
from pipeline.signals.purchase_acceleration import acceleration
from pipeline.signals.cluster_buying import cluster_for_event
from pipeline.signals.drawdown_context import drawdown_label
from pipeline.signals.behavior_change import behavior_score,role_score
from pipeline.signals.confidence import conviction_score
from pipeline.utils.atomic import atomic_write_csv_gz,atomic_write_json
from pipeline.utils.time import utc_now_iso

def score_all(histories:pd.DataFrame,companies:pd.DataFrame)->tuple[pd.DataFrame,pd.DataFrame]:
 rows=[]
 for (_, _),g in histories.sort_values('transaction_date').groupby(['issuer_cik','insider_id'],sort=True):
  prior=[]
  for event in g.to_dict('records'):
   a=abnormality(event,[x['purchase_value'] for x in prior]);s=silence_break(event.get('days_since_previous_purchase'),event.get('median_prior_gap_days'),event.get('longest_prior_gap_days'),a['first_ever_purchase'])
   v=velocity(event['transaction_date'],prior,float(event['purchase_value']));acc=acceleration(prior+[event]);cl=cluster_for_event(event,histories,14);rs=role_score(event.get('normalized_roles',''))
   own=min(100,max(event.get('ownership_increase_percent') or 0,0)*2);hq={'no_history':20,'sparse':45,'usable':80,'deep':100}.get(event.get('history_depth'),20)
   b=behavior_score({**a,**s,**v,**acc,'ownership_score':own,'role_score':rs,'history_quality_score':hq})
   company=companies[companies['issuer_cik']==event['issuer_cik']];eligible=bool(company.iloc[0]['discovery_eligible']) if not company.empty else False
   flags=[]
   if event.get('history_depth') in {'no_history','sparse'}:flags.append('sparse_history')
   if event.get('direct_indirect_code')=='I':flags.append('indirect_only')
   if not event.get('price_available',False):flags.append('missing_price')
   if not eligible:flags.append('microcap_or_illiquid')
   c=conviction_score({**event,**b,**cl,'role_score':rs,'discovery_eligible':eligible},flags)
   rows.append({**event,**a,**s,**v,**acc,**cl,**b,**c,'drawdown_label':drawdown_label(event.get('drawdown_52w'),event.get('return_prior_21d')),
    'behavior_components':json.dumps(b['behavior_components'],sort_keys=True),'behavior_missing':json.dumps(b['behavior_missing']),
    'conviction_components':json.dumps(c['conviction_components'],sort_keys=True),'conviction_penalties':json.dumps(c['conviction_penalties'],sort_keys=True),'reason_codes':'|'.join(c['reason_codes'])})
   prior.append(event)
 events=pd.DataFrame(rows)
 companies_out=(events.sort_values('conviction_score').groupby('issuer_cik',as_index=False).tail(1) if not events.empty else pd.DataFrame())
 return events,companies_out

def write_signals(histories,companies):
 root=project_root();events,company=score_all(histories,companies);atomic_write_csv_gz(root/'data/signals/event_signals.csv.gz',events);atomic_write_csv_gz(root/'data/signals/company_signals.csv.gz',company)
 atomic_write_json(root/'data/quality/signal_summary.json',{'schema_version':'v1','generated_at_utc':utc_now_iso(),'event_signals':len(events),'company_signals':len(company)})
 return {'event_signals':len(events),'company_signals':len(company)}
