"use client";

import { Line, LineChart } from "recharts";

type SparklineProps = {
  data: number[];
  height?: number;
  positive: boolean;
  width?: number;
};

export function SparklineChart({ data, positive, width = 80, height = 32 }: SparklineProps) {
  const values = data.length > 0 ? data : [0, 0, 0, 0, 0, 0, 0];

  return (
    <LineChart aria-label="7 day price history" data={values.map((value) => ({ value }))} height={height} width={width}>
      <Line
        dataKey="value"
        dot={false}
        isAnimationActive={false}
        stroke={positive ? "#10B981" : "#EF4444"}
        strokeLinecap="round"
        strokeWidth={1.5}
        type="monotone"
      />
    </LineChart>
  );
}
