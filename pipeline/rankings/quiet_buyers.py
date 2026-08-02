"""Ranking category."""
def build(events,companies):
 from pipeline.rankings.discoveries import base_row,finalize,_num
 rows=[]
 for r in events.to_dict('records'):
  days=_num(r.get('days_since_previous_purchase'))
  if days>=365 or r.get('first_ever_purchase'):
   score=.5*_num(r.get('silence_break_score'))+.25*_num(r.get('ownership_increase_percent'))+.25*_num(r.get('conviction_score'))
   rows.append(base_row(r,'quiet_buyers',score))
 return finalize(rows,'quiet_buyers')
from pipeline.rankings.utils import boolean_column, numeric_column, text_column
