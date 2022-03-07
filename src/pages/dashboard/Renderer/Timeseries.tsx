import React, { useRef, useEffect } from 'react';
import _ from 'lodash';
import TsGraph from '@fc-plot/ts-graph';
import '@fc-plot/ts-graph/dist/index.css';
import { Range } from '@/components/DateRangePicker';
import usePrometheus from './datasource/usePrometheus';
import { IPanel } from '../types';
import * as byteConverter from './utils/byteConverter';

interface IProps {
  time: Range;
  step: number | null;
  values: IPanel;
}

export const hexPalette = [
  '#3399CC',
  '#CC9933',
  '#9966CC',
  '#66CC66',
  '#CC3333',
  '#99CCCC',
  '#CCCC66',
  '#CC99CC',
  '#99CC99',
  '#CC6666',
  '#336699',
  '#996633',
  '#993399',
  '#339966',
  '#993333',
];

const utilValMap = {
  bitsSI: {
    type: 'si',
    base: 'bits',
  },
  bytesSI: {
    type: 'si',
    base: 'bytes',
  },
  bitsIEC: {
    type: 'iec',
    base: 'bits',
  },
  bytesIEC: {
    type: 'iec',
    base: 'bytes',
  },
};
const valueFormatter = (options, val) => {
  const utilVal = options.standardOptions?.util;
  const decimals = options.standardOptions?.decimals || 3;
  if (utilVal) {
    const utilValObj = utilValMap[utilVal];
    if (utilValObj) {
      const { type, base } = utilValObj;
      return byteConverter.format(val, {
        type,
        base,
        decimals,
      });
    }
    if (utilVal === 'percent') {
      return _.round(val, decimals) + '%';
    }
    if (utilVal === 'percentUnit') {
      return _.round(val * 100, decimals) + '%';
    }
    return val;
  }
  return val;
};

export default function index(props: IProps) {
  const { values, time, step } = props;
  const { targets, custom, options } = values;
  const chartEleRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<TsGraph>(null);
  const { series } = usePrometheus({
    time,
    step,
    targets,
  });

  useEffect(() => {
    if (chartEleRef.current) {
      if (!chartRef.current) {
        chartRef.current = new TsGraph({
          colors: hexPalette,
          timestamp: 'X',
          xkey: 0,
          ykey: 1,
          ykeyFormatter: (value) => Number(value),
          chart: {
            renderTo: chartEleRef.current,
            height: 200,
          },
          series: [],
          line: {
            width: 1,
          },
        });
      }
    }
    return () => {
      if (chartRef.current && typeof chartRef.current.destroy === 'function') {
        chartRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update({
        series,
        area: {
          opacity: custom.fillOpacity,
        },
        stack: {
          enabled: custom.stack === 'noraml',
        },
        curve: {
          enabled: true,
          mode: custom.lineInterpolation,
        },
        tooltip: {
          ...chartRef.current.options.tooltip,
          shared: options.tooltip?.mode === 'all',
          sharedSortDirection: options.tooltip?.sort !== 'none' ? options.tooltip?.sort : undefined,
          pointValueformatter: (val) => {
            return valueFormatter(options, val);
          },
        },
        yAxis: {
          ...chartRef.current.options.yAxis,
          min: options.standardOptions?.min,
          max: options.standardOptions?.max,
          plotLines: options.thresholds?.steps,
          tickValueFormatter: (val) => {
            return valueFormatter(options, val);
          },
        },
      });
    }
  }, [JSON.stringify(series), JSON.stringify(custom), JSON.stringify(options)]);

  return (
    <div style={{ border: '1px solid #d9d9d9', height: 200 }}>
      <div ref={chartEleRef} />
    </div>
  );
}
