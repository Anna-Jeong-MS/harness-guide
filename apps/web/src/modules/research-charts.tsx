import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import React from "react";
import type { ReactElement } from "react";
import type { ChartPanel, ResearchChartSuite } from "./research-chart-models";

export function renderResearchCharts(suite: ResearchChartSuite): ReactElement {
  return (
    <section aria-label="Research visualizations">
      <ChartSection title="Price and Volume" panel={suite.priceVolume}>
        {(data) => (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.points}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="close" stroke="#2563eb" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartSection>
      <ChartSection title="Technical Indicators" panel={suite.indicators}>
        {(data) => (
          <BarChart width={480} height={220} data={[data]}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rsi" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="rsi" fill="#0f766e" />
            <Bar dataKey="volumeSurge" fill="#7c3aed" />
          </BarChart>
        )}
      </ChartSection>
      <ChartSection title="Signal Contribution" panel={suite.contribution}>
        {(data) => (
          <BarChart width={520} height={220} data={data.segments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#1d4ed8" />
          </BarChart>
        )}
      </ChartSection>
      <ChartSection title="Risk Profile" panel={suite.risk}>
        {(data) => (
          <RadarChart width={420} height={280} data={data.metrics}>
            <PolarGrid />
            <PolarAngleAxis dataKey="label" />
            <PolarRadiusAxis />
            <Radar dataKey="value" fill="#dc2626" fillOpacity={0.4} stroke="#dc2626" />
          </RadarChart>
        )}
      </ChartSection>
      <ChartSection title="Strategy Backtest" panel={suite.backtest}>
        {(data) => (
          <LineChart width={520} height={220} data={data.equityCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#16a34a" />
          </LineChart>
        )}
      </ChartSection>
      <ChartSection title="Portfolio Exposure" panel={suite.portfolioExposure}>
        {(data) => (
          <BarChart width={420} height={220} data={data.weights}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#f59e0b" />
          </BarChart>
        )}
      </ChartSection>
    </section>
  );
}

function ChartSection<T>({
  title,
  panel,
  children,
}: {
  title: string;
  panel: ChartPanel<T>;
  children: (data: T) => ReactElement;
}): ReactElement {
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      {panel.state === "available" ? children(panel.data) : <p>{panel.reason}</p>}
    </section>
  );
}
