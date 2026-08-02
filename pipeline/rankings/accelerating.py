"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  acc=_num(r.get('acceleration_score'))
  if acc>0 and _num(r.get('acceleration_sample_count',r.get('prior_purchase_count')))>=2:
   rows.append(base_row(r,'accelerating',.6*acc+.4*_num(r.get('conviction_score'))))
 return finalize(rows,'accelerating')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
