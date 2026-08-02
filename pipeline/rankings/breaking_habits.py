"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  mult=r.get('purchase_multiple');hist=str(r.get('history_depth',''))
  if r.get('first_ever_purchase') or (mult is not None and _num(mult)>=2):
   score=.45*_num(r.get('abnormality_score'))+.25*_num(r.get('historical_percentile'))+.2*_num(r.get('robust_z_display'))*10+.1*(100 if hist in {'usable','deep'} else 40)
   rows.append(base_row(r,'breaking_habits',score))
 return finalize(rows,'breaking_habits')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
