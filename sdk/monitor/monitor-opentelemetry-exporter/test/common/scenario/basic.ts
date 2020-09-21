// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as opentelemetry from "@opentelemetry/api";
import { BasicTracerProvider } from "@opentelemetry/tracing";
import { AzureMonitorTraceExporter } from "../../../src";
import { Expectation, Scenario } from "./types";
import { msToTimeSpan } from "../../../src/utils/breezeUtils";
import { CanonicalCode } from "@opentelemetry/api";
import { FlushSpanProcessor } from "../flushSpanProcessor";
import { delay } from "@azure/core-http";
import {
  TelemetryItem as Envelope,
  RemoteDependencyData,
  RequestData
} from "../../../src/generated";

const COMMON_ENVELOPE_PARAMS: Partial<Envelope> = {
  instrumentationKey: process.env.APPINSIGHTS_INSTRUMENTATIONKEY || "ikey",
  sampleRate: 100
};

const exporter = new AzureMonitorTraceExporter({
  instrumentationKey: COMMON_ENVELOPE_PARAMS.instrumentationKey
});
const processor = new FlushSpanProcessor(exporter);

export class BasicScenario implements Scenario {
  prepare(): void {
    const provider = new BasicTracerProvider();
    provider.addSpanProcessor(processor);
    opentelemetry.trace.setGlobalTracerProvider(provider);
  }

  async run(): Promise<void> {
    const tracer = opentelemetry.trace.getTracer("basic");
    const root = tracer.startSpan(`${this.constructor.name}.Root`, {
      startTime: 0,
      kind: opentelemetry.SpanKind.SERVER,
      attributes: {
        foo: "bar"
      }
    });
    await tracer.withSpan(root, async () => {
      const child1 = tracer.startSpan(`${this.constructor.name}.Child.1`, {
        startTime: 0,
        parent: root,
        kind: opentelemetry.SpanKind.CLIENT,
        attributes: {
          numbers: 123
        }
      });

      const child2 = tracer.startSpan(`${this.constructor.name}.Child.2`, {
        startTime: 0,
        parent: root,
        kind: opentelemetry.SpanKind.CLIENT,
        attributes: {
          numbers: 1234
        }
      });

      tracer.withSpan(child1, () => {
        child1.setStatus({ code: CanonicalCode.OK });
        child1.end(100);
      });

      await delay(0);
      child2.setStatus({ code: CanonicalCode.OK });
      child2.end(100);

      root.setStatus({ code: CanonicalCode.OK });
      root.end(600);
    });
  }

  cleanup(): void {
    opentelemetry.trace.disable();
  }

  flush(callback: () => void): void {
    processor.forceFlush(callback);
  }

  expectation: Expectation[] = [
    {
      ...COMMON_ENVELOPE_PARAMS,
      data: {
        baseType: "RequestData",
        baseData: {
          version: 1,
          name: "BasicScenario.Root",
          duration: msToTimeSpan(600),
          responseCode: "0",
          success: true,
          properties: {
            foo: "bar"
          }
        } as Omit<RequestData, "id">
      },
      children: [
        {
          ...COMMON_ENVELOPE_PARAMS,
          data: {
            baseType: "RemoteDependencyData",
            baseData: {
              version: 1,
              name: "BasicScenario.Child.1",
              duration: msToTimeSpan(100),
              success: true,
              resultCode: "0",
              properties: {
                numbers: 123 as any
              }
            } as Omit<RemoteDependencyData, "id">
          },
          children: []
        },
        {
          ...COMMON_ENVELOPE_PARAMS,
          data: {
            baseType: "RemoteDependencyData",
            baseData: {
              version: 1,
              name: "BasicScenario.Child.2",
              duration: msToTimeSpan(100),
              success: true,
              resultCode: "0",
              properties: {
                numbers: 1234 as any
              }
            } as Omit<RemoteDependencyData, "id">
          },
          children: []
        }
      ]
    }
  ];
}
