import { ITelemetryReporter } from "vscode-azureextensionui";
import { ITelemetryPublisher } from "./TelemetryPublisher";

export default class TelemetryReporterProxy implements ITelemetryReporter {
    public constructor(
        private readonly publisher: ITelemetryPublisher,
        private readonly wrappedReporter: ITelemetryReporter) {
    }

    public sendTelemetryEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }): void {
        this.wrappedReporter.sendTelemetryEvent(eventName, properties, measurements);

        this.publisher.publishEvent({
            eventName,
            properties
        });
    }
}
