import { useEffect, useMemo, useState } from "react";
import { getDashboardData } from "../api/dashboard";
import { AppShell } from "../components/layout/AppShell";
import { MetricTile } from "../components/ui/MetricTile";
import { SensorTable } from "../components/ui/SensorTable";
import { StateBlock } from "../components/ui/StateBlock";
import { TaskList } from "../components/ui/TaskList";
import { TrendPanel } from "../components/ui/TrendPanel";
import type { DashboardData, SensorPoint } from "../types/dashboard";

const metricOptions: Array<SensorPoint["metric"] | "全部"> = ["全部", "温度", "湿度", "光照", "CO2", "土壤水分"];

export function DataDisplayPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<SensorPoint["metric"] | "全部">("全部");

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getDashboardData()
      .then((result) => {
        if (isMounted) {
          setData(result);
          setError("");
        }
      })
      .catch((requestError: Error) => {
        if (isMounted) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredSensors = useMemo(() => {
    if (!data) {
      return [];
    }

    if (activeMetric === "全部") {
      return data.sensors;
    }

    return data.sensors.filter((sensor) => sensor.metric === activeMetric);
  }, [activeMetric, data]);

  return (
    <AppShell>
      {isLoading ? <DashboardSkeleton /> : null}

      {!isLoading && error ? (
        <StateBlock title="数据加载失败" description={error} action="重新加载" onAction={() => window.location.reload()} />
      ) : null}

      {!isLoading && !error && data ? (
        <div className="dashboard-grid">
          <section className="metric-grid" aria-label="关键指标">
            {data.metrics.map((metric) => (
              <MetricTile metric={metric} key={metric.id} />
            ))}
          </section>

          <section className="filter-strip" aria-label="指标筛选">
            {metricOptions.map((metric) => (
              <button
                className={activeMetric === metric ? "filter-chip filter-chip-active" : "filter-chip"}
                key={metric}
                onClick={() => setActiveMetric(metric)}
              >
                {metric}
              </button>
            ))}
          </section>

          {filteredSensors.length === 0 ? (
            <StateBlock title="暂无匹配数据" description="调整筛选条件后，传感器读数会在这里展示。" />
          ) : (
            <SensorTable sensors={filteredSensors} />
          )}

          <div className="side-grid">
            <TrendPanel trends={data.trends} />
            <TaskList tasks={data.tasks} />
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-grid" aria-label="加载中">
      <section className="metric-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton metric-skeleton" key={index} />
        ))}
      </section>
      <div className="skeleton table-skeleton" />
      <div className="side-grid">
        <div className="skeleton panel-skeleton" />
        <div className="skeleton panel-skeleton" />
      </div>
    </div>
  );
}
