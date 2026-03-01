"""
GRU momentum model on login time-series.

Trains a tiny GRU on daily login counts and extracts:
  - 7-day and 14-day engagement trend slopes
  - Predicted next login gap
  - Momentum score from hidden state
"""

from __future__ import annotations

import numpy as np
import torch
import torch.nn as nn

from .schemas import MomentumSnapshot


class _LoginGRU(nn.Module):
    def __init__(self, input_size: int = 1, hidden_size: int = 8):
        super().__init__()
        self.gru = nn.GRU(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor):
        out, h_n = self.gru(x)
        pred = self.fc(out[:, -1, :])
        return pred, h_n.squeeze(0)


def _prepare_sequences(series: np.ndarray, window: int = 14):
    X, y = [], []
    for i in range(len(series) - window):
        X.append(series[i:i + window])
        y.append(series[i + window])
    return (
        np.array(X, dtype=np.float32)[..., np.newaxis],
        np.array(y, dtype=np.float32)[..., np.newaxis],
    )


def _slope(arr: np.ndarray) -> float:
    if len(arr) < 2:
        return 0.0
    x = np.arange(len(arr), dtype=float)
    x -= x.mean()
    return float(np.dot(x, arr - arr.mean()) / (np.dot(x, x) + 1e-9))


def compute_momentum(login_series: np.ndarray) -> MomentumSnapshot:
    mu = login_series.mean() + 1e-6
    sigma = login_series.std() + 1e-6
    normed = (login_series - mu) / sigma

    window = 14
    X, y = _prepare_sequences(normed, window=window)
    X_t, y_t = torch.from_numpy(X), torch.from_numpy(y)

    model = _LoginGRU()
    opt = torch.optim.Adam(model.parameters(), lr=3e-3)
    loss_fn = nn.MSELoss()

    model.train()
    for _ in range(30):
        pred, _ = model(X_t)
        loss = loss_fn(pred, y_t)
        opt.zero_grad()
        loss.backward()
        opt.step()

    model.eval()
    with torch.no_grad():
        last = torch.from_numpy(normed[-window:].reshape(1, window, 1).astype(np.float32))
        next_pred, hidden = model(last)

    predicted_next = float(next_pred.item() * sigma + mu)
    gap_h = max(1.0, 24.0 / max(predicted_next, 0.1))
    h_norm = float(torch.norm(hidden).item())
    momentum = float(1.0 / (1.0 + np.exp(-0.5 * (h_norm - 2.0))))

    return MomentumSnapshot(
        trend_7d=round(_slope(login_series[-7:]), 4),
        trend_14d=round(_slope(login_series[-14:]), 4),
        predicted_next_login_gap_h=round(gap_h, 2),
        momentum_score=round(momentum, 4),
    )
