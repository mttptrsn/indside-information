"""Price history validation."""
from __future__ import annotations
from datetime import date
import numpy as np,pandas as pd
from pipeline.contracts.validation import project_root
from pipeline.utils.atomic import atomic_write_csv_gz,atomic_write_json
from pipeline.utils.time import utc_now_iso

def validate_price_frame(frame:pd.DataFrame,ticker:str)->dict:
    errors=[];warnings=[]
    if frame.empty:errors.append('empty_history')
    else:
      dates=pd.to_datetime(frame['date'],errors='coerce')
      if dates.isna().any():errors.append('invalid_dates')
      if dates.duplicated().any():errors.append('duplicate_dates')
      if not dates.is_monotonic_increasing:warnings.append('unsorted_dates')
      for c in ['open','high','low','close','adj_close']:
        vals=pd.to_numeric(frame[c],errors='coerce')
        if (~np.isfinite(vals)).any():errors.append(f'nonfinite_{c}')
      if (pd.to_numeric(frame['volume'],errors='coerce')<0).any():errors.append('negative_volume')
      if ((frame['high']<frame[['open','close','low']].max(axis=1))|(frame['low']>frame[['open','close','high']].min(axis=1))).any():errors.append('ohlc_inconsistent')
      splits=pd.to_numeric(frame['stock_splits'],errors='coerce').fillna(0)
      if (splits<0).any():errors.append('invalid_split')
      if frame['ticker'].astype(str).nunique()!=1 or str(frame['ticker'].iloc[0])!=ticker:warnings.append('ticker_inconsistent')
      if (date.today()-dates.max().date()).days>10:warnings.append('stale')
      if len(frame)<252:warnings.append('limited_history')
    return {'ticker':ticker,'quality':'unusable' if errors else ('limited' if warnings else 'high'),'rows':len(frame),'warnings':'|'.join(warnings),'errors':'|'.join(errors)}

def validate_all_prices()->dict:
    root=project_root();rows=[]
    for p in sorted((root/'data/raw/prices').glob('*.csv.gz')):
      frame=pd.read_csv(p,compression='gzip');rows.append(validate_price_frame(frame,p.name.removesuffix('.csv.gz')))
    out=pd.DataFrame(rows);atomic_write_csv_gz(root/'data/quality/prices.csv.gz',out)
    summary={'schema_version':'v1','generated_at_utc':utc_now_iso(),'tickers':len(out),'unusable':int((out['quality']=='unusable').sum()) if not out.empty else 0}
    atomic_write_json(root/'data/quality/price_summary.json',summary);return summary
