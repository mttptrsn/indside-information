"""Descriptive drawdown state."""
def drawdown_label(drawdown,prior_21=None):
    if drawdown is None:return 'unknown'
    if drawdown>-0.1:return 'near_highs'
    if drawdown>-0.25:return 'moderate_pullback'
    if drawdown<=-0.5 and (prior_21 or 0)>0:return 'early_recovery'
    if drawdown<=-0.5:return 'post_capitulation'
    return 'deep_drawdown'
