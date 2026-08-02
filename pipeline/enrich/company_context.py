"""Company context and smaller-company discovery eligibility."""
from __future__ import annotations
import pandas as pd
from pipeline.contracts.validation import config_dir,load_json

def enrich_companies(issuers:pd.DataFrame,metadata_loader,price_loader)->pd.DataFrame:
    cfg=load_json(config_dir()/'universe.json');e=cfg['eligibility'];excluded={x.lower() for x in cfg['excluded_security_types']};rows=[]
    for row in issuers.to_dict('records'):
      ticker=row.get('primary_ticker','');meta=metadata_loader(ticker) if ticker else {};prices=price_loader(ticker) if ticker else pd.DataFrame()
      latest=float(prices['close'].iloc[-1]) if prices is not None and not prices.empty else None
      adv=float((prices['close']*prices['volume']).tail(63).mean()) if prices is not None and not prices.empty else None
      cap=meta.get('market_cap');qtype=str(meta.get('quote_type','')).lower();reasons=[]
      if cap is None:reasons.append('missing_market_cap')
      elif cap<e['market_cap_min_usd']:reasons.append('market_cap_below_minimum')
      elif cap>e['market_cap_max_usd']:reasons.append('market_cap_above_maximum')
      if latest is None:reasons.append('missing_price')
      elif latest<e['minimum_price_usd']:reasons.append('price_below_minimum')
      if adv is None or adv<e['minimum_average_dollar_volume_usd']:reasons.append('insufficient_liquidity')
      if any(x in qtype for x in ['etf','fund','warrant','preferred']):reasons.append('excluded_security_type')
      rows.append({**row,**meta,'latest_price':latest,'average_dollar_volume_63d':adv,'discovery_eligible':not reasons,'eligibility_reasons':'|'.join(reasons)})
    return pd.DataFrame(rows)
