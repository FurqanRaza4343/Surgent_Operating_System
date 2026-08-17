from pydantic import BaseModel


class DashboardMetrics(BaseModel):
    total_calls: int
    new_consults: int
    attributed_revenue: float
    show_up_rate: float
