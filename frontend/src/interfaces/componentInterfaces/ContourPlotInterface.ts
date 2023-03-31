import { IComponent } from "@/interfaces/TaskGraphInterface";

interface IContourPlot extends IComponent {
  dependencies: { ContourPlot: { grid: string; thresholds: string } };
}

export { IContourPlot };
