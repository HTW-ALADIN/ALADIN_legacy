import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IBackgroundGraph extends IComponent {
  dependencies: { ContourPlot: { grid: string; thresholds: string }; DOTGraph: { dotDescription: string } };
}

export { IBackgroundGraph };
